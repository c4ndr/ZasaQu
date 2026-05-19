<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

class FoodMerchant extends Model
{
    protected $fillable = [
        'user_id', 'name', 'slug', 'description', 'category',
        'address', 'lat', 'lng', 'phone',
        'logo_path', 'banner_path',
        'is_open', 'open_time', 'close_time',
        'avg_prep_time_minutes',
        'average_rating', 'total_ratings',
        'status',
    ];

    protected function casts(): array
    {
        return [
            'lat'             => 'float',
            'lng'             => 'float',
            'is_open'         => 'boolean',
            'average_rating'  => 'float',
            'total_ratings'   => 'integer',
        ];
    }

    public function user()        { return $this->belongsTo(User::class); }
    public function categories()  { return $this->hasMany(FoodMenuCategory::class, 'merchant_id')->orderBy('sort_order'); }
    public function menuItems()   { return $this->hasMany(FoodMenuItem::class, 'merchant_id'); }
    public function foodOrders()  { return $this->hasMany(FoodOrder::class, 'merchant_id'); }

    public function isActive(): bool   { return $this->status === 'active'; }
    public function isPending(): bool  { return $this->status === 'pending'; }

    protected static function booted(): void
    {
        static::creating(function (self $merchant) {
            if (empty($merchant->slug)) {
                $merchant->slug = Str::slug($merchant->name) . '-' . Str::random(6);
            }
        });
    }
}
