<?php

namespace App\Events;

use App\Models\FoodOrder;
use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class NewFoodOrderAvailable implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(public readonly FoodOrder $order) {}

    public function broadcastOn(): array
    {
        return [
            new Channel('mitra.motor'),
            new Channel('mitra.mobil'),
        ];
    }

    public function broadcastAs(): string { return 'food.order.new'; }

    public function broadcastWith(): array
    {
        return [
            'id'            => $this->order->id,
            'order_number'  => $this->order->order_number,
            'merchant_name' => $this->order->merchant?->name,
            'merchant_lat'  => $this->order->merchant?->lat,
            'merchant_lng'  => $this->order->merchant?->lng,
            'total_amount'  => $this->order->total_amount,
            'payment_method'=> $this->order->payment_method,
        ];
    }
}
