<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class MartOrder extends Model
{
    protected $fillable = [
        'order_number', 'customer_id', 'seller_id', 'mitra_id', 'status',
        'seller_name_snapshot', 'seller_address_snapshot', 'seller_lat', 'seller_lng',
        'delivery_name', 'delivery_address', 'delivery_lat', 'delivery_lng', 'delivery_phone',
        'notes', 'cancel_reason',
        'subtotal', 'shipping_fee', 'total',
        'commission_rate', 'platform_commission', 'seller_income',
        'packed_at', 'picked_up_at', 'delivered_at', 'completed_at', 'cancelled_at',
    ];

    protected $casts = [
        'seller_lat'   => 'float',
        'seller_lng'   => 'float',
        'delivery_lat' => 'float',
        'delivery_lng' => 'float',
        'packed_at'    => 'datetime',
        'picked_up_at' => 'datetime',
        'delivered_at' => 'datetime',
        'completed_at' => 'datetime',
        'cancelled_at' => 'datetime',
    ];

    public function customer() { return $this->belongsTo(User::class, 'customer_id'); }
    public function seller()   { return $this->belongsTo(MartSeller::class, 'seller_id'); }
    public function mitra()    { return $this->belongsTo(User::class, 'mitra_id'); }
    public function items()    { return $this->hasMany(MartOrderItem::class, 'order_id'); }
    public function reviews()  { return $this->hasMany(MartReview::class, 'order_id'); }

    public function canCancel(): bool
    {
        return in_array($this->status, ['pending', 'confirmed']);
    }

    public static function generateNumber(): string
    {
        return 'ZM-' . strtoupper(substr(uniqid(), -6)) . '-' . date('ymd');
    }
}
