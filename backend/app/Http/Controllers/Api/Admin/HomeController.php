<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\HomeOrder;
use App\Models\HomeProvider;
use App\Models\User;
use App\Models\Wallet;
use App\Services\AuditLogService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class HomeController extends Controller
{
    public function __construct(private AuditLogService $auditLogService) {}

    public function indexProviders(Request $request): JsonResponse
    {
        $providers = HomeProvider::with('user:id,name,email,phone,status')
            ->when($request->status,   fn($q) => $q->where('status', $request->status))
            ->when($request->category, fn($q) => $q->where('category', $request->category))
            ->when($request->search,   fn($q) => $q->where(fn($q2) =>
                $q2->where('name', 'like', "%{$request->search}%")
                   ->orWhere('address', 'like', "%{$request->search}%")))
            ->withCount('orders')
            ->latest()
            ->paginate(20);

        return response()->json([
            'data' => $providers->items(),
            'meta' => [
                'current_page' => $providers->currentPage(),
                'last_page'    => $providers->lastPage(),
                'total'        => $providers->total(),
                'per_page'     => $providers->perPage(),
            ],
        ]);
    }

    public function showProvider(int $id): JsonResponse
    {
        $provider = HomeProvider::with(['user:id,name,email,phone,status', 'allServices'])
            ->withCount('orders')
            ->findOrFail($id);

        $statsRaw = $provider->orders()
            ->selectRaw("
                COUNT(*) as total_orders,
                SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed_orders,
                SUM(CASE WHEN status = 'completed' THEN total_price ELSE 0 END) as total_revenue,
                SUM(CASE WHEN status = 'pending'   THEN 1 ELSE 0 END) as pending_orders
            ")
            ->first();

        return response()->json([
            'data'  => $provider,
            'stats' => [
                'total_orders'     => (int)   ($statsRaw->total_orders     ?? 0),
                'completed_orders' => (int)   ($statsRaw->completed_orders ?? 0),
                'total_revenue'    => (float) ($statsRaw->total_revenue    ?? 0),
                'pending_orders'   => (int)   ($statsRaw->pending_orders   ?? 0),
            ],
        ]);
    }

    public function approveProvider(Request $request, int $id): JsonResponse
    {
        $provider = HomeProvider::findOrFail($id);

        if ($provider->status === 'active') {
            return response()->json(['message' => 'Provider sudah aktif.'], 422);
        }

        $old = $provider->status;
        $provider->update(['status' => 'active']);

        $this->auditLogService->log($request->user(), 'approve_home_provider', $provider,
            ['status' => $old], ['status' => 'active']);

        return response()->json(['message' => "Provider {$provider->name} disetujui."]);
    }

    public function suspendProvider(Request $request, int $id): JsonResponse
    {
        $data     = $request->validate(['reason' => ['nullable', 'string', 'max:255']]);
        $provider = HomeProvider::findOrFail($id);

        $old = $provider->status;
        $provider->update(['status' => 'suspended', 'is_open' => false]);

        $this->auditLogService->log($request->user(), 'suspend_home_provider', $provider,
            ['status' => $old], ['status' => 'suspended', 'reason' => $data['reason'] ?? null]);

        return response()->json(['message' => "Provider {$provider->name} disuspend."]);
    }

    public function createProvider(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name'          => ['required', 'string', 'max:100'],
            'category'      => ['required', 'in:laundry,pijat,cleaning,tukang,lainnya'],
            'address'       => ['required', 'string', 'max:255'],
            'phone'         => ['nullable', 'string', 'max:20'],
            'open_time'     => ['nullable', 'date_format:H:i'],
            'close_time'    => ['nullable', 'date_format:H:i'],
            'owner_name'    => ['required', 'string', 'max:100'],
            'owner_email'   => ['required', 'email', 'unique:users,email'],
            'owner_password'=> ['required', 'string', 'min:8'],
            'owner_phone'   => ['nullable', 'string', 'max:20'],
        ]);

        $provider = DB::transaction(function () use ($data, $request) {
            $user = User::create([
                'name'     => $data['owner_name'],
                'email'    => $data['owner_email'],
                'password' => Hash::make($data['owner_password']),
                'phone'    => $data['owner_phone'] ?? null,
                'role'     => 'home_provider',
                'status'   => 'active',
            ]);

            Wallet::create(['user_id' => $user->id, 'balance' => 0]);

            $name     = $data['name'];
            $provider = HomeProvider::create([
                'user_id'    => $user->id,
                'name'       => $name,
                'slug'       => Str::slug($name) . '-' . Str::random(6),
                'category'   => $data['category'],
                'address'    => $data['address'],
                'phone'      => $data['phone'] ?? null,
                'open_time'  => $data['open_time'] ?? null,
                'close_time' => $data['close_time'] ?? null,
                'status'     => 'active',
            ]);

            $this->auditLogService->log($request->user(), 'create_home_provider', $provider,
                [], ['name' => $provider->name, 'email' => $user->email]);

            return $provider;
        });

        return response()->json([
            'message' => "Provider {$provider->name} berhasil dibuat.",
            'data'    => $provider->load('user:id,name,email,phone,status'),
        ], 201);
    }

    public function indexOrders(Request $request): JsonResponse
    {
        $orders = HomeOrder::with(['provider:id,name', 'customer:id,name', 'items'])
            ->when($request->status, fn($q) => $q->where('status', $request->status))
            ->when($request->provider_id, fn($q) => $q->where('provider_id', $request->provider_id))
            ->when($request->search, fn($q) => $q->where(fn($q2) =>
                $q2->where('order_number', 'like', "%{$request->search}%")
                   ->orWhereHas('customer', fn($c) => $c->where('name', 'like', "%{$request->search}%"))
                   ->orWhereHas('provider', fn($p) => $p->where('name', 'like', "%{$request->search}%"))
            ))
            ->latest()
            ->paginate(25);

        return response()->json([
            'data' => $orders->items(),
            'meta' => [
                'current_page' => $orders->currentPage(),
                'last_page'    => $orders->lastPage(),
                'total'        => $orders->total(),
                'per_page'     => $orders->perPage(),
            ],
        ]);
    }

    public function forceCancelOrder(Request $request, int $id): JsonResponse
    {
        $data  = $request->validate(['reason' => ['required', 'string', 'max:255']]);
        $order = HomeOrder::findOrFail($id);

        if (in_array($order->status, ['completed', 'cancelled'])) {
            return response()->json(['message' => 'Order sudah dalam status final.'], 422);
        }

        $old = $order->status;
        $order->update(['status' => 'cancelled', 'cancel_reason' => $data['reason']]);

        $this->auditLogService->log($request->user(), 'force_cancel_home_order', $order,
            ['status' => $old], ['status' => 'cancelled', 'reason' => $data['reason']]);

        return response()->json(['message' => "Order #{$order->order_number} berhasil dibatalkan."]);
    }
}
