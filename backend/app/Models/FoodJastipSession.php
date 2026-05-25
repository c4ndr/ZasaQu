<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class FoodJastipSession extends Model
{
    protected $fillable = [
        'mitra_id', 'status', 'vehicle_type',
        'origin_lat', 'origin_lng', 'origin_address',
        'destination_lat', 'destination_lng', 'destination_address',
        'route_polyline', 'corridor_width', 'max_orders',
        'orders_count', 'total_delivery_fee',
        'closed_reason', 'closed_at',
    ];

    protected $casts = [
        'route_polyline'   => 'array',
        'closed_at'        => 'datetime',
        'origin_lat'       => 'float',
        'origin_lng'       => 'float',
        'destination_lat'  => 'float',
        'destination_lng'  => 'float',
    ];

    public function mitra(): BelongsTo
    {
        return $this->belongsTo(User::class, 'mitra_id');
    }

    public function foodOrders(): HasMany
    {
        return $this->hasMany(FoodOrder::class, 'food_jastip_session_id');
    }

    public function isActive(): bool
    {
        return $this->status === 'active';
    }

    public function isFull(): bool
    {
        return $this->orders_count >= $this->max_orders;
    }

    // Merchant yang terlibat dalam sesi ini (unik, berurutan pickup)
    public function merchants()
    {
        return $this->foodOrders()
            ->with('merchant:id,name,logo_path,address,lat,lng')
            ->orderBy('jastip_pickup_sequence')
            ->get()
            ->pluck('merchant')
            ->unique('id')
            ->values();
    }
}
