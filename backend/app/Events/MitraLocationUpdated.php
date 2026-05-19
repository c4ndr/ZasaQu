<?php

namespace App\Events;

use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class MitraLocationUpdated implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(
        public readonly int   $orderId,
        public readonly int   $mitraId,
        public readonly float $lat,
        public readonly float $lng,
        public readonly int   $timestamp,
    ) {}

    public function broadcastOn(): array
    {
        return [new Channel("orders.{$this->orderId}")];
    }

    public function broadcastAs(): string
    {
        return 'mitra.location';
    }

    public function broadcastWith(): array
    {
        return [
            'mitra_id'  => $this->mitraId,
            'lat'       => $this->lat,
            'lng'       => $this->lng,
            'timestamp' => $this->timestamp,
        ];
    }
}
