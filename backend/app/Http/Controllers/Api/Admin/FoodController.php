<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\FoodMerchant;
use App\Services\AuditLogService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class FoodController extends Controller
{
    public function __construct(private AuditLogService $auditLogService) {}

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

        $stats = [
            'total_orders'     => $merchant->foodOrders()->count(),
            'completed_orders' => $merchant->foodOrders()->where('status', 'completed')->count(),
            'total_revenue'    => $merchant->foodOrders()->where('status', 'completed')->sum('merchant_income'),
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

        return response()->json($orders);
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
