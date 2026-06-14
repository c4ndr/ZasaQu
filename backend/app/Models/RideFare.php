<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class RideFare extends Model
{
    protected $fillable = [
        'vehicle_type', 'base_fare', 'per_km_fare',
        'minimum_fare', 'commission_rate', 'road_factor', 'is_active',
    ];

    protected function casts(): array
    {
        return [
            'base_fare'       => 'decimal:2',
            'per_km_fare'     => 'decimal:2',
            'minimum_fare'    => 'decimal:2',
            'commission_rate' => 'decimal:2',
            'road_factor'     => 'decimal:2',
            'is_active'       => 'boolean',
        ];
    }

    public function calculateFare(float $distanceKm): array
    {
        $roadDist   = $distanceKm * (float) $this->road_factor;
        $raw        = (float) $this->base_fare + ($roadDist * (float) $this->per_km_fare);
        $fare       = max($raw, (float) $this->minimum_fare);
        $commission = round($fare * (float) $this->commission_rate / 100);
        $income     = $fare - $commission;

        return [
            'distance_km'         => round($roadDist, 2),
            'fare'                => round($fare),
            'platform_commission' => $commission,
            'mitra_income'        => $income,
        ];
    }
}
