<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ChatMessage extends Model
{
    protected $fillable = ['room_id', 'sender_id', 'content', 'type', 'is_blocked', 'blocked_reason'];

    protected function casts(): array
    {
        return ['is_blocked' => 'boolean'];
    }

    public function room()   { return $this->belongsTo(ChatRoom::class); }
    public function sender() { return $this->belongsTo(User::class, 'sender_id'); }
}
