<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class WithdrawRequest extends Model
{
    protected $fillable = [
        'user_id', 'amount', 'destination_type', 'destination_number',
        'destination_name', 'bank_name', 'status', 'processed_by', 'processed_at', 'notes',
    ];

    protected function casts(): array
    {
        return [
            'amount'       => 'decimal:2',
            'processed_at' => 'datetime',
        ];
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function processedBy()
    {
        return $this->belongsTo(User::class, 'processed_by');
    }
}
