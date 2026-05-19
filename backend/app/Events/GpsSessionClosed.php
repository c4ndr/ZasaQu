<?php

namespace App\Events;

use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class GpsSessionClosed implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(
        public readonly int    $orderId,
        public readonly int    $sessionId,
        public readonly string $reason,
    ) {}

    public function broadcastOn(): array
    {
        return [new Channel("orders.{$this->orderId}")];
    }

    public function broadcastAs(): string
    {
        return 'jastip.session.closed';
    }

    public function broadcastWith(): array
    {
        return [
            'session_id' => $this->sessionId,
            'reason'     => $this->reason,
            'message'    => $this->reason === 'gps_lost'
                ? 'GPS mitra terputus. Sesi JastipQu ditutup otomatis. Order master tetap berjalan.'
                : 'Mitra menutup sesi JastipQu.',
        ];
    }
}
