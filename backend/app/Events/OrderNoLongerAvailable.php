<?php

namespace App\Events;

use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class OrderNoLongerAvailable implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(
        public readonly int    $orderId,
        public readonly string $vehicleType,
    ) {}

    public function broadcastOn(): array
    {
        return [new Channel("mitra.{$this->vehicleType}")];
    }

    public function broadcastAs(): string { return 'order.taken'; }

    public function broadcastWith(): array
    {
        return ['order_id' => $this->orderId];
    }
}
