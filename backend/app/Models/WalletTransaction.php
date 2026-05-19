<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class WalletTransaction extends Model
{
    protected $fillable = [
        'wallet_id', 'service_module', 'type', 'amount', 'balance_before', 'balance_after',
        'description', 'reference_type', 'reference_id', 'status',
    ];

    protected function casts(): array
    {
        return [
            'amount'         => 'decimal:2',
            'balance_before' => 'decimal:2',
            'balance_after'  => 'decimal:2',
        ];
    }

    public function wallet()
    {
        return $this->belongsTo(Wallet::class);
    }

    public function reference()
    {
        return $this->morphTo();
    }
}
