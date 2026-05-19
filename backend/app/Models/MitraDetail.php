<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class MitraDetail extends Model
{
    protected $fillable = [
        'user_id',
        'vehicle_plate',
        'vehicle_brand',
        'vehicle_year',
        'mode',
        'badge',
        'total_transactions',
        'average_rating',
        'is_online',
        'last_seen_at',
    ];

    protected function casts(): array
    {
        return [
            'is_online'    => 'boolean',
            'last_seen_at' => 'datetime',
        ];
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
