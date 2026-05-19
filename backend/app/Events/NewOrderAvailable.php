<?php

namespace App\Events;

use App\Models\Order;
use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class NewOrderAvailable implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(public readonly Order $order) {}

    public function broadcastOn(): array
    {
        // Channel sesuai tipe kendaraan — semua mitra tipe itu menerima
        return [new Channel("mitra.{$this->order->vehicle_type}")];
    }

    public function broadcastAs(): string { return 'order.new'; }

    public function broadcastWith(): array
    {
        return [
            'id'              => $this->order->id,
            'order_number'    => $this->order->order_number,
            'pickup_address'  => $this->order->pickup_address,
            'dropoff_address' => $this->order->dropoff_address,
            'shipping_fee'    => $this->order->shipping_fee,
            'item_description'=> $this->order->item_description,
            'vehicle_type'    => $this->order->vehicle_type,
            'payment_method'  => $this->order->payment_method,
            'require_photo'   => $this->order->require_photo,
        ];
    }
}
