<?php

namespace App\Http\Controllers\Api\Food;

use App\Http\Controllers\Controller;
use App\Models\AdminSetting;
use App\Models\FoodOrder;
use App\Services\FoodOrderService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Redis;

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

        // Filter berdasarkan jarak GPS mitra jika tersedia
        $gpsRaw = Redis::get("gps:mitra:{$request->user()->id}");
        if ($gpsRaw) {
            $gps      = json_decode($gpsRaw, true);
            $radiusKm = (float) AdminSetting::valueOf('food_mitra_assign_radius_km', 5);

            $orders = $orders->filter(function ($order) use ($gps, $radiusKm) {
                if (!$order->merchant?->lat || !$order->merchant?->lng) {
                    return true;
                }
                return $this->haversine($gps['lat'], $gps['lng'], $order->merchant->lat, $order->merchant->lng) <= $radiusKm;
            })->values();
        }

        return response()->json(['data' => $orders]);
    }

    public function myOrders(Request $request): JsonResponse
    {
        $activeStatuses = ['mitra_on_pickup', 'picked_up', 'on_delivery', 'delivered'];

        // Order aktif: semua dimuat agar mitra tidak melewatkan tugas
        $active = FoodOrder::where('mitra_id', $request->user()->id)
            ->with(['merchant:id,name,address,lat,lng,logo_path', 'customer:id,name,phone', 'items'])
            ->whereIn('status', $activeStatuses)
            ->latest()
            ->get();

        // Riwayat selesai: 30 terbaru cukup
        $history = FoodOrder::where('mitra_id', $request->user()->id)
            ->with(['merchant:id,name,address,lat,lng,logo_path', 'customer:id,name,phone', 'items'])
            ->whereNotIn('status', $activeStatuses)
            ->latest()
            ->limit(30)
            ->get();

        return response()->json(['data' => $active->concat($history)->values()]);
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

    private function haversine(float $lat1, float $lng1, float $lat2, float $lng2): float
    {
        $R    = 6371;
        $dLat = deg2rad($lat2 - $lat1);
        $dLng = deg2rad($lng2 - $lng1);
        $a    = sin($dLat / 2) ** 2 + cos(deg2rad($lat1)) * cos(deg2rad($lat2)) * sin($dLng / 2) ** 2;
        return $R * 2 * atan2(sqrt($a), sqrt(1 - $a));
    }
}
