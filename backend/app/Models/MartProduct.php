<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class MartProduct extends Model
{
    protected $fillable = [
        'seller_id', 'category_id', 'name', 'slug', 'description',
        'price', 'compare_price', 'stock', 'weight',
        'images', 'is_active', 'total_sold',
        'average_rating', 'total_ratings',
    ];

    protected $casts = [
        'images'         => 'array',
        'is_active'      => 'boolean',
        'price'          => 'integer',
        'compare_price'  => 'integer',
        'average_rating' => 'float',
    ];

    public function seller()   { return $this->belongsTo(MartSeller::class, 'seller_id'); }
    public function category() { return $this->belongsTo(MartCategory::class, 'category_id'); }
    public function reviews()  { return $this->hasMany(MartReview::class, 'product_id'); }
}
