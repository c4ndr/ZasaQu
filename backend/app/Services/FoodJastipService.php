<?php

namespace App\Services;

use App\Models\FoodJastipSession;
use App\Models\FoodOrder;
use App\Models\User;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

class FoodJastipService
{
    public function __construct(private NotificationService $notifService) {}
    // ── Session management ────────────────────────────────────────────────────

    public function startSession(User $mitra, array $data): FoodJastipSession
    {
        // Pastikan tidak ada sesi aktif
        FoodJastipSession::where('mitra_id', $mitra->id)
            ->where('status', 'active')
            ->update(['status' => 'closed', 'closed_reason' => 'manual', 'closed_at' => now()]);

        return FoodJastipSession::create([
            'mitra_id'            => $mitra->id,
            'vehicle_type'        => $data['vehicle_type'],
            'origin_lat'          => $data['origin_lat'],
            'origin_lng'          => $data['origin_lng'],
            'origin_address'      => $data['origin_address'] ?? null,
            'destination_lat'     => $data['destination_lat'] ?? null,
            'destination_lng'     => $data['destination_lng'] ?? null,
            'destination_address' => $data['destination_address'] ?? null,
            'route_polyline'      => $data['route_polyline'] ?? null,
            'corridor_width'      => $data['corridor_width'] ?? 1000,
            'max_orders'          => $data['max_orders'] ?? 5,
        ]);
    }

    public function closeSession(FoodJastipSession $session, string $reason = 'manual'): void
    {
        $session->update([
            'status'        => 'closed',
            'closed_reason' => $reason,
            'closed_at'     => now(),
        ]);

        // Notifikasi ke semua customer yang order-nya masih dalam sesi ini
        $reasonLabel = match($reason) {
            'gps_lost' => 'GPS mitra terputus',
            'manual'   => 'Mitra menutup sesi',
            default    => 'Sesi ditutup',
        };
        $activeOrders = FoodOrder::where('food_jastip_session_id', $session->id)
            ->whereNotIn('status', ['completed', 'cancelled', 'rejected'])
            ->with('customer')
            ->get();
        foreach ($activeOrders as $order) {
            if ($order->customer) {
                $this->notifService->send(
                    $order->customer,
                    'food_jastip_session_closed',
                    'Sesi Jastip Ditutup',
                    "Sesi jastip makanan telah ditutup ({$reasonLabel}). Pesanan #{$order->order_number} akan diproses secara terpisah.",
                    ['food_order_id' => $order->id, 'order_number' => $order->order_number]
                );
            }
        }
    }

    public function getActiveSession(User $mitra): ?FoodJastipSession
    {
        return FoodJastipSession::where('mitra_id', $mitra->id)
            ->where('status', 'active')
            ->with(['foodOrders' => function ($q) {
                $q->with([
                    'merchant:id,name,logo_path,address,lat,lng',
                    'customer:id,name',
                    'items.menuItem',
                ])->orderBy('jastip_pickup_sequence');
            }])
            ->first();
    }

    // ── Browse sessions ───────────────────────────────────────────────────────

    public function getAvailableSessions(array $filters): Collection
    {
        $query = FoodJastipSession::where('status', 'active')
            ->whereColumn('orders_count', '<', 'max_orders')
            ->with([
                'mitra:id,name,fcm_token',
                'foodOrders.merchant:id,name,logo_path,lat,lng',
            ]);

        if (!empty($filters['vehicle_type'])) {
            $query->where('vehicle_type', $filters['vehicle_type']);
        }

        $sessions = $query->latest()->get();

        // Filter by proximity ke destination customer (jika ada koordinat)
        if (!empty($filters['lat']) && !empty($filters['lng'])) {
            $lat = (float) $filters['lat'];
            $lng = (float) $filters['lng'];
            $sessions = $sessions->filter(function ($session) use ($lat, $lng) {
                // Gunakan titik tujuan jika ada, atau titik asal sebagai fallback
                $refLat = $session->destination_lat ?? $session->origin_lat;
                $refLng = $session->destination_lng ?? $session->origin_lng;
                $dist   = $this->haversineKm($refLat, $refLng, $lat, $lng);
                return $dist <= 3.0;
            })->values();
        }

        return $sessions;
    }

    // ── Join session ──────────────────────────────────────────────────────────

    public function attachOrderToSession(FoodOrder $order, FoodJastipSession $session): void
    {
        DB::transaction(function () use ($order, $session) {
            // Lock session row agar isFull() check dan increment berjalan atomik
            $locked = FoodJastipSession::lockForUpdate()->findOrFail($session->id);

            if (!$locked->isActive()) {
                throw new \Exception('Sesi sudah tidak aktif.');
            }
            if ($locked->isFull()) {
                throw new \Exception('Sesi sudah penuh.');
            }

            $sequence = $locked->orders_count + 1;

            $order->update([
                'food_jastip_session_id' => $locked->id,
                'is_jastip'              => true,
                'jastip_pickup_sequence' => $sequence,
                'mitra_id'               => $locked->mitra_id,
                'mitra_assigned_at'      => now(),
            ]);

            $locked->increment('orders_count');
            $locked->increment('total_delivery_fee', $order->delivery_fee);
        });
    }

    // ── Mitra pickup flow ─────────────────────────────────────────────────────

    public function markPickedUpFromMerchant(FoodOrder $order): void
    {
        $order->update([
            'mitra_picked_up_from_merchant_at' => now(),
        ]);

        // Cek apakah semua order dalam sesi sudah di-pickup dari merchant
        $session = $order->jastipSession;
        if ($session) {
            $allPickedUp = $session->foodOrders()
                ->whereIn('status', ['ready_for_pickup', 'mitra_on_pickup'])
                ->whereNull('mitra_picked_up_from_merchant_at')
                ->doesntExist();

            if ($allPickedUp) {
                // Update semua order ke picked_up sekaligus
                $session->foodOrders()
                    ->whereIn('status', ['mitra_on_pickup'])
                    ->update(['status' => 'picked_up', 'picked_up_at' => now()]);
            }
        }
    }

    // ── Validation: apakah merchant dalam koridor rute ─────────────────────────

    public function isMerchantInCorridor(FoodJastipSession $session, float $merchantLat, float $merchantLng): bool
    {
        // Jika tidak ada koordinat tujuan, cukup cek radius dari titik asal
        if ($session->destination_lat === null || $session->destination_lng === null) {
            $distKm = $this->haversineKm(
                $merchantLat, $merchantLng,
                $session->origin_lat, $session->origin_lng
            );
            return $distKm * 1000 <= $session->corridor_width;
        }

        $distKm = $this->pointToSegmentDistanceKm(
            $merchantLat, $merchantLng,
            $session->origin_lat, $session->origin_lng,
            $session->destination_lat, $session->destination_lng
        );

        return $distKm * 1000 <= $session->corridor_width;
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private function haversineKm(float $lat1, float $lng1, float $lat2, float $lng2): float
    {
        $R    = 6371;
        $dLat = deg2rad($lat2 - $lat1);
        $dLng = deg2rad($lng2 - $lng1);
        $a    = sin($dLat / 2) ** 2 + cos(deg2rad($lat1)) * cos(deg2rad($lat2)) * sin($dLng / 2) ** 2;
        return $R * 2 * atan2(sqrt($a), sqrt(1 - $a));
    }

    private function pointToSegmentDistanceKm(
        float $pLat, float $pLng,
        float $aLat, float $aLng,
        float $bLat, float $bLng
    ): float {
        $dx = $bLng - $aLng;
        $dy = $bLat - $aLat;

        if ($dx == 0 && $dy == 0) {
            return $this->haversineKm($pLat, $pLng, $aLat, $aLng);
        }

        $t = (($pLat - $aLat) * $dy + ($pLng - $aLng) * $dx) / ($dy * $dy + $dx * $dx);
        $t = max(0, min(1, $t));

        $nearestLat = $aLat + $t * $dy;
        $nearestLng = $aLng + $t * $dx;

        return $this->haversineKm($pLat, $pLng, $nearestLat, $nearestLng);
    }
}
