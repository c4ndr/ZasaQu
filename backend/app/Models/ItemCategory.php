<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
class ItemCategory extends Model
{
    protected $fillable = ['name','slug','allowed_vehicle','requires_special_permit','is_allowed','requires_disclaimer','is_active'];
    protected function casts(): array {
        return ['requires_special_permit'=>'boolean','is_allowed'=>'boolean','requires_disclaimer'=>'boolean','is_active'=>'boolean'];
    }
    public function scopeActive($query) { return $query->where('is_active',true)->where('is_allowed',true); }
    public function scopeForVehicle($query, string $vehicleType) {
        return $query->where(fn($q)=>$q->where('allowed_vehicle','all')->orWhere('allowed_vehicle',$vehicleType==='mobil'?'mobil_only':'all'));
    }
}
