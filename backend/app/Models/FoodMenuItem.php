<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class FoodMenuItem extends Model
{
    protected $fillable = [
        'merchant_id', 'category_id', 'name', 'description',
        'price', 'photo_path', 'is_available', 'stock', 'sort_order',
    ];

    protected function casts(): array
    {
        return [
            'price'        => 'integer',
            'stock'        => 'integer',
            'is_available' => 'boolean',
        ];
    }

    public function merchant()  { return $this->belongsTo(FoodMerchant::class, 'merchant_id'); }
    public function category()  { return $this->belongsTo(FoodMenuCategory::class, 'category_id'); }
    public function orderItems(){ return $this->hasMany(FoodOrderItem::class, 'menu_item_id'); }
}
