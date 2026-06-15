<?php

namespace App\Events;

use App\Models\ChatMessage;
use App\Models\ChatRoom;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class ChatInboxNotification implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(
        public readonly ChatMessage $message,
        public readonly int $recipientId,
        public readonly ChatRoom $room,
    ) {}

    public function broadcastOn(): array
    {
        return [new PrivateChannel("user.{$this->recipientId}")];
    }

    public function broadcastAs(): string
    {
        return 'chat.inbox';
    }

    public function broadcastWith(): array
    {
        return [
            'room_id'    => $this->room->id,
            'order_id'   => $this->room->order_id,
            'order_type' => $this->room->order_type ?? 'zasago',
            'sender_name'=> $this->message->sender?->name,
            'content'    => $this->message->is_blocked ? '' : $this->message->content,
        ];
    }
}
