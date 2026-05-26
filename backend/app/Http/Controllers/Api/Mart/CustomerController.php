<?php

namespace App\Http\Controllers\Api\Mart;

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
        $items = MartCart::with(['product:id,name,price,images,stock,is_active,seller_id', 'seller:id,name,logo_path'])
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
        ]);

        $user   = $request->user();
        $seller = MartSeller::findOrFail($data['seller_id']);
        abort_if(!$seller->isActive(), 422, 'Toko tidak aktif.');

        $cartItems = MartCart::with('product')
            ->where('user_id', $user->id)
            ->where('seller_id', $seller->id)
            ->get();

        abort_if($cartItems->isEmpty(), 422, 'Keranjang kosong untuk toko ini.');

        foreach ($cartItems as $item) {
            abort_if(!$item->product->is_active, 422, "Produk '{$item->product->name}' tidak tersedia.");
            abort_if($item->product->stock < $item->quantity, 422, "Stok '{$item->product->name}' tidak cukup.");
        }

        $order = DB::transaction(function () use ($user, $seller, $data, $cartItems) {
            $subtotal    = $cartItems->sum(fn($i) => $i->product->price * $i->quantity);
            $total       = $subtotal + $data['shipping_fee'];
            $commRate    = (float) AdminSetting::valueOf('mart_commission_percent', 5);
            $commission  = (int) round($total * $commRate / 100);
            $sellerIncome= $total - $commission;

            $order = MartOrder::create([
                'order_number'           => MartOrder::generateNumber(),
                'customer_id'            => $user->id,
                'seller_id'              => $seller->id,
                'status'                 => 'pending',
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
            }

            MartCart::where('user_id', $user->id)->where('seller_id', $seller->id)->delete();

            return $order;
        });

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
        $data  = $request->validate(['reason' => ['nullable', 'string', 'max:255']]);
        $order = MartOrder::where('customer_id', $request->user()->id)->findOrFail($id);
        abort_if(!$order->canCancel(), 422, 'Pesanan tidak dapat dibatalkan pada status ini.');

        $order->items->each(fn($item) => $item->product->increment('stock', $item->quantity));

        $order->update([
            'status'       => 'cancelled',
            'cancel_reason'=> $data['reason'] ?? 'Dibatalkan oleh pembeli',
            'cancelled_at' => now(),
        ]);

        return response()->json(['message' => 'Pesanan berhasil dibatalkan.']);
    }

    public function receiveOrder(Request $request, int $id): JsonResponse
    {
        $order = MartOrder::where('customer_id', $request->user()->id)
            ->where('status', 'delivered')
            ->findOrFail($id);

        $order->update(['status' => 'completed', 'completed_at' => now()]);

        $order->items->each(fn($item) => $item->product->increment('total_sold', $item->quantity));

        // Kredit income ke wallet seller
        $sellerUser = $order->seller?->user;
        if ($sellerUser && $order->seller_income > 0) {
            app(WalletService::class)->credit(
                $sellerUser,
                $order->seller_income,
                'order_income',
                "Pendapatan order ZasaMart #{$order->order_number}",
                $order
            );
        }

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
            foreach ($data['reviews'] as $r) {
                $item = MartOrderItem::where('order_id', $order->id)->findOrFail($r['order_item_id']);

                if (MartReview::where('order_item_id', $item->id)->exists()) continue;

                MartReview::create([
                    'order_id'      => $order->id,
                    'order_item_id' => $item->id,
                    'customer_id'   => $request->user()->id,
                    'seller_id'     => $order->seller_id,
                    'product_id'    => $item->product_id,
                    'rating'        => $r['rating'],
                    'comment'       => $r['comment'] ?? null,
                ]);

                // Recalculate product rating
                $product = $item->product;
                $avg = MartReview::where('product_id', $product->id)->avg('rating');
                $cnt = MartReview::where('product_id', $product->id)->count();
                $product->update(['average_rating' => round($avg, 2), 'total_ratings' => $cnt]);
            }

            // Recalculate seller rating
            $seller = $order->seller;
            $avg = MartReview::where('seller_id', $seller->id)->avg('rating');
            $cnt = MartReview::where('seller_id', $seller->id)->count();
            $seller->update(['average_rating' => round($avg, 2), 'total_ratings' => $cnt]);
        });

        return response()->json(['message' => 'Ulasan berhasil dikirim.']);
    }
}
