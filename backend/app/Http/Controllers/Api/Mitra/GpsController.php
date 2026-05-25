<?php

namespace App\Http\Controllers\Api\Mitra;

use App\Events\FoodMitraLocationUpdated;
use App\Events\GpsSessionClosed;
use App\Events\MitraLocationUpdated;
use App\Models\FoodJastipSession;
use App\Models\FoodOrder;
use App\Models\JastipSession;
use App\Models\MitraDetail;
use App\Models\Order;
use App\Services\OrderService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use App\Http\Controllers\Controller;
use Illuminate\Support\Facades\Redis;

class GpsController extends Controller
{
    // Interval update GPS (detik)
    const GPS_INTERVAL = 5;
    // Redis TTL: 150 detik — toleran untuk jeda sinyal, layar HP mati, background app
    const GPS_TTL = 150;

    public function __construct(
        private OrderService $orderService,
        private \App\Services\NotificationService $notifService,
    ) {}

    public function update(Request $request): JsonResponse
    {
        if (!$request->user()->isMitra()) {
            return response()->json(['message' => 'Hanya mitra.'], 403);
        }

        $data = $request->validate([
            'lat' => ['required', 'numeric', 'between:-90,90'],
            'lng' => ['required', 'numeric', 'between:-180,180'],
        ]);

        $mitra = $request->user();
        $lat   = (float) $data['lat'];
        $lng   = (float) $data['lng'];
        $ts    = time();
        $key   = "gps:mitra:{$mitra->id}";

        // Anti-spoofing: validasi kecepatan vs posisi sebelumnya
        $prev = Redis::get($key);
        if ($prev) {
            $prevData  = json_decode($prev, true);
            $timeDiff  = max(1, $ts - ($prevData['ts'] ?? $ts));
            $distM     = $this->haversine($prevData['lat'], $prevData['lng'], $lat, $lng);
            $speedKmh  = ($distM / $timeDiff) * 3.6;

            // Kecepatan >150 km/h tidak wajar untuk mitra pengiriman — tolak update
            if ($speedKmh > 150) {
                return response()->json(['ok' => false, 'reason' => 'speed_anomaly'], 200);
            }
        }

        // Simpan ke Redis dengan expire TTL
        Redis::setex($key, self::GPS_TTL, json_encode([
            'lat' => $lat,
            'lng' => $lng,
            'ts'  => $ts,
        ]));

        // Update last_seen di mitra_details
        MitraDetail::where('user_id', $mitra->id)->update([
            'is_online'    => true,
            'last_seen_at' => now(),
        ]);

        // Broadcast ke semua order ZasaGo aktif mitra ini
        $activeOrders = Order::where('mitra_id', $mitra->id)
            ->whereIn('status', ['accepted', 'on_pickup', 'picked_up', 'on_delivery'])
            ->pluck('id');

        foreach ($activeOrders as $orderId) {
            broadcast(new MitraLocationUpdated($orderId, $mitra->id, $lat, $lng, $ts))->toOthers();
        }

        // Broadcast ke semua order ZasaFood aktif mitra ini
        $activeFoodOrders = FoodOrder::where('mitra_id', $mitra->id)
            ->whereIn('status', ['mitra_on_pickup', 'picked_up', 'on_delivery'])
            ->pluck('id');

        foreach ($activeFoodOrders as $foodOrderId) {
            broadcast(new FoodMitraLocationUpdated($foodOrderId, $mitra->id, $lat, $lng, $ts))->toOthers();
        }

        return response()->json(['ok' => true]);
    }

    public function reportLost(Request $request): JsonResponse
    {
        $mitra = $request->user();

        // Hapus GPS key dari Redis
        Redis::del("gps:mitra:{$mitra->id}");

        // Update mitra offline
        MitraDetail::where('user_id', $mitra->id)->update(['is_online' => false]);

        // Tutup sesi JastipQu yang aktif
        $session = JastipSession::where('mitra_id', $mitra->id)
            ->where('status', 'active')
            ->first();

        if ($session) {
            $this->orderService->closeJastipSession($session, 'gps_lost');

            // Broadcast ke order master
            if ($session->master_order_id) {
                broadcast(new GpsSessionClosed(
                    $session->master_order_id,
                    $session->id,
                    'gps_lost'
                ));
            }
        }

        // Tutup FoodJastipSession ZasaFood yang aktif
        $foodSession = FoodJastipSession::where('mitra_id', $mitra->id)
            ->where('status', 'active')
            ->first();

        if ($foodSession) {
            $foodSession->update([
                'status'        => 'closed',
                'closed_reason' => 'gps_lost',
                'closed_at'     => now(),
            ]);
        }

        // Notifikasi ke customer semua order ZasaGo aktif yang sedang berjalan
        $activeOrders = Order::where('mitra_id', $mitra->id)
            ->whereIn('status', ['accepted', 'on_pickup', 'picked_up', 'on_delivery'])
            ->with('customer')
            ->get();

        foreach ($activeOrders as $activeOrder) {
            if ($activeOrder->customer) {
                $this->notifService->send(
                    $activeOrder->customer,
                    'mitra_gps_lost',
                    'Sinyal GPS Mitra Terputus',
                    "Sinyal GPS mitra pada order #{$activeOrder->order_number} hilang. Pelacakan real-time tidak tersedia sementara.",
                    ['order_id' => $activeOrder->id, 'order_number' => $activeOrder->order_number]
                );
            }
        }

        // Notifikasi ke customer semua order ZasaFood aktif yang sedang berjalan
        $activeFoodOrdersWithCustomer = FoodOrder::where('mitra_id', $mitra->id)
            ->whereIn('status', ['mitra_on_pickup', 'picked_up', 'on_delivery'])
            ->with('customer')
            ->get();

        foreach ($activeFoodOrdersWithCustomer as $foodOrder) {
            if ($foodOrder->customer) {
                $this->notifService->send(
                    $foodOrder->customer,
                    'mitra_gps_lost',
                    'Sinyal GPS Mitra Terputus',
                    "Sinyal GPS mitra pada pesanan #{$foodOrder->order_number} hilang. Pelacakan real-time tidak tersedia sementara.",
                    ['food_order_id' => $foodOrder->id, 'order_number' => $foodOrder->order_number]
                );
            }
        }

        return response()->json(['message' => 'GPS status dilaporkan hilang.']);
    }

    public function status(Request $request): JsonResponse
    {
        $mitra = $request->user();
        $data  = Redis::get("gps:mitra:{$mitra->id}");

        if (!$data) {
            return response()->json(['active' => false, 'location' => null]);
        }

        return response()->json([
            'active'   => true,
            'location' => json_decode($data, true),
        ]);
    }

    private function haversine(float $lat1, float $lng1, float $lat2, float $lng2): float
    {
        $R    = 6371000;
        $dLat = deg2rad($lat2 - $lat1);
        $dLng = deg2rad($lng2 - $lng1);
        $a    = sin($dLat / 2) ** 2 + cos(deg2rad($lat1)) * cos(deg2rad($lat2)) * sin($dLng / 2) ** 2;
        return $R * 2 * atan2(sqrt($a), sqrt(1 - $a));
    }

    public function getLocation(Request $request, int $orderId): JsonResponse
    {
        $order = Order::findOrFail($orderId);

        // Pastikan user punya akses ke order ini
        $user = $request->user();
        if ($order->customer_id !== $user->id && $order->mitra_id !== $user->id) {
            return response()->json(['message' => 'Akses ditolak.'], 403);
        }

        if (!$order->mitra_id) {
            return response()->json(['location' => null, 'gps_active' => false]);
        }

        $key  = "gps:mitra:{$order->mitra_id}";
        $data = Redis::get($key);

        if (!$data) {
            return response()->json(['location' => null, 'gps_active' => false]);
        }

        return response()->json([
            'location'   => json_decode($data, true),
            'gps_active' => true,
        ]);
    }
}
