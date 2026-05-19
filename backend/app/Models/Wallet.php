<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Wallet extends Model
{
    protected $fillable = ['user_id', 'balance', 'locked_balance'];

    protected function casts(): array
    {
        return [
            'balance'        => 'decimal:2',
            'locked_balance' => 'decimal:2',
        ];
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function transactions()
    {
        return $this->hasMany(WalletTransaction::class);
    }

    public function availableBalance(): float
    {
        return (float) $this->balance - (float) $this->locked_balance;
    }
}
