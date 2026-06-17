<?php

namespace App\Http\Controllers\Api\Mart;

use App\Events\MartOrderCreatedForSeller;
use App\Http\Controllers\Controller;
use App\Models\AdminSetting;
use App\Models\MartCart;
use App\Models\MartCategory;
use App\Models\MartOrder;
use App\Models\MartOrderItem;
use App\Models\MartProduct;
use App\Models\MartReview;
use App\Models\MartSeller;
use App\Models\Wallet;
use App\Services\NotificationService;
use App\Services\PromoService;
use App\Services\WalletService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class CustomerController extends Controller
{
    // ── Browse ────────────────────────────────────────────────────────────────

    public function categories(): JsonResponse
    {
        return response()->json(
            MartCategory::where('is_active', true)->orderBy('sort_order')->get()
        );
    }

    public function products(Request $request): JsonResponse
    {
        $products = MartProduct::with(['seller:id,name,slug,logo_path,average_rating', 'category:id,name,icon'])
            ->where('is_active', true)
            ->whereHas('seller', fn($q) => $q->where('status', 'active'))
            ->when($request->category, fn($q) => $q->whereHas('category', fn($q2) => $q2->where('slug', $request->category)))
            ->when($request->seller_id, fn($q) => $q->where('seller_id', $request->seller_id))
            ->when($request->search, fn($q) => $q->where('name', 'like', "%{$request->search}%"))
            ->when($request->sort === 'price_asc',  fn($q) => $q->orderBy('price'))
            ->when($request->sort === 'price_desc', fn($q) => $q->orderByDesc('price'))
            ->when($request->sort === 'rating',     fn($q) => $q->orderByDesc('average_rating'))
            ->when(!$request->sort,                 fn($q) => $q->orderByDesc('total_sold'))
            ->paginate(20);

        return response()->json($products);
    }

    public function sellers(Request $request): JsonResponse
    {
        $sellers = MartSeller::where('status', 'active')
            ->withCount('products')
            ->when($request->search, fn($q) => $q->where('name', 'like', "%{$request->search}%"))
            ->latest()
            ->paginate(20);

        return response()->json($sellers);
    }

    public function seller(MartSeller $seller): JsonResponse
    {
        abort_if($seller->status !== 'active', 404);
        $seller->load(['products.category']);
        return response()->json($seller);
    }

    public function product(MartProduct $product): JsonResponse
    {
        abort_if(!$product->is_active || $product->seller->status !== 'active', 404);
        $product->load(['seller:id,name,slug,logo_path,address,average_rating,total_ratings,is_open', 'category:id,name,icon']);
        $reviews = MartReview::with('customer:id,name')
            ->where('product_id', $product->id)
            ->latest()->limit(10)->get();
        return response()->json(array_merge($product->toArray(), ['reviews' => $reviews]));
    }

    // ── Cart ──────────────────────────────────────────────────────────────────

    public function cart(Request $request): JsonResponse
    {
        $items = MartCart::with(['product:id,name,price,images,stock,is_active,seller_id', 'seller:id,name,logo_path,lat,lng'])
            ->where('user_id', $request->user()->id)
            ->get();

        return response()->json($items);
    }

    public function addToCart(Request $request): JsonResponse
    {
        $data = $request->validate([
            'product_id' => ['required', 'exists:mart_products,id'],
            'quantity'   => ['required', 'integer', 'min:1', 'max:100'],
            'notes'      => ['nullable', 'string', 'max:255'],
        ]);

        $product = MartProduct::findOrFail($data['product_id']);
        abort_if(!$product->is_active, 422, 'Produk tidak tersedia.');
        abort_if($product->stock < $data['quantity'], 422, 'Stok tidak cukup.');

        $item = MartCart::updateOrCreate(
            ['user_id' => $request->user()->id, 'product_id' => $product->id],
            ['seller_id' => $product->seller_id, 'quantity' => $data['quantity'], 'notes' => $data['notes'] ?? null]
        );

        return response()->json($item->load('product:id,name,price,images'), 201);
    }

    public function removeFromCart(Request $request, int $id): JsonResponse
    {
        MartCart::where('user_id', $request->user()->id)->where('id', $id)->delete();
        return response()->json(['message' => 'Item dihapus dari keranjang.']);
    }

    public function clearCart(Request $request): JsonResponse
    {
        MartCart::where('user_id', $request->user()->id)->delete();
        return response()->json(['message' => 'Keranjang dikosongkan.']);
    }

    // ── Checkout ──────────────────────────────────────────────────────────────

    public function checkout(Request $request): JsonResponse
    {
        $data = $request->validate([
            'seller_id'        => ['required', 'exists:mart_sellers,id'],
            'delivery_address' => ['required', 'string', 'max:500'],
            'delivery_lat'     => ['nullable', 'numeric'],
            'delivery_lng'     => ['nullable', 'numeric'],
            'delivery_phone'   => ['nullable', 'string', 'max:20'],
            'notes'            => ['nullable', 'string', 'max:500'],
            'shipping_fee'     => ['required', 'integer', 'min:0'],
            'payment_method'   => ['nullable', 'in:wallet,cod'],
            'promo_code'       => ['nullable', 'string', 'max:50'],
            'cart_item_ids'    => ['nullable', 'array'],
            'cart_item_ids.*'  => ['integer'],
        ]);

        $paymentMethod = $data['payment_method'] ?? 'wallet';

        if ($paymentMethod === 'wallet' && !AdminSetting::walletEnabled()) {
            return response()->json(['message' => 'Pembayaran via wallet sementara tidak tersedia.'], 422);
        }

        $user   = $request->user();
        $seller = MartSeller::findOrFail($data['seller_id']);
        abort_if(!$seller->isActive(), 422, 'Toko tidak aktif.');
        abort_if(empty($seller->lat) || empty($seller->lng), 422, 'Toko belum mengatur lokasi. Hubungi penjual untuk melengkapi koordinat toko.');

        $cartQuery = MartCart::with('product')
            ->where('user_id', $user->id)
            ->where('seller_id', $seller->id);

        if (!empty($data['cart_item_ids'])) {
            $cartQuery->whereIn('id', $data['cart_item_ids']);
        }

        $cartItems = $cartQuery->get();

        abort_if($cartItems->isEmpty(), 422, 'Keranjang kosong untuk toko ini.');

        foreach ($cartItems as $item) {
            abort_if(!$item->product->is_active, 422, "Produk '{$item->product->name}' tidak tersedia.");
            abort_if($item->product->stock < $item->quantity, 422, "Stok '{$item->product->name}' tidak cukup.");
        }

        // Validasi promo sebelum transaksi
        $promoDiscount  = 0;
        $validatedPromo = null;
        if (!empty($data['promo_code'])) {
            $subtotalEst = $cartItems->sum(fn($i) => $i->product->price * $i->quantity) + $data['shipping_fee'];
            ['promo' => $validatedPromo, 'discount' => $promoDiscount] =
                app(PromoService::class)->validate($data['promo_code'], 'zasamart', (int) $subtotalEst);
        }

        $order = DB::transaction(function () use ($user, $seller, $data, $cartItems, $paymentMethod, $promoDiscount, $validatedPromo) {
            $subtotal    = $cartItems->sum(fn($i) => $i->product->price * $i->quantity);
            $total       = max(0, $subtotal + $data['shipping_fee'] - $promoDiscount);
            $commRate    = (float) AdminSetting::valueOf('mart_commission_percent', 5);
            $commission  = (int) round($total * $commRate / 100);
            $sellerIncome= $total - $commission;

            // Cek saldo di dalam transaksi tanpa lock manual — WalletService::debit() akan
            // melakukan lockForUpdate sendiri saat debit, sehingga tidak terjadi nested lock
            // yang berpotensi deadlock. Pengecekan ini hanya untuk early-abort yang cepat.
            if ($paymentMethod === 'wallet') {
                $userWallet = Wallet::where('user_id', $user->id)->first();
                abort_if(!$userWallet || $userWallet->availableBalance() < $total, 422,
                    'Saldo tidak cukup. Silakan top up atau pilih Bayar di Tempat.');
            }

            $order = MartOrder::create([
                'order_number'           => MartOrder::generateNumber(),
                'customer_id'            => $user->id,
                'seller_id'              => $seller->id,
                'status'                 => 'pending',
                'payment_method'         => $paymentMethod,
                'paid_at'                => $paymentMethod === 'wallet' ? now() : null,
                'seller_name_snapshot'   => $seller->name,
                'seller_address_snapshot'=> $seller->address,
                'seller_lat'             => $seller->lat,
                'seller_lng'             => $seller->lng,
                'delivery_name'          => $user->name,
                'delivery_address'       => $data['delivery_address'],
                'delivery_lat'           => $data['delivery_lat'] ?? null,
                'delivery_lng'           => $data['delivery_lng'] ?? null,
                'delivery_phone'         => $data['delivery_phone'] ?? $user->phone,
                'notes'                  => $data['notes'] ?? null,
                'subtotal'               => $subtotal,
                'shipping_fee'           => $data['shipping_fee'],
                'total'                  => $total,
                'promo_code'             => $data['promo_code'] ?? null,
                'discount_amount'        => $promoDiscount,
                'commission_rate'        => $commRate,
                'platform_commission'    => $commission,
                'seller_income'          => $sellerIncome,
            ]);

            foreach ($cartItems as $item) {
                MartOrderItem::create([
                    'order_id'      => $order->id,
                    'product_id'    => $item->product_id,
                    'product_name'  => $item->product->name,
                    'product_image' => $item->product->images[0] ?? null,
                    'price'         => $item->product->price,
                    'quantity'      => $item->quantity,
                    'subtotal'      => $item->product->price * $item->quantity,
                    'notes'         => $item->notes,
                ]);

                $item->product->decrement('stock', $item->quantity);
                $item->product->increment('total_sold', $item->quantity);
            }

            MartCart::where('user_id', $user->id)
                ->where('seller_id', $seller->id)
                ->whereIn('id', $cartItems->pluck('id'))
                ->delete();

            // Debit wallet hanya jika metode pembayaran wallet
            if ($paymentMethod === 'wallet') {
                app(WalletService::class)->debit(
                    $user,
                    $total,
                    'mart_payment',
                    "Pembayaran ZasaMart #{$order->order_number}",
                    $order,
                    'zasamart'
                );
            }

            return $order;
        });

        if ($validatedPromo) {
            app(PromoService::class)->use($validatedPromo);
        }

        $order->loadMissing(['seller.user', 'items']);

        // Notifikasi ke penjual (in-app + push FCM, agar muncul walau aplikasi di background)
        if ($order->seller?->user) {
            app(NotificationService::class)->send(
                $order->seller->user,
                'mart_new_order',
                'Pesanan Baru Masuk!',
                "Ada pesanan baru #{$order->order_number} dari {$order->delivery_name}.",
                ['mart_order_id' => $order->id, 'order_number' => $order->order_number]
            );
        }

        // Broadcast real-time ke penjual (WebSocket) — untuk chime saat aplikasi terbuka
        broadcast(new MartOrderCreatedForSeller($order))->toOthers();

        return response()->json($order->load('items'), 201);
    }

    // ── Orders ────────────────────────────────────────────────────────────────

    public function myOrders(Request $request): JsonResponse
    {
        $orders = MartOrder::with(['seller:id,name,logo_path', 'items'])
            ->where('customer_id', $request->user()->id)
            ->when($request->status, fn($q) => $q->where('status', $request->status))
            ->latest()
            ->paginate(15);

        return response()->json($orders);
    }

    public function orderDetail(Request $request, int $id): JsonResponse
    {
        $order = MartOrder::with(['seller:id,name,logo_path,phone', 'items', 'mitra:id,name,phone', 'reviews'])
            ->where('customer_id', $request->user()->id)
            ->findOrFail($id);

        return response()->json($order);
    }

    public function cancelOrder(Request $request, int $id): JsonResponse
    {
        $data = $request->validate(['reason' => ['nullable', 'string', 'max:255']]);
        $user = $request->user();

        DB::transaction(function () use ($user, $id, $data) {
            // Lock order di dalam transaksi — mencegah double-cancel concurrent yang bisa double-restore stok
            $order = MartOrder::where('customer_id', $user->id)->lockForUpdate()->findOrFail($id);
            abort_if(!$order->canCancel(), 422, 'Pesanan tidak dapat dibatalkan pada status ini.');

            $order->load('items.product');
            $order->items->each(fn($item) => $item->product->increment('stock', $item->quantity));

            $order->update([
                'status'       => 'cancelled',
                'cancel_reason'=> $data['reason'] ?? 'Dibatalkan oleh pembeli',
                'cancelled_at' => now(),
            ]);

            // ── Refund ke wallet customer (hanya jika bayar via wallet, bukan COD) ──
            if ($order->total > 0 && $order->payment_method === 'wallet') {
                app(WalletService::class)->credit(
                    $user,
                    $order->total,
                    'mart_refund',
                    "Refund ZasaMart #{$order->order_number}",
                    $order,
                    'zasamart'
                );
            }
        });

        return response()->json(['message' => 'Pesanan berhasil dibatalkan.']);
    }

    public function receiveOrder(Request $request, int $id): JsonResponse
    {
        $order = MartOrder::where('customer_id', $request->user()->id)
            ->where('status', 'delivered')
            ->findOrFail($id);

        DB::transaction(function () use ($order) {
            // Lock baris order — cegah double-settle concurrent (customer confirm + auto-confirm)
            $locked = MartOrder::lockForUpdate()->findOrFail($order->id);
            if ($locked->status !== 'delivered') {
                throw new \Exception("Status pesanan sudah berubah: {$locked->status}.");
            }

            $locked->update(['status' => 'completed', 'completed_at' => now()]);
            // Catatan: total_sold sudah diincrement saat checkout — tidak diincrement lagi di sini

            $sellerUser = $locked->seller?->user;
            $mitra      = $locked->mitra_id ? $locked->mitra : null;

            if ($locked->payment_method === 'wallet') {
                // Wallet: customer sudah bayar saat checkout → credit income ke seller
                if ($sellerUser && $locked->seller_income > 0) {
                    app(WalletService::class)->credit(
                        $sellerUser,
                        $locked->seller_income,
                        'order_income',
                        "Pendapatan ZasaMart #{$locked->order_number}",
                        $locked,
                        'zasamart'
                    );
                }
            } else {
                // COD: mitra sudah terima cash dari customer, dan bayar seller saat pickup
                // Platform ambil komisi dari wallet mitra (debitForce = boleh minus/hutang)
                if ($mitra && $locked->platform_commission > 0) {
                    app(WalletService::class)->debitForce(
                        $mitra,
                        $locked->platform_commission,
                        'platform_commission',
                        "Komisi platform COD ZasaMart #{$locked->order_number}",
                        $locked,
                        'zasamart'
                    );
                }
            }
        });

        return response()->json(['message' => 'Pesanan dikonfirmasi selesai.']);
    }

    public function submitReview(Request $request): JsonResponse
    {
        $data = $request->validate([
            'order_id'      => ['required', 'exists:mart_orders,id'],
            'reviews'       => ['required', 'array', 'min:1'],
            'reviews.*.order_item_id' => ['required', 'exists:mart_order_items,id'],
            'reviews.*.rating'        => ['required', 'integer', 'min:1', 'max:5'],
            'reviews.*.comment'       => ['nullable', 'string', 'max:500'],
        ]);

        $order = MartOrder::where('customer_id', $request->user()->id)
            ->where('status', 'completed')
            ->findOrFail($data['order_id']);

        DB::transaction(function () use ($order, $data, $request) {
            // Pre-load semua order items dan reviewed item IDs sekaligus
            $reviewItemIds   = collect($data['reviews'])->pluck('order_item_id');
            $items           = MartOrderItem::where('order_id', $order->id)
                ->whereIn('id', $reviewItemIds)
                ->get()
                ->keyBy('id');

            $alreadyReviewed = MartReview::whereIn('order_item_id', $reviewItemIds)
                ->pluck('order_item_id')
                ->flip();

            $affectedProductIds = [];

            foreach ($data['reviews'] as $r) {
                $item = $items->get($r['order_item_id']);
                abort_if(!$item, 422, 'Item pesanan tidak ditemukan.');

                if ($alreadyReviewed->has($item->id)) continue;

                MartReview::create([
                    'order_id'      => $order->id,
                    'order_item_id' => $item->id,
                    'customer_id'   => $request->user()->id,
                    'seller_id'     => $order->seller_id,
                    'product_id'    => $item->product_id,
                    'rating'        => $r['rating'],
                    'comment'       => $r['comment'] ?? null,
                ]);

                $affectedProductIds[] = $item->product_id;
            }

            // Batch recalculate product ratings — 1 query per product, bukan N+1
            foreach (array_unique($affectedProductIds) as $productId) {
                $stats = MartReview::where('product_id', $productId)
                    ->selectRaw('AVG(rating) as avg_rating, COUNT(*) as total')
                    ->first();
                MartProduct::where('id', $productId)->update([
                    'average_rating' => round($stats->avg_rating, 2),
                    'total_ratings'  => $stats->total,
                ]);
            }

            // Recalculate seller rating — 1 query
            $sellerStats = MartReview::where('seller_id', $order->seller_id)
                ->selectRaw('AVG(rating) as avg_rating, COUNT(*) as total')
                ->first();
            MartSeller::where('id', $order->seller_id)->update([
                'average_rating' => round($sellerStats->avg_rating, 2),
                'total_ratings'  => $sellerStats->total,
            ]);
        });

        return response()->json(['message' => 'Ulasan berhasil dikirim.']);
    }
}
