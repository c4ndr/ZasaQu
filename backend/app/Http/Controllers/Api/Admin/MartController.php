<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\MartOrder;
use App\Models\MartProduct;
use App\Models\MartSeller;
use App\Models\User;
use App\Models\Wallet;
use App\Services\AuditLogService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class MartController extends Controller
{
    public function __construct(private AuditLogService $auditLogService) {}

    // ── Sellers ───────────────────────────────────────────────────────────────

    public function indexSellers(Request $request): JsonResponse
    {
        $sellers = MartSeller::with('user:id,name,email,phone,status')
            ->withCount(['orders', 'allProducts'])
            ->when($request->status, fn($q) => $q->where('status', $request->status))
            ->when($request->search, fn($q) => $q->where(fn($q2) =>
                $q2->where('name', 'like', "%{$request->search}%")
                   ->orWhereHas('user', fn($q3) => $q3->where('email', 'like', "%{$request->search}%"))))
            ->latest()
            ->paginate(20);

        return response()->json($sellers);
    }

    public function showSeller(int $id): JsonResponse
    {
        $seller = MartSeller::with(['user:id,name,email,phone,status', 'allProducts.category'])
            ->withCount('orders')
            ->findOrFail($id);

        $stats = [
            'total_orders'     => MartOrder::where('seller_id', $id)->count(),
            'completed_orders' => MartOrder::where('seller_id', $id)->where('status', 'completed')->count(),
            'total_products'   => MartProduct::where('seller_id', $id)->where('is_active', true)->count(),
            'total_revenue'    => MartOrder::where('seller_id', $id)->where('status', 'completed')->sum('total'),
        ];

        return response()->json(array_merge($seller->toArray(), ['stats' => $stats]));
    }

    public function approveSeller(Request $request, int $id): JsonResponse
    {
        $seller = MartSeller::findOrFail($id);
        $seller->update(['status' => 'active']);
        $seller->user->update(['status' => 'active']);
        $this->auditLogService->log($request->user(), 'approve_mart_seller', $seller, ['status' => 'pending'], ['status' => 'active']);
        return response()->json(['message' => "Toko {$seller->name} diaktifkan."]);
    }

    public function suspendSeller(Request $request, int $id): JsonResponse
    {
        $data   = $request->validate(['reason' => ['nullable', 'string', 'max:255']]);
        $seller = MartSeller::findOrFail($id);
        $seller->update(['status' => 'suspended', 'is_open' => false]);
        $this->auditLogService->log($request->user(), 'suspend_mart_seller', $seller, [], $data);
        return response()->json(['message' => "Toko {$seller->name} disuspend."]);
    }

    public function createSeller(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name'         => ['required', 'string', 'max:100'],
            'email'        => ['required', 'email', 'unique:users,email'],
            'phone'        => ['nullable', 'string', 'max:20'],
            'password'     => ['required', 'string', 'min:8'],
            'store_name'   => ['required', 'string', 'max:100'],
            'store_address'=> ['required', 'string', 'max:500'],
            'store_phone'  => ['nullable', 'string', 'max:20'],
        ]);

        $seller = DB::transaction(function () use ($data) {
            $user = User::create([
                'name'              => $data['name'],
                'email'             => $data['email'],
                'phone'             => $data['phone'] ?? null,
                'password'          => Hash::make($data['password']),
                'role'              => 'seller',
                'status'            => 'active',
                'email_verified_at' => now(),
            ]);

            Wallet::create(['user_id' => $user->id, 'balance' => 0]);

            return MartSeller::create([
                'user_id' => $user->id,
                'name'    => $data['store_name'],
                'slug'    => Str::slug($data['store_name']) . '-' . Str::random(6),
                'address' => $data['store_address'],
                'phone'   => $data['store_phone'] ?? null,
                'status'  => 'active',
                'is_open' => true,
            ]);
        });

        return response()->json($seller->load('user:id,name,email'), 201);
    }

    // ── Products ──────────────────────────────────────────────────────────────

    public function indexProducts(Request $request): JsonResponse
    {
        $products = MartProduct::with(['seller:id,name', 'category:id,name,icon'])
            ->when($request->seller_id, fn($q) => $q->where('seller_id', $request->seller_id))
            ->when($request->search, fn($q) => $q->where('name', 'like', "%{$request->search}%"))
            ->when(isset($request->is_active), fn($q) => $q->where('is_active', $request->boolean('is_active')))
            ->latest()
            ->paginate(20);

        return response()->json($products);
    }

    public function toggleProduct(Request $request, int $id): JsonResponse
    {
        $product = MartProduct::findOrFail($id);
        $product->update(['is_active' => !$product->is_active]);
        return response()->json(['is_active' => $product->is_active]);
    }

    // ── Orders ────────────────────────────────────────────────────────────────

    public function indexOrders(Request $request): JsonResponse
    {
        $orders = MartOrder::with(['customer:id,name,phone', 'seller:id,name', 'items'])
            ->when($request->status,    fn($q) => $q->where('status', $request->status))
            ->when($request->seller_id, fn($q) => $q->where('seller_id', $request->seller_id))
            ->when($request->search,    fn($q) => $q->where(fn($q2) =>
                $q2->where('order_number', 'like', "%{$request->search}%")
                   ->orWhereHas('customer', fn($q3) => $q3->where('name', 'like', "%{$request->search}%"))))
            ->latest()
            ->paginate(20);

        return response()->json($orders);
    }

    public function forceCancelOrder(Request $request, int $id): JsonResponse
    {
        $data  = $request->validate(['reason' => ['required', 'string', 'max:255']]);
        $order = MartOrder::whereNotIn('status', ['completed', 'cancelled'])->findOrFail($id);

        $order->items->each(fn($item) => $item->product->increment('stock', $item->quantity));
        $order->update([
            'status'       => 'cancelled',
            'cancel_reason'=> '[Admin] ' . $data['reason'],
            'cancelled_at' => now(),
        ]);

        $this->auditLogService->log($request->user(), 'force_cancel_mart_order', $order, [], $data);
        return response()->json(['message' => 'Pesanan berhasil dibatalkan.']);
    }
}
