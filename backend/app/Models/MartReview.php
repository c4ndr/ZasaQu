<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class MartReview extends Model
{
    protected $fillable = [
        'order_id', 'order_item_id', 'customer_id',
        'seller_id', 'product_id', 'rating', 'comment',
    ];

    public function customer()  { return $this->belongsTo(User::class, 'customer_id'); }
    public function product()   { return $this->belongsTo(MartProduct::class, 'product_id'); }
    public function orderItem() { return $this->belongsTo(MartOrderItem::class, 'order_item_id'); }
}
