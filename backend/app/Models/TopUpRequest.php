<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class TopUpRequest extends Model
{
    protected $fillable = [
        'user_id', 'amount', 'method', 'status',
        'proof_image', 'bank_account_id', 'confirmed_by', 'confirmed_at', 'notes',
    ];

    protected function casts(): array
    {
        return [
            'amount'       => 'decimal:2',
            'confirmed_at' => 'datetime',
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
