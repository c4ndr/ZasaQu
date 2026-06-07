<?php

namespace App\Events;

use App\Models\MartOrder;
use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class MartOrderCreatedForSeller implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public readonly int $sellerUserId;

    public function __construct(public readonly MartOrder $order)
    {
        $this->sellerUserId = $order->seller->user_id;
    }

    public function broadcastOn(): array
    {
        return [new Channel("App.Models.User.{$this->sellerUserId}")];
    }

    public function broadcastAs(): string { return 'mart.order.created'; }

    public function broadcastWith(): array
    {
        return [
            'id'           => $this->order->id,
            'order_number' => $this->order->order_number,
            'total'        => $this->order->total,
            'items_count'  => $this->order->items?->count() ?? 0,
        ];
    }
}
