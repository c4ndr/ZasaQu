<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class QrisTransaction extends Model
{
    protected $fillable = [
        'top_up_request_id', 'user_id', 'qris_code', 'qris_image_url',
        'amount', 'expired_at', 'status', 'paid_at', 'payment_reference',
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
