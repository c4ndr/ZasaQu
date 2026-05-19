<?php

namespace App\Services;

/**
 * Cek apakah titik pickup/dropoff berada dalam koridor rute dan searah.
 * Koridor = kanan-kiri sepanjang jalur rute (bukan radius lingkaran).
 */
class CorridorService
{
    // Hitung jarak (meter) antara dua koordinat menggunakan Haversine
    public function haversine(float $lat1, float $lng1, float $lat2, float $lng2): float
    {
        $R    = 6371000; // radius bumi dalam meter
        $dLat = deg2rad($lat2 - $lat1);
        $dLng = deg2rad($lng2 - $lng1);
        $a    = sin($dLat / 2) ** 2 + cos(deg2rad($lat1)) * cos(deg2rad($lat2)) * sin($dLng / 2) ** 2;
        return $R * 2 * atan2(sqrt($a), sqrt(1 - $a));
    }

    // Hitung jarak titik P ke segmen garis A-B, kembalikan [jarak, parameter_t]
    // parameter_t: 0 = titik A, 1 = titik B, 0-1 = di antara keduanya
    private function pointToSegment(array $P, array $A, array $B): array
    {
        $dx = $B[0] - $A[0];
        $dy = $B[1] - $A[1];
        $len2 = $dx * $dx + $dy * $dy;

        if ($len2 === 0.0) {
            return [$this->haversine($P[0], $P[1], $A[0], $A[1]), 0.0];
        }

        $t = max(0, min(1, (($P[0] - $A[0]) * $dx + ($P[1] - $A[1]) * $dy) / $len2));
        $closestLat = $A[0] + $t * $dx;
        $closestLng = $A[1] + $t * $dy;

        return [$this->haversine($P[0], $P[1], $closestLat, $closestLng), $t];
    }

    // Cari segmen terdekat dari polyline ke titik P
    // Kembalikan [jarak_minimum, indeks_segmen + parameter_t] = "posisi" di rute
    private function closestOnRoute(array $point, array $polyline): array
    {
        $minDist  = PHP_FLOAT_MAX;
        $position = 0.0;

        foreach ($polyline as $i => $seg) {
            if ($i >= count($polyline) - 1) break;
            [$dist, $t] = $this->pointToSegment($point, $polyline[$i], $polyline[$i + 1]);
            if ($dist < $minDist) {
                $minDist  = $dist;
                $position = $i + $t;
            }
        }

        return [$minDist, $position];
    }

    /**
     * Apakah titik berada dalam koridor rute?
     */
    public function isWithinCorridor(float $lat, float $lng, array $polyline, int $corridorMeters): bool
    {
        [$dist] = $this->closestOnRoute([$lat, $lng], $polyline);
        return $dist <= $corridorMeters;
    }

    /**
     * Validasi titip jastip: pickup dan dropoff harus dalam koridor DAN searah.
     * "Searah" = posisi pickup di rute < posisi dropoff di rute.
     */
    public function isValidJastipRoute(
        float $pickupLat, float $pickupLng,
        float $dropoffLat, float $dropoffLng,
        array $polyline,
        int   $corridorMeters
    ): array {
        [$pickupDist, $pickupPos]   = $this->closestOnRoute([$pickupLat, $pickupLng], $polyline);
        [$dropoffDist, $dropoffPos] = $this->closestOnRoute([$dropoffLat, $dropoffLng], $polyline);

        if ($pickupDist > $corridorMeters) {
            return [false, 'Titik pickup di luar koridor rute mitra.'];
        }
        if ($dropoffDist > $corridorMeters) {
            return [false, 'Titik dropoff di luar koridor rute mitra.'];
        }
        if ($dropoffPos <= $pickupPos) {
            return [false, 'Titik dropoff tidak searah dengan rute mitra (harus lebih jauh di rute).'];
        }

        return [true, 'OK'];
    }
}
