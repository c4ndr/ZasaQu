<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class HomeProvider extends Model
{
    protected $fillable = [
        'user_id', 'name', 'slug', 'description', 'category',
        'address', 'lat', 'lng', 'phone',
        'logo_path', 'banner_path',
        'open_time', 'close_time', 'is_open',
        'average_rating', 'total_ratings', 'status',
    ];

    protected $casts = [
        'is_open'        => 'boolean',
        'lat'            => 'float',
        'lng'            => 'float',
        'average_rating' => 'float',
    ];

    public function user()      { return $this->belongsTo(User::class); }
    public function services()  { return $this->hasMany(HomeService::class, 'provider_id')->where('is_active', true)->orderBy('name'); }
    public function allServices() { return $this->hasMany(HomeService::class, 'provider_id')->orderBy('name'); }
    public function orders()    { return $this->hasMany(HomeOrder::class, 'provider_id'); }
    public function isActive(): bool { return $this->status === 'active'; }
}
