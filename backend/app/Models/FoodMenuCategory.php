<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class FoodMenuCategory extends Model
{
    protected $fillable = ['merchant_id', 'name', 'sort_order', 'is_active'];

    protected function casts(): array
    {
        return ['is_active' => 'boolean'];
    }

    public function merchant() { return $this->belongsTo(FoodMerchant::class, 'merchant_id'); }
    public function items()    { return $this->hasMany(FoodMenuItem::class, 'category_id')->orderBy('sort_order'); }
}
