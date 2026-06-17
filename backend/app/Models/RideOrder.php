<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class RideOrder extends Model
{
    protected $fillable = [
        'order_number', 'customer_id', 'mitra_id', 'vehicle_type',
        'ride_type', 'passenger_name', 'school_name',
        'pickup_address', 'pickup_lat', 'pickup_lng',
        'destination_address', 'destination_lat', 'destination_lng',
        'distance_km', 'fare', 'platform_commission', 'mitra_income',
        'payment_method', 'payment_status', 'status', 'notes',
        'promo_code', 'discount_amount',
        'accepted_at', 'on_pickup_at', 'on_ride_at',
        'completed_at', 'cancelled_at', 'cancel_reason', 'proof_photo_path',
    ];

    protected function casts(): array
    {
        return [
            'fare'                => 'decimal:2',
            'platform_commission' => 'decimal:2',
            'mitra_income'        => 'decimal:2',
            'distance_km'         => 'decimal:2',
            'pickup_lat'          => 'decimal:7',
            'pickup_lng'          => 'decimal:7',
            'destination_lat'     => 'decimal:7',
            'destination_lng'     => 'decimal:7',
            'accepted_at'         => 'datetime',
            'on_pickup_at'        => 'datetime',
            'on_ride_at'          => 'datetime',
            'completed_at'        => 'datetime',
            'cancelled_at'        => 'datetime',
        ];
    }

    public function customer()   { return $this->belongsTo(User::class, 'customer_id'); }
    public function mitra()      { return $this->belongsTo(User::class, 'mitra_id'); }
    public function ratings()    { return $this->hasMany(Rating::class, 'ride_order_id'); }
    public function customerRating() { return $this->hasOne(Rating::class, 'ride_order_id')->where('rater_role', 'customer'); }

    public function isActive(): bool
    {
        return in_array($this->status, ['pending', 'accepted', 'on_pickup', 'on_ride']);
    }

    public static function generateNumber(): string
    {
        return 'ZR-' . strtoupper(substr(uniqid(), -6));
    }

    // Haversine jarak lurus (km) — sebelum road_factor
    public static function straightDistance(float $lat1, float $lng1, float $lat2, float $lng2): float
    {
        $R    = 6371;
        $dLat = deg2rad($lat2 - $lat1);
        $dLng = deg2rad($lng2 - $lng1);
        $a    = sin($dLat / 2) ** 2 + cos(deg2rad($lat1)) * cos(deg2rad($lat2)) * sin($dLng / 2) ** 2;
        return $R * 2 * atan2(sqrt($a), sqrt(1 - $a));
    }
}
