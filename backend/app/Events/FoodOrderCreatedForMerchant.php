<?php

namespace App\Events;

use App\Models\FoodOrder;
use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class FoodOrderCreatedForMerchant implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public readonly int $merchantUserId;

    public function __construct(public readonly FoodOrder $order)
    {
        $this->merchantUserId = $order->merchant->user_id;
    }

    public function broadcastOn(): array
    {
        return [new Channel("App.Models.User.{$this->merchantUserId}")];
    }

    public function broadcastAs(): string { return 'food.order.created'; }

    public function broadcastWith(): array
    {
        return [
            'id'           => $this->order->id,
            'order_number' => $this->order->order_number,
            'total_amount' => $this->order->total_amount,
            'items_count'  => $this->order->items?->count() ?? 0,
        ];
    }
}
