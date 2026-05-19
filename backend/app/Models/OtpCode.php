<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class OtpCode extends Model
{
    protected $fillable = ['phone', 'code', 'type', 'expired_at', 'used_at'];

    protected function casts(): array
    {
        return [
            'expired_at' => 'datetime',
            'used_at'    => 'datetime',
        ];
    }

    public function isExpired(): bool
    {
        return $this->expired_at->isPast();
    }

    public function isUsed(): bool
    {
        return $this->used_at !== null;
    }
}
