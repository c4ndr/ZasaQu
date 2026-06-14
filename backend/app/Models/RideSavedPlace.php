<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class RideSavedPlace extends Model
{
    protected $fillable = ['user_id', 'name', 'emoji', 'address', 'lat', 'lng', 'sort_order'];

    protected function casts(): array
    {
        return ['lat' => 'decimal:7', 'lng' => 'decimal:7'];
    }

    public function user() { return $this->belongsTo(User::class); }
}
