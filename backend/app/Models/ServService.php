<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ServService extends Model
{
    protected $fillable = [
        'provider_id', 'name', 'description', 'unit', 'price',
        'min_order', 'estimated_hours', 'is_active',
    ];

    protected $casts = [
        'is_active'       => 'boolean',
        'min_order'       => 'float',
        'estimated_hours' => 'integer',
    ];

    public function provider() { return $this->belongsTo(ServProvider::class, 'provider_id'); }
}
