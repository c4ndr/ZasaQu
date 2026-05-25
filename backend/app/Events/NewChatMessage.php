<?php

namespace App\Events;

use App\Models\ChatMessage;
use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class NewChatMessage implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(public readonly ChatMessage $message) {}

    public function broadcastOn(): array
    {
        return [new PrivateChannel("chat.{$this->message->room_id}")];
    }

    public function broadcastAs(): string
    {
        return 'message.new';
    }

    public function broadcastWith(): array
    {
        return [
            'id'         => $this->message->id,
            'room_id'    => $this->message->room_id,
            'sender_id'  => $this->message->sender_id,
            'sender_name'=> $this->message->sender?->name,
            'content'    => $this->message->is_blocked ? '[Pesan diblokir]' : $this->message->content,
            'type'       => $this->message->type,
            'is_blocked' => $this->message->is_blocked,
            'created_at' => $this->message->created_at->toISOString(),
        ];
    }
}
