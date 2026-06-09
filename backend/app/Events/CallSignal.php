<?php

namespace App\Events;

use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

/**
 * Sinyal WebRTC (offer / answer / ice-candidate / end) diteruskan via Reverb.
 * Tidak ada penyimpanan DB — hanya relay real-time antar dua pihak.
 */
class CallSignal implements ShouldBroadcastNow
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(
        public readonly string $channelName,
        public readonly string $signalType,  // offer | answer | ice-candidate | end
        public readonly mixed  $data,
        public readonly int    $senderId,
    ) {}

    public function broadcastOn(): array
    {
        return [new PrivateChannel($this->channelName)];
    }

    public function broadcastAs(): string
    {
        return 'call.signal';
    }

    public function broadcastWith(): array
    {
        return [
            'signal_type' => $this->signalType,
            'data'        => $this->data,
            'sender_id'   => $this->senderId,
        ];
    }
}
