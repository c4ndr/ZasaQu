<?php

namespace App\Events;

use App\Models\Order;
use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class OrderStatusUpdated implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(
        public readonly Order  $order,
        public readonly string $prevStatus,
    ) {}

    public function broadcastOn(): array
    {
        return [new Channel("orders.{$this->order->id}")];
    }

    public function broadcastAs(): string
    {
        return 'order.status.updated';
    }

    public function broadcastWith(): array
    {
        return [
            'order_id'    => $this->order->id,
            'status'      => $this->order->status,
            'prev_status' => $this->prevStatus,
            'message'     => $this->statusMessage(),
            'emoji'       => $this->statusEmoji(),
        ];
    }

    private function statusMessage(): string
    {
        return match ($this->order->status) {
            'accepted'    => 'Mitra sudah menerima order Anda dan akan segera menjemput.',
            'on_pickup'   => 'Mitra sedang dalam perjalanan ke lokasi pickup.',
            'picked_up'   => 'Barang sudah diambil dan sedang dikemas.',
            'on_delivery' => 'Barang dalam perjalanan menuju tujuan! 🚀',
            'delivered'   => 'Barang sudah sampai di tujuan!',
            'completed'   => 'Order selesai. Terima kasih telah menggunakan ZasaQu!',
            'cancelled'   => 'Order dibatalkan.',
            default       => 'Status order diperbarui.',
        };
    }

    private function statusEmoji(): string
    {
        return match ($this->order->status) {
            'accepted'    => '✅',
            'on_pickup'   => '🚗',
            'picked_up'   => '📦',
            'on_delivery' => '🚀',
            'delivered'   => '🏁',
            'completed'   => '🎉',
            'cancelled'   => '❌',
            default       => '📋',
        };
    }
}
