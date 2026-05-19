<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class FoodOrder extends Model
{
    protected $fillable = [
        'order_number', 'customer_id', 'merchant_id', 'mitra_id',
        'status',
        'subtotal', 'delivery_fee', 'total_amount',
        'commission_rate_food', 'commission_rate_delivery',
        'platform_commission_food', 'platform_commission_delivery',
        'merchant_income', 'mitra_income',
        'delivery_address', 'delivery_lat', 'delivery_lng',
        'payment_method', 'payment_status',
        'estimated_prep_minutes', 'estimated_delivery_minutes',
        'notes',
        'merchant_accepted_at', 'preparing_at', 'ready_at',
        'mitra_assigned_at', 'mitra_on_pickup_at', 'picked_up_at',
        'on_delivery_at', 'delivered_at', 'completed_at',
        'cancelled_at', 'cancellation_reason', 'cancelled_by',
        'rejected_at', 'rejection_reason',
        'cod_confirmed_at',
    ];

    protected function casts(): array
    {
        return [
            'subtotal'                     => 'integer',
            'delivery_fee'                 => 'integer',
            'total_amount'                 => 'integer',
            'commission_rate_food'         => 'float',
            'commission_rate_delivery'     => 'float',
            'platform_commission_food'     => 'integer',
            'platform_commission_delivery' => 'integer',
            'merchant_income'              => 'integer',
            'mitra_income'                 => 'integer',
            'delivery_lat'                 => 'float',
            'delivery_lng'                 => 'float',
            'merchant_accepted_at'         => 'datetime',
            'preparing_at'                 => 'datetime',
            'ready_at'                     => 'datetime',
            'mitra_assigned_at'            => 'datetime',
            'mitra_on_pickup_at'           => 'datetime',
            'picked_up_at'                 => 'datetime',
            'on_delivery_at'               => 'datetime',
            'delivered_at'                 => 'datetime',
            'completed_at'                 => 'datetime',
            'cancelled_at'                 => 'datetime',
            'rejected_at'                  => 'datetime',
            'cod_confirmed_at'             => 'datetime',
        ];
    }

    public function customer()  { return $this->belongsTo(User::class, 'customer_id'); }
    public function merchant()  { return $this->belongsTo(FoodMerchant::class, 'merchant_id'); }
    public function mitra()     { return $this->belongsTo(User::class, 'mitra_id'); }
    public function items()     { return $this->hasMany(FoodOrderItem::class, 'food_order_id'); }
    public function ratings()   { return $this->hasMany(Rating::class, 'food_order_id'); }
    public function chatRoom()  { return $this->hasOne(ChatRoom::class, 'order_id')->where('service_module', 'zasafood'); }

    public function isCompleted(): bool { return $this->status === 'completed'; }
    public function isCancelled(): bool { return $this->status === 'cancelled'; }
    public function isRejected(): bool  { return $this->status === 'rejected'; }
    public function isActive(): bool
    {
        return !in_array($this->status, ['completed', 'cancelled', 'rejected']);
    }
}
