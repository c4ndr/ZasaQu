<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class AdminSetting extends Model
{
    protected $fillable = ['key', 'value', 'type', 'label', 'description', 'updated_by'];

    public function updatedBy()
    {
        return $this->belongsTo(User::class, 'updated_by');
    }

    public static function valueOf(string $key, mixed $default = null): mixed
    {
        $setting = static::where('key', $key)->first();
        return $setting ? $setting->value : $default;
    }
}
