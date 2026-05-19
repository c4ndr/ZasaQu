<?php

namespace App\Http\Controllers\Api\Food;

use App\Http\Controllers\Controller;
use App\Models\FoodOrder;
use App\Services\FoodOrderService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class FoodMitraController extends Controller
{
    public function __construct(private FoodOrderService $foodOrderService) {}

    public function available(Request $request): JsonResponse
    {
        $orders = FoodOrder::where('status', 'ready_for_pickup')
            ->whereNull('mitra_id')
            ->with(['merchant:id,name,address,lat,lng,logo_path', 'items'])
            ->latest()
            ->get();

        return response()->json(['data' => $orders]);
    }

    public function myOrders(Request $request): JsonResponse
    {
        $orders = FoodOrder::where('mitra_id', $request->user()->id)
            ->with(['merchant:id,name,address,lat,lng,logo_path', 'customer:id,name,phone', 'items'])
            ->latest()
            ->paginate(20);

        return response()->json($orders);
    }

    public function accept(Request $request, int $id): JsonResponse
    {
        $order = FoodOrder::findOrFail($id);

        try {
            $updated = $this->foodOrderService->mitraAccept($order, $request->user());
        } catch (\Exception $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }

        return response()->json([
            'message' => 'Order diterima. Menuju merchant sekarang!',
            'data'    => $updated->load(['merchant', 'customer:id,name,phone', 'items']),
        ]);
    }

    public function updateStatus(Request $request, int $id): JsonResponse
    {
        $order = FoodOrder::where('mitra_id', $request->user()->id)->findOrFail($id);
        $data  = $request->validate([
            'status' => ['required', 'in:picked_up,on_delivery,delivered'],
        ]);

        try {
            $updated = $this->foodOrderService->mitraUpdateStatus($order, $data['status']);
        } catch (\Exception $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }

        return response()->json(['message' => 'Status diperbarui.', 'data' => $updated]);
    }
}
