<?php

namespace App\Events;

use App\Models\Order;
use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class JastipOrderPlaced implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(
        public readonly int   $masterOrderId,
        public readonly Order $jastipOrder,
        public readonly int   $totalJastipCount,
    ) {}

    public function broadcastOn(): array
    {
        return [new Channel("orders.{$this->masterOrderId}")];
    }

    public function broadcastAs(): string
    {
        return 'jastip.order.placed';
    }

    public function broadcastWith(): array
    {
        return [
            'jastip_order_id' => $this->jastipOrder->id,
            'order_number'    => $this->jastipOrder->order_number,
            'pickup_address'  => $this->jastipOrder->pickup_address,
            'dropoff_address' => $this->jastipOrder->dropoff_address,
            'shipping_fee'    => (float) $this->jastipOrder->shipping_fee,
            'total_jastip'    => $this->totalJastipCount,
            'message'         => "Titipan ke-{$this->totalJastipCount} masuk ke paket Anda.",
        ];
    }
}
