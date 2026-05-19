<?php

namespace App\Services;

use App\Models\AdminSetting;
use App\Models\JastipSession;
use App\Models\Order;
use App\Models\User;

class JastipService
{
    private function getSetting(string $key, mixed $default): mixed
    {
        $s = AdminSetting::where('key', $key)->first();
        return $s ? $s->value : $default;
    }

    public function startSession(User $mitra, array $data): JastipSession
    {
        // Tutup sesi lama jika masih ada
        JastipSession::where('mitra_id', $mitra->id)->where('status', 'active')
            ->update(['status' => 'closed', 'closed_reason' => 'manual', 'closed_at' => now()]);

        $vehicleType = str_contains($mitra->role, 'motor') ? 'motor' : 'mobil';
        $maxJastip   = (int) $this->getSetting(
            $vehicleType === 'motor' ? 'max_jastip_motor' : 'max_jastip_mobil', 3
        );
        $corridor = (int) $this->getSetting('corridor_default_meters', 500);

        return JastipSession::create([
            'mitra_id'        => $mitra->id,
            'master_order_id' => $data['master_order_id'] ?? null,
            'status'          => 'active',
            'vehicle_type'    => $vehicleType,
            'origin_lat'      => $data['origin_lat'],
            'origin_lng'      => $data['origin_lng'],
            // Jika tujuan tidak diisi, gunakan origin (mode radius — tanpa rute spesifik)
            'destination_lat' => $data['destination_lat'] ?? $data['origin_lat'],
            'destination_lng' => $data['destination_lng'] ?? $data['origin_lng'],
            'route_polyline'  => $data['route_polyline'] ?? null,
            'corridor_width'  => $data['corridor_width'] ?? $corridor,
            'max_jastip'      => $maxJastip,
        ]);
    }

    public function getActiveSessions(string $vehicleType, ?float $lat = null, ?float $lng = null, int $radiusMeters = 5000): \Illuminate\Database\Eloquent\Collection
    {
        $sessions = JastipSession::with(['mitra', 'mitra.mitraDetail'])
            ->where('status', 'active')
            ->where('vehicle_type', $vehicleType)
            ->whereHas('mitra.mitraDetail', fn($q) => $q->where('is_online', true)) // hanya mitra online
            ->get()
            ->filter(fn($s) => $s->hasCapacity());

        // Jika ada koordinat pelanggan → filter radius lalu urutkan terdekat
        if ($lat !== null && $lng !== null) {
            $sessions = $sessions
                ->map(fn($s) => $s->setAttribute('distance_m', (int) $this->haversine($lat, $lng, $s->origin_lat, $s->origin_lng)))
                ->filter(fn($s) => $s->distance_m <= $radiusMeters)
                ->sortBy('distance_m');
        }

        return $sessions->values();
    }

    private function haversine(float $lat1, float $lng1, float $lat2, float $lng2): float
    {
        $R    = 6371000;
        $dLat = deg2rad($lat2 - $lat1);
        $dLng = deg2rad($lng2 - $lng1);
        $a    = sin($dLat / 2) ** 2 + cos(deg2rad($lat1)) * cos(deg2rad($lat2)) * sin($dLng / 2) ** 2;
        return $R * 2 * atan2(sqrt($a), sqrt(1 - $a));
    }
}
