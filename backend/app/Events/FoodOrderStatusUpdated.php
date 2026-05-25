<?php

namespace App\Events;

use App\Models\FoodOrder;
use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class FoodOrderStatusUpdated implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(
        public readonly FoodOrder $order,
        public readonly string    $prevStatus,
    ) {}

    public function broadcastOn(): array
    {
        return [new Channel("food.{$this->order->id}")];
    }

    public function broadcastAs(): string
    {
        return 'food.order.status';
    }

    public function broadcastWith(): array
    {
        return [
            'id'                       => $this->order->id,
            'status'                   => $this->order->status,
            'prev_status'              => $this->prevStatus,
            'estimated_prep_minutes'   => $this->order->estimated_prep_minutes,
            'mitra_id'                 => $this->order->mitra_id,
        ];
    }
}
