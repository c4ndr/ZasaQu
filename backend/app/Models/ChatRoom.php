<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ChatRoom extends Model
{
    protected $fillable = ['order_id', 'violation_count', 'is_suspended', 'suspended_at'];

    protected function casts(): array
    {
        return ['is_suspended' => 'boolean', 'suspended_at' => 'datetime'];
    }

    public function order()    { return $this->belongsTo(Order::class); }
    public function messages() { return $this->hasMany(ChatMessage::class, 'room_id')->orderBy('created_at'); }

    public function isSuspended(): bool { return $this->is_suspended; }
}
