<?php

namespace App\Events;

use App\Models\RideOrder;
use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class RideStatusUpdated implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(
        public readonly RideOrder $order,
        public readonly string    $prevStatus,
    ) {}

    public function broadcastOn(): array
    {
        return [new Channel("ride.orders.{$this->order->id}")];
    }

    public function broadcastAs(): string { return 'ride.status.updated'; }

    public function broadcastWith(): array
    {
        return [
            'order_id'         => $this->order->id,
            'status'           => $this->order->status,
            'prev_status'      => $this->prevStatus,
            'proof_photo_path' => $this->order->proof_photo_path,
            'message'          => $this->statusMessage(),
            'emoji'            => $this->statusEmoji(),
            'mitra'            => $this->order->mitra ? [
                'id'   => $this->order->mitra->id,
                'name' => $this->order->mitra->name,
            ] : null,
        ];
    }

    private function statusMessage(): string
    {
        return match ($this->order->status) {
            'accepted'   => 'Mitra sedang menuju lokasi penjemputan Anda.',
            'on_pickup'  => 'Mitra sudah tiba di lokasi penjemputan.',
            'on_ride'    => 'Perjalanan dimulai! Selamat menikmati.',
            'completed'  => 'Perjalanan selesai. Terima kasih telah menggunakan ZasaRide!',
            'cancelled'  => 'Perjalanan dibatalkan.',
            default      => 'Status perjalanan diperbarui.',
        };
    }

    private function statusEmoji(): string
    {
        return match ($this->order->status) {
            'accepted'   => '✅',
            'on_pickup'  => '📍',
            'on_ride'    => '🚗',
            'completed'  => '🎉',
            'cancelled'  => '❌',
            default      => '📋',
        };
    }
}
