<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class HomeOrder extends Model
{
    protected $fillable = [
        'order_number', 'customer_id', 'provider_id', 'status',
        'pickup_address', 'pickup_lat', 'pickup_lng',
        'delivery_address', 'delivery_lat', 'delivery_lng',
        'notes', 'total_price',
        'scheduled_pickup_at', 'ready_at', 'completed_at', 'cancel_reason',
    ];

    protected $casts = [
        'scheduled_pickup_at' => 'datetime',
        'ready_at'            => 'datetime',
        'completed_at'        => 'datetime',
        'pickup_lat'          => 'float',
        'pickup_lng'          => 'float',
        'delivery_lat'        => 'float',
        'delivery_lng'        => 'float',
    ];

    public function customer()  { return $this->belongsTo(User::class, 'customer_id'); }
    public function provider()  { return $this->belongsTo(HomeProvider::class, 'provider_id'); }
    public function items()     { return $this->hasMany(HomeOrderItem::class, 'order_id'); }

    public static function generateNumber(): string
    {
        return 'HO-' . strtoupper(substr(uniqid(), -6)) . '-' . date('ymd');
    }

    public function canCancel(): bool
    {
        return in_array($this->status, ['pending', 'confirmed']);
    }
}
