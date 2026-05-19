<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Services\AuditLogService;
use App\Services\OrderService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class OrderController extends Controller
{
    public function __construct(
        private OrderService    $orderService,
        private AuditLogService $auditLogService,
    ) {}

    public function index(Request $request): JsonResponse
    {
        $orders = Order::with(['customer', 'mitra', 'itemCategory'])
            ->when($request->status, function ($q) use ($request) {
                // Support status tunggal atau koma-separated (misal: "pending,accepted,on_delivery")
                $statuses = explode(',', $request->status);
                return count($statuses) > 1
                    ? $q->whereIn('status', $statuses)
                    : $q->where('status', $request->status);
            })
            ->when($request->type, fn($q) => $q->where('type', $request->type))
            ->when($request->search, fn($q) => $q->where('order_number', 'like', "%{$request->search}%"))
            ->latest()
            ->paginate((int) ($request->per_page ?? 20));

        return response()->json($orders);
    }

    public function show(int $id): JsonResponse
    {
        $order = Order::with(['customer', 'mitra', 'itemCategory', 'photos', 'jastipSession'])->findOrFail($id);
        return response()->json($order);
    }

    public function forceComplete(Request $request, int $id): JsonResponse
    {
        $order = Order::findOrFail($id);

        if (!in_array($order->status, ['delivered'])) {
            return response()->json(['message' => 'Hanya order berstatus delivered yang bisa di-force complete.'], 422);
        }

        try {
            $this->orderService->updateStatus($order, 'completed');
        } catch (\Exception $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }

        $this->auditLogService->log($request->user(), 'force_complete_order', $order,
            ['status' => 'delivered'], ['status' => 'completed']);

        return response()->json(['message' => 'Order berhasil diselesaikan secara paksa.']);
    }

    public function forceCancel(Request $request, int $id): JsonResponse
    {
        $data  = $request->validate(['reason' => ['required', 'string']]);
        $order = Order::findOrFail($id);

        try {
            $this->orderService->cancelOrder($order, "[Admin] {$data['reason']}");
        } catch (\Exception $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }

        $this->auditLogService->log($request->user(), 'force_cancel_order', $order,
            ['status' => $order->status], ['status' => 'cancelled', 'reason' => $data['reason']]);

        return response()->json(['message' => 'Order berhasil dibatalkan oleh admin.']);
    }
}
