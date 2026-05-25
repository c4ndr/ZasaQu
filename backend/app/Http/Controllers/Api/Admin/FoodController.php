<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\FoodMerchant;
use App\Models\FoodOrder;
use App\Models\User;
use App\Models\Wallet;
use App\Services\AuditLogService;
use App\Services\FoodOrderService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

class FoodController extends Controller
{
    public function __construct(
        private AuditLogService  $auditLogService,
        private FoodOrderService $foodOrderService,
    ) {}

    public function createMerchant(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name'                 => ['required', 'string', 'max:100'],
            'category'             => ['required', 'in:makanan_berat,minuman,snack,lainnya'],
            'address'              => ['required', 'string', 'max:255'],
            'phone'                => ['nullable', 'string', 'max:20'],
            'open_time'            => ['nullable', 'date_format:H:i'],
            'close_time'           => ['nullable', 'date_format:H:i'],
            'avg_prep_time_minutes'=> ['nullable', 'integer', 'min:1', 'max:120'],
            'owner_name'           => ['required', 'string', 'max:100'],
            'owner_email'          => ['required', 'email', 'unique:users,email'],
            'owner_password'       => ['required', 'string', 'min:8'],
            'owner_phone'          => ['nullable', 'string', 'max:20'],
        ]);

        $merchant = DB::transaction(function () use ($data, $request) {
            $user = User::create([
                'name'     => $data['owner_name'],
                'email'    => $data['owner_email'],
                'password' => Hash::make($data['owner_password']),
                'phone'    => $data['owner_phone'] ?? null,
                'role'     => 'merchant',
                'status'   => 'active',
            ]);

            Wallet::create(['user_id' => $user->id, 'balance' => 0, 'locked_balance' => 0]);

            $merchant = FoodMerchant::create([
                'user_id'              => $user->id,
                'name'                 => $data['name'],
                'category'             => $data['category'],
                'address'              => $data['address'],
                'phone'                => $data['phone'] ?? null,
                'open_time'            => $data['open_time'] ?? null,
                'close_time'           => $data['close_time'] ?? null,
                'avg_prep_time_minutes'=> $data['avg_prep_time_minutes'] ?? 20,
                'status'               => 'active',
                'is_open'              => false,
            ]);

            $this->auditLogService->log($request->user(), 'create_merchant', $merchant,
                [], ['name' => $merchant->name, 'email' => $user->email]);

            return $merchant;
        });

        return response()->json([
            'message' => "Merchant {$merchant->name} berhasil dibuat.",
            'data'    => $merchant->load('user:id,name,email,phone,status'),
        ], 201);
    }

    public function indexMerchants(Request $request): JsonResponse
    {
        $merchants = FoodMerchant::with('user:id,name,email,phone,status')
            ->when($request->status, fn($q) => $q->where('status', $request->status))
            ->when($request->category, fn($q) => $q->where('category', $request->category))
            ->when($request->search, fn($q) => $q->where(fn($q2) =>
                $q2->where('name', 'like', "%{$request->search}%")
                   ->orWhere('address', 'like', "%{$request->search}%")))
            ->withCount(['menuItems', 'foodOrders'])
            ->latest()
            ->paginate(20);

        return response()->json([
            'data' => $merchants->items(),
            'meta' => [
                'current_page' => $merchants->currentPage(),
                'last_page'    => $merchants->lastPage(),
                'total'        => $merchants->total(),
                'per_page'     => $merchants->perPage(),
            ],
        ]);
    }

    public function showMerchant(int $id): JsonResponse
    {
        $merchant = FoodMerchant::with([
            'user:id,name,email,phone,status',
            'categories.items',
        ])
        ->withCount(['menuItems', 'foodOrders'])
        ->findOrFail($id);

        $statsRaw = $merchant->foodOrders()
            ->selectRaw("
                COUNT(*) as total_orders,
                SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed_orders,
                SUM(CASE WHEN status = 'completed' THEN merchant_income ELSE 0 END) as total_revenue
            ")
            ->first();

        $stats = [
            'total_orders'     => (int) ($statsRaw->total_orders ?? 0),
            'completed_orders' => (int) ($statsRaw->completed_orders ?? 0),
            'total_revenue'    => (float) ($statsRaw->total_revenue ?? 0),
        ];

        return response()->json(['data' => $merchant, 'stats' => $stats]);
    }

    public function approveMerchant(Request $request, int $id): JsonResponse
    {
        $merchant = FoodMerchant::findOrFail($id);

        if ($merchant->status === 'active') {
            return response()->json(['message' => 'Merchant sudah aktif.'], 422);
        }

        $old = $merchant->status;
        $merchant->update(['status' => 'active']);

        $this->auditLogService->log($request->user(), 'approve_merchant', $merchant,
            ['status' => $old], ['status' => 'active']);

        return response()->json(['message' => "Merchant {$merchant->name} disetujui."]);
    }

    public function indexOrders(Request $request): JsonResponse
    {
        $orders = \App\Models\FoodOrder::with([
                'merchant:id,name',
                'customer:id,name',
                'mitra:id,name',
                'items',
            ])
            ->when($request->status, function ($q) use ($request) {
                $statuses = explode(',', $request->status);
                $q->whereIn('status', $statuses);
            })
            ->when($request->search, fn($q) => $q->where(fn($q2) =>
                $q2->where('order_number', 'like', "%{$request->search}%")
                   ->orWhereHas('merchant', fn($m) => $m->where('name', 'like', "%{$request->search}%"))
                   ->orWhereHas('customer', fn($c) => $c->where('name', 'like', "%{$request->search}%"))
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
        $order = FoodOrder::findOrFail($id);

        if (in_array($order->status, ['completed', 'cancelled', 'rejected'])) {
            return response()->json(['message' => 'Order sudah dalam status final.'], 422);
        }

        $old = $order->status;
        try {
            $this->foodOrderService->adminForceCancel($order, $data['reason']);
        } catch (\Exception $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }

        $this->auditLogService->log($request->user(), 'force_cancel_food_order', $order,
            ['status' => $old], ['status' => 'cancelled', 'reason' => $data['reason']]);

        return response()->json(['message' => "Order #{$order->order_number} berhasil dibatalkan."]);
    }

    public function forceCompleteOrder(Request $request, int $id): JsonResponse
    {
        $order = FoodOrder::findOrFail($id);

        if ($order->status !== 'delivered') {
            return response()->json(['message' => 'Hanya order dengan status delivered yang bisa di-force complete.'], 422);
        }

        $old = $order->status;
        try {
            $this->foodOrderService->customerConfirm($order);
        } catch (\Exception $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }

        $this->auditLogService->log($request->user(), 'force_complete_food_order', $order,
            ['status' => $old], ['status' => 'completed']);

        return response()->json(['message' => "Order #{$order->order_number} berhasil diselesaikan."]);
    }

    public function suspendMerchant(Request $request, int $id): JsonResponse
    {
        $data     = $request->validate(['reason' => ['nullable', 'string', 'max:255']]);
        $merchant = FoodMerchant::findOrFail($id);

        $old = $merchant->status;
        $merchant->update(['status' => 'suspended', 'is_open' => false]);

        $this->auditLogService->log($request->user(), 'suspend_merchant', $merchant,
            ['status' => $old], ['status' => 'suspended', 'reason' => $data['reason'] ?? null]);

        return response()->json(['message' => "Merchant {$merchant->name} disuspend."]);
    }
}
