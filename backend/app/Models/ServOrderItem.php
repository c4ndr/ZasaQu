<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ServOrderItem extends Model
{
    protected $fillable = [
        'order_id', 'service_id', 'service_name', 'unit',
        'quantity', 'price', 'subtotal', 'notes',
    ];

    protected $casts = [
        'quantity' => 'float',
    ];

    public function order()   { return $this->belongsTo(ServOrder::class, 'order_id'); }
    public function service() { return $this->belongsTo(ServService::class, 'service_id'); }
}
