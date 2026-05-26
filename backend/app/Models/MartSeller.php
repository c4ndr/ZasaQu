<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class MartSeller extends Model
{
    protected $fillable = [
        'user_id', 'name', 'slug', 'description',
        'address', 'lat', 'lng', 'phone',
        'logo_path', 'banner_path', 'is_open',
        'average_rating', 'total_ratings', 'status',
    ];

    protected $casts = [
        'is_open'        => 'boolean',
        'lat'            => 'float',
        'lng'            => 'float',
        'average_rating' => 'float',
    ];

    public function user()        { return $this->belongsTo(User::class); }
    public function products()    { return $this->hasMany(MartProduct::class, 'seller_id')->where('is_active', true); }
    public function allProducts() { return $this->hasMany(MartProduct::class, 'seller_id'); }
    public function orders()      { return $this->hasMany(MartOrder::class, 'seller_id'); }

    public function isActive(): bool { return $this->status === 'active'; }
}
