<?php

namespace App\Events;

use App\Models\RideOrder;
use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class RideOrderPlaced implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(public readonly RideOrder $order) {}

    public function broadcastOn(): array
    {
        return [
            new Channel('ride.available'),
            // Channel terpusat — dipakai sistem notif global (sama seperti ZasaGo/ZasaFood)
            new Channel("mitra.{$this->order->vehicle_type}"),
        ];
    }

    public function broadcastAs(): string { return 'ride.placed'; }

    public function broadcastWith(): array
    {
        return [
            'id'               => $this->order->id,
            'order_number'     => $this->order->order_number,
            'vehicle_type'     => $this->order->vehicle_type,
            'pickup_address'   => $this->order->pickup_address,
            'pickup_lat'       => $this->order->pickup_lat,
            'pickup_lng'       => $this->order->pickup_lng,
            'destination_address' => $this->order->destination_address,
            'distance_km'      => $this->order->distance_km,
            'fare'             => $this->order->fare,
            'mitra_income'     => $this->order->mitra_income,
            'payment_method'   => $this->order->payment_method,
            'notes'            => $this->order->notes,
        ];
    }
}
