<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class MartCategory extends Model
{
    protected $fillable = ['name', 'slug', 'icon', 'sort_order', 'is_active'];

    protected $casts = ['is_active' => 'boolean'];

    public function products() { return $this->hasMany(MartProduct::class, 'category_id'); }
}
