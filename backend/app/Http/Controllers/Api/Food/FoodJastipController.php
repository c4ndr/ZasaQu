<?php

namespace App\Http\Controllers\Api\Food;

use App\Http\Controllers\Controller;
use App\Models\FoodJastipSession;
use App\Models\FoodOrder;
use App\Services\FoodJastipService;
use App\Services\FoodOrderService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class FoodJastipController extends Controller
{
    public function __construct(
        private FoodJastipService $jastipService,
        private FoodOrderService  $foodOrderService,
    ) {}

    // ── Customer ──────────────────────────────────────────────────────────────

    /** GET /food/jastip/sessions/available */
    public function availableSessions(Request $request): JsonResponse
    {
        $sessions = $this->jastipService->getAvailableSessions([
            'vehicle_type' => $request->query('vehicle_type'),
            'lat'          => $request->query('lat'),
            'lng'          => $request->query('lng'),
        ]);

        return response()->json(['data' => $sessions]);
    }

    /** POST /food/jastip/sessions/{session}/join */
    public function joinSession(Request $request, FoodJastipSession $session): JsonResponse
    {
        if (!$session->isActive()) {
            return response()->json(['message' => 'Sesi sudah tidak aktif.'], 422);
        }
        if ($session->isFull()) {
            return response()->json(['message' => 'Sesi sudah penuh.'], 422);
        }

        $data = $request->validate([
            'food_order_id' => ['required', 'integer', 'exists:food_orders,id'],
        ]);

        $order = FoodOrder::findOrFail($data['food_order_id']);

        // Validasi: order milik customer ini
        if ($order->customer_id !== $request->user()->id) {
            return response()->json(['message' => 'Order tidak ditemukan.'], 403);
        }

        // Validasi: order masih pending dan belum punya mitra
        if ($order->status !== 'pending' || $order->mitra_id !== null) {
            return response()->json(['message' => 'Order tidak bisa digabung ke sesi.'], 422);
        }

        // Validasi: merchant dalam koridor rute sesi
        $merchant = $order->merchant;
        if (!$this->jastipService->isMerchantInCorridor($session, $merchant->lat, $merchant->lng)) {
            return response()->json(['message' => 'Warung tidak berada dalam rute sesi ini.'], 422);
        }

        $this->jastipService->attachOrderToSession($order, $session);

        return response()->json([
            'message' => 'Berhasil bergabung ke sesi hemat ongkir!',
            'order'   => $order->fresh(['merchant', 'items', 'jastipSession.mitra:id,name']),
        ]);
    }

    // ── Mitra ─────────────────────────────────────────────────────────────────

    /** GET /food/jastip/sessions/current */
    public function currentSession(Request $request): JsonResponse
    {
        $session = $this->jastipService->getActiveSession($request->user());

        if (!$session) {
            return response()->json(['data' => null]);
        }

        return response()->json(['data' => $session]);
    }

    /** POST /food/jastip/sessions */
    public function startSession(Request $request): JsonResponse
    {
        $data = $request->validate([
            'origin_lat'          => ['required', 'numeric'],
            'origin_lng'          => ['required', 'numeric'],
            'origin_address'      => ['nullable', 'string', 'max:255'],
            'destination_lat'     => ['nullable', 'numeric'],
            'destination_lng'     => ['nullable', 'numeric'],
            'destination_address' => ['nullable', 'string', 'max:255'],
            'corridor_width'      => ['nullable', 'integer', 'min:200', 'max:5000'],
            'max_orders'          => ['nullable', 'integer', 'min:1', 'max:10'],
        ]);

        // Derive vehicle type from user role
        $role = $request->user()->role;
        $data['vehicle_type'] = str_contains($role, 'mobil') ? 'mobil' : 'motor';

        $session = $this->jastipService->startSession($request->user(), $data);

        return response()->json([
            'message' => 'Sesi Kuliner berhasil dibuka.',
            'data'    => $session,
        ], 201);
    }

    /** DELETE /food/jastip/sessions/current */
    public function closeSession(Request $request): JsonResponse
    {
        $session = FoodJastipSession::where('mitra_id', $request->user()->id)
            ->where('status', 'active')
            ->first();

        if (!$session) {
            return response()->json(['message' => 'Tidak ada sesi aktif.'], 404);
        }

        $this->jastipService->closeSession($session, 'manual');

        return response()->json(['message' => 'Sesi Kuliner ditutup.']);
    }

    /** POST /food/jastip/orders/{order}/pickup-from-merchant */
    public function pickupFromMerchant(Request $request, FoodOrder $order): JsonResponse
    {
        // Validasi: order milik sesi mitra ini
        $session = FoodJastipSession::where('mitra_id', $request->user()->id)
            ->where('status', 'active')
            ->first();

        if (!$session || $order->food_jastip_session_id !== $session->id) {
            return response()->json(['message' => 'Order tidak ditemukan di sesi Anda.'], 403);
        }

        if (!in_array($order->status, ['mitra_on_pickup', 'ready_for_pickup'])) {
            return response()->json(['message' => 'Status order tidak valid untuk pickup.'], 422);
        }

        // Update status order ke mitra_on_pickup jika belum
        if ($order->status === 'ready_for_pickup') {
            $order->update(['status' => 'mitra_on_pickup', 'mitra_on_pickup_at' => now()]);
        }

        $this->jastipService->markPickedUpFromMerchant($order);

        return response()->json([
            'message' => 'Pickup dari warung berhasil dicatat.',
            'order'   => $order->fresh(),
        ]);
    }

    /** GET /food/jastip/sessions/{session} — detail sesi untuk customer */
    public function showSession(FoodJastipSession $session): JsonResponse
    {
        $session->load([
            'mitra:id,name',
            'foodOrders' => fn($q) => $q->orderBy('jastip_pickup_sequence')
                ->with(['merchant:id,name,logo_path,address,lat,lng', 'items']),
        ]);

        return response()->json(['data' => $session]);
    }
}
