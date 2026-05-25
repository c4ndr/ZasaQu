<?php

namespace App\Http\Controllers\Api\Merchant;

use App\Http\Controllers\Controller;
use App\Models\FoodOrder;
use App\Services\FoodOrderService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class FoodOrderController extends Controller
{
    public function __construct(private FoodOrderService $foodOrderService) {}

    private function merchant(Request $request): ?\App\Models\FoodMerchant
    {
        return $request->user()->foodMerchant;
    }

    public function index(Request $request): JsonResponse
    {
        $merchant = $this->merchant($request);
        if (!$merchant) {
            return response()->json(['message' => 'Merchant tidak ditemukan.'], 404);
        }

        $activeStatuses = ['pending','merchant_accepted','preparing','ready_for_pickup','mitra_on_pickup','picked_up','on_delivery','delivered'];

        // Order aktif: semua dimuat (merchant harus lihat semua order aktif)
        $active = FoodOrder::where('merchant_id', $merchant->id)
            ->with(['customer:id,name,phone', 'items'])
            ->whereIn('status', $activeStatuses)
            ->latest()
            ->get();

        // Riwayat: 50 terbaru cukup untuk dashboard merchant
        $history = FoodOrder::where('merchant_id', $merchant->id)
            ->with(['customer:id,name,phone', 'items'])
            ->whereNotIn('status', $activeStatuses)
            ->latest()
            ->limit(50)
            ->get();

        return response()->json(['data' => $active->concat($history)->values()]);
    }

    public function show(Request $request, int $id): JsonResponse
    {
        $merchant = $this->merchant($request);
        if (!$merchant) return response()->json(['message' => 'Merchant tidak ditemukan.'], 404);

        $order = FoodOrder::where('merchant_id', $merchant->id)
            ->with(['customer:id,name,phone', 'items', 'mitra:id,name,phone'])
            ->findOrFail($id);

        return response()->json(['data' => $order]);
    }

    public function accept(Request $request, int $id): JsonResponse
    {
        $merchant = $this->merchant($request);
        if (!$merchant) return response()->json(['message' => 'Merchant tidak ditemukan.'], 404);

        $data  = $request->validate(['prep_minutes' => ['required', 'integer', 'min:1', 'max:180']]);
        $order = FoodOrder::where('merchant_id', $merchant->id)->findOrFail($id);

        try {
            $this->foodOrderService->merchantAccept($order, $data['prep_minutes']);
        } catch (\Exception $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }

        return response()->json(['message' => 'Order diterima.', 'data' => $order->fresh()]);
    }

    public function reject(Request $request, int $id): JsonResponse
    {
        $merchant = $this->merchant($request);
        if (!$merchant) return response()->json(['message' => 'Merchant tidak ditemukan.'], 404);

        $data  = $request->validate(['reason' => ['nullable', 'string', 'max:255']]);
        $order = FoodOrder::where('merchant_id', $merchant->id)->findOrFail($id);

        try {
            $this->foodOrderService->merchantReject($order, $data['reason'] ?? null);
        } catch (\Exception $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }

        return response()->json(['message' => 'Order ditolak.']);
    }

    public function preparing(Request $request, int $id): JsonResponse
    {
        $merchant = $this->merchant($request);
        if (!$merchant) return response()->json(['message' => 'Merchant tidak ditemukan.'], 404);

        $order = FoodOrder::where('merchant_id', $merchant->id)->findOrFail($id);

        try {
            $this->foodOrderService->merchantPreparing($order);
        } catch (\Exception $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }

        return response()->json(['message' => 'Status diperbarui: sedang dimasak.', 'data' => $order->fresh()]);
    }

    public function ready(Request $request, int $id): JsonResponse
    {
        $merchant = $this->merchant($request);
        if (!$merchant) return response()->json(['message' => 'Merchant tidak ditemukan.'], 404);

        $order = FoodOrder::where('merchant_id', $merchant->id)->findOrFail($id);

        try {
            $this->foodOrderService->merchantReady($order);
        } catch (\Exception $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }

        return response()->json(['message' => 'Pesanan siap diambil. Mitra sedang dicari.', 'data' => $order->fresh()]);
    }
}
