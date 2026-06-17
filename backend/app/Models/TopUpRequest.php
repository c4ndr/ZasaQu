<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class TopUpRequest extends Model
{
    protected $fillable = [
        'user_id', 'amount', 'method', 'status',
        'proof_image', 'bank_account_id', 'confirmed_by', 'confirmed_at', 'notes',
        'midtrans_order_id',
        'ipaymu_session_id', 'ipaymu_trx_id', 'ipaymu_reference_id',
        'ipaymu_channel', 'ipaymu_va_number', 'ipaymu_expired_at',
    ];

    // Sembunyikan field yang bisa dimanfaatkan untuk memalsukan callback iPaymu
    protected $hidden = [
        'ipaymu_session_id',
        'ipaymu_trx_id',
        'ipaymu_reference_id',
    ];

    protected function casts(): array
    {
        return [
            'amount'             => 'decimal:2',
            'confirmed_at'       => 'datetime',
            'ipaymu_expired_at'  => 'datetime',
        ];
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function bankAccount()
    {
        return $this->belongsTo(BankAccount::class);
    }

    public function confirmedBy()
    {
        return $this->belongsTo(User::class, 'confirmed_by');
    }

    public function virtualAccount()
    {
        return $this->hasOne(VirtualAccount::class);
    }

    public function qrisTransaction()
    {
        return $this->hasOne(QrisTransaction::class);
    }
}
