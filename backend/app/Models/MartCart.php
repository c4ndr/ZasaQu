<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class MartCart extends Model
{
    protected $fillable = ['user_id', 'product_id', 'seller_id', 'quantity', 'notes'];

    public function product() { return $this->belongsTo(MartProduct::class, 'product_id'); }
    public function seller()  { return $this->belongsTo(MartSeller::class, 'seller_id'); }
}
