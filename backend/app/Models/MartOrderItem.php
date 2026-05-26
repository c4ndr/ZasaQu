<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class MartOrderItem extends Model
{
    protected $fillable = [
        'order_id', 'product_id', 'product_name', 'product_image',
        'price', 'quantity', 'subtotal', 'notes',
    ];

    protected $casts = ['price' => 'integer', 'subtotal' => 'integer'];

    public function order()   { return $this->belongsTo(MartOrder::class, 'order_id'); }
    public function product() { return $this->belongsTo(MartProduct::class, 'product_id'); }
    public function review()  { return $this->hasOne(MartReview::class, 'order_item_id'); }
}
