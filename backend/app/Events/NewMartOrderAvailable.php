<?php

namespace App\Events;

use App\Models\MartOrder;
use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class NewMartOrderAvailable implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(public readonly MartOrder $order) {}

    public function broadcastOn(): array
    {
        return [
            new Channel('mitra.motor'),
            new Channel('mitra.mobil'),
        ];
    }

    public function broadcastAs(): string { return 'mart.order.new'; }

    public function broadcastWith(): array
    {
        return [
            'id'           => $this->order->id,
            'order_number' => $this->order->order_number,
            'seller_name'  => $this->order->seller_name_snapshot ?? $this->order->seller?->name,
            'seller_lat'   => $this->order->seller_lat,
            'seller_lng'   => $this->order->seller_lng,
            'shipping_fee' => $this->order->shipping_fee,
            'payment_method'=> $this->order->payment_method,
            'module'       => 'zasamart',
        ];
    }
}
