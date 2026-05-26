<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class HomeOrderItem extends Model
{
    protected $fillable = [
        'order_id', 'service_id', 'service_name', 'unit', 'quantity', 'price', 'subtotal',
    ];

    protected $casts = [
        'quantity' => 'float',
    ];

    public function service() { return $this->belongsTo(HomeService::class, 'service_id'); }
    public function order()   { return $this->belongsTo(HomeOrder::class, 'order_id'); }
}
