<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ServOrder extends Model
{
    protected $fillable = [
        'order_number', 'customer_id', 'provider_id', 'mitra_id', 'status',
        'address', 'lat', 'lng', 'notes', 'scheduled_at',
        'total_price', 'commission_rate', 'platform_commission', 'provider_income', 'mitra_income',
        'cancel_reason', 'confirmed_at', 'traveling_at', 'in_progress_at', 'completed_at', 'settled_at', 'accepted_at',
        'provider_score', 'provider_comment', 'rated_at',
    ];

    protected $casts = [
        'rated_at'       => 'datetime',
        'scheduled_at'   => 'datetime',
        'confirmed_at'   => 'datetime',
        'traveling_at'   => 'datetime',
        'in_progress_at' => 'datetime',
        'completed_at'   => 'datetime',
        'settled_at'     => 'datetime',
        'lat'            => 'float',
        'lng'            => 'float',
    ];

    public function customer() { return $this->belongsTo(User::class, 'customer_id'); }
    public function provider() { return $this->belongsTo(ServProvider::class, 'provider_id'); }
    public function mitra()    { return $this->belongsTo(User::class, 'mitra_id'); }
    public function items()    { return $this->hasMany(ServOrderItem::class, 'order_id'); }

    public static function generateNumber(): string
    {
        return 'SV-' . strtoupper(substr(uniqid(), -6)) . '-' . date('ymd');
    }

    public function canCancel(): bool
    {
        return in_array($this->status, ['pending', 'confirmed']);
    }
}
