<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
class Order extends Model
{
    protected $fillable = [
        'order_number','customer_id','mitra_id','jastip_session_id','item_category_id',
        'type','status','is_jastip_enabled','require_photo',
        'pickup_address','pickup_lat','pickup_lng',
        'dropoff_address','dropoff_lat','dropoff_lng',
        'item_description','item_value','vehicle_type','requires_disclaimer',
        'shipping_fee','rate_base_fee','rate_per_km','commission_rate',
        'platform_commission','mitra_income','jastip_discount_applied',
        'payment_method','payment_status','cod_confirmed_at',
        'accepted_at','on_pickup_at','picked_up_at','on_delivery_at','delivered_at','completed_at',
        'cancelled_at','cancel_reason','notes',
    ];
    protected function casts(): array {
        return [
            'is_jastip_enabled'=>'boolean','requires_disclaimer'=>'boolean','require_photo'=>'boolean',
            'shipping_fee'=>'decimal:2','rate_base_fee'=>'decimal:2',
            'rate_per_km'=>'decimal:2','commission_rate'=>'decimal:2',
            'platform_commission'=>'decimal:2',
            'mitra_income'=>'decimal:2','jastip_discount_applied'=>'decimal:2',
            'item_value'=>'decimal:2','accepted_at'=>'datetime',
            'on_pickup_at'=>'datetime','picked_up_at'=>'datetime',
            'on_delivery_at'=>'datetime','delivered_at'=>'datetime',
            'completed_at'=>'datetime','cancelled_at'=>'datetime','cod_confirmed_at'=>'datetime',
        ];
    }
    public function customer() { return $this->belongsTo(User::class,'customer_id'); }
    public function mitra()    { return $this->belongsTo(User::class,'mitra_id'); }
    public function jastipSession() { return $this->belongsTo(JastipSession::class); }
    public function itemCategory()  { return $this->belongsTo(ItemCategory::class); }
    public function photos()        { return $this->hasMany(OrderPhoto::class); }
    public function ratings()       { return $this->hasMany(Rating::class); }
    public function isCompleted(): bool { return $this->status==='completed'; }
    public function isCancelled(): bool { return $this->status==='cancelled'; }
    public function isJastip(): bool    { return $this->type==='jastip'; }
    public function isMaster(): bool    { return $this->type==='master'; }
    public function hasAllPhotos(): bool { return $this->photos()->count()>=3; }
}
