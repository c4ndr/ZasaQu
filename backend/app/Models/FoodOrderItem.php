<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class FoodOrderItem extends Model
{
    protected $fillable = [
        'food_order_id', 'menu_item_id',
        'item_name', 'item_price', 'quantity', 'subtotal', 'notes',
    ];

    protected function casts(): array
    {
        return [
            'item_price' => 'integer',
            'quantity'   => 'integer',
            'subtotal'   => 'integer',
        ];
    }

    public function foodOrder() { return $this->belongsTo(FoodOrder::class, 'food_order_id'); }
    public function menuItem()  { return $this->belongsTo(FoodMenuItem::class, 'menu_item_id'); }
}
