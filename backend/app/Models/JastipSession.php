<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
class JastipSession extends Model
{
    protected $fillable = [
        'mitra_id','master_order_id','status','vehicle_type',
        'origin_lat','origin_lng','destination_lat','destination_lng',
        'route_polyline','corridor_width','max_jastip','jastip_count',
        'total_jastip_fee','closed_reason','closed_at',
    ];
    protected function casts(): array {
        return ['route_polyline'=>'array','total_jastip_fee'=>'decimal:2','closed_at'=>'datetime'];
    }
    public function mitra()       { return $this->belongsTo(User::class,'mitra_id'); }
    public function masterOrder() { return $this->belongsTo(Order::class,'master_order_id'); }
    public function jastipOrders(){ return $this->hasMany(Order::class,'jastip_session_id'); }
    public function isActive(): bool    { return $this->status==='active'; }
    public function isFull(): bool      { return $this->jastip_count>=$this->max_jastip; }
    public function hasCapacity(): bool { return $this->jastip_count<$this->max_jastip; }
}
