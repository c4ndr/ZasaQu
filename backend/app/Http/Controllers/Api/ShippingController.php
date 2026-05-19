<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AdminSetting;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ShippingController extends Controller
{
    public function estimate(Request $request): JsonResponse
    {
        $request->validate([
            'pickup_lat'   => ['required', 'numeric', 'between:-90,90'],
            'pickup_lng'   => ['required', 'numeric', 'between:-180,180'],
            'dropoff_lat'  => ['required', 'numeric', 'between:-90,90'],
            'dropoff_lng'  => ['required', 'numeric', 'between:-180,180'],
            'vehicle_type' => ['required', 'in:motor,mobil'],
        ]);

        $type = $request->vehicle_type;

        // Ambil tarif dari settings
        $baseFee  = (int) AdminSetting::valueOf("shipping_{$type}_base",   5000);
        $perKm    = (int) AdminSetting::valueOf("shipping_{$type}_per_km", 3000);

        // Hitung jarak jalan nyata via OSRM, fallback ke Haversine
        $distanceKm = $this->roadDistance(
            $request->pickup_lat,
            $request->pickup_lng,
            $request->dropoff_lat,
            $request->dropoff_lng
        );

        // Bulatkan ke 1 desimal
        $distanceKm = round($distanceKm, 1);

        // Hitung ongkir — minimal jarak 1 km
        $effectiveKm  = max($distanceKm, 1);
        $distanceFee  = (int) round($effectiveKm * $perKm);
        $shippingFee  = $baseFee + $distanceFee;

        // Bulatkan ke ratusan terdekat
        $shippingFee = (int) (ceil($shippingFee / 100) * 100);

        return response()->json([
            'distance_km'  => $distanceKm,
            'shipping_fee' => $shippingFee,
            'breakdown'    => [
                'base_fee'     => $baseFee,
                'distance_km'  => $distanceKm,
                'distance_fee' => $distanceFee,
                'per_km'       => $perKm,
            ],
        ]);
    }

    // Jarak jalan nyata dari OSRM — fallback ke Haversine jika gagal
    private function roadDistance(float $lat1, float $lng1, float $lat2, float $lng2): float
    {
        // OSRM pakai urutan lng,lat (bukan lat,lng)
        $url = sprintf(
            'https://router.project-osrm.org/route/v1/driving/%s,%s;%s,%s?overview=false',
            $lng1, $lat1, $lng2, $lat2
        );

        try {
            $ctx  = stream_context_create(['http' => [
                'timeout'        => 5,
                'ignore_errors'  => true,
            ]]);
            $body = @file_get_contents($url, false, $ctx);

            if ($body) {
                $data = json_decode($body, true);
                if (($data['code'] ?? '') === 'Ok' && isset($data['routes'][0]['distance'])) {
                    // OSRM mengembalikan jarak dalam meter
                    return round($data['routes'][0]['distance'] / 1000, 1);
                }
            }
        } catch (\Throwable) {}

        // Fallback: Haversine (garis lurus)
        return round($this->haversine($lat1, $lng1, $lat2, $lng2), 1);
    }

    private function haversine(float $lat1, float $lng1, float $lat2, float $lng2): float
    {
        $R    = 6371;
        $dLat = deg2rad($lat2 - $lat1);
        $dLng = deg2rad($lng2 - $lng1);
        $a    = sin($dLat / 2) ** 2
              + cos(deg2rad($lat1)) * cos(deg2rad($lat2)) * sin($dLng / 2) ** 2;
        return $R * 2 * atan2(sqrt($a), sqrt(1 - $a));
    }
}
