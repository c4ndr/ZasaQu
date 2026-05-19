<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class VirtualAccount extends Model
{
    protected $fillable = [
        'top_up_request_id', 'user_id', 'va_number', 'bank_name', 'amount', 'expired_at', 'status', 'paid_at',
    ];

    protected function casts(): array
    {
        return [
            'amount'     => 'decimal:2',
            'expired_at' => 'datetime',
            'paid_at'    => 'datetime',
        ];
    }

    public function topUpRequest()
    {
        return $this->belongsTo(TopUpRequest::class);
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
