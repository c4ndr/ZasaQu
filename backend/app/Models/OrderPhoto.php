<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
class OrderPhoto extends Model
{
    protected $fillable = ['order_id','stage','image_path','taken_at'];
    protected function casts(): array { return ['taken_at'=>'datetime']; }
    public function order() { return $this->belongsTo(Order::class); }
}
