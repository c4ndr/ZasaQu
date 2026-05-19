<?php

namespace App\Services;

use App\Models\Notification;
use App\Models\User;

class NotificationService
{
    public function send(User $user, string $type, string $title, string $body, array $data = []): Notification
    {
        return Notification::create([
            'user_id' => $user->id,
            'type'    => $type,
            'title'   => $title,
            'body'    => $body,
            'data'    => $data,
        ]);
    }

    public function markRead(User $user, ?int $notifId = null): void
    {
        $query = Notification::where('user_id', $user->id)->whereNull('read_at');

        if ($notifId) {
            $query->where('id', $notifId);
        }

        $query->update(['read_at' => now()]);
    }

    public function unreadCount(User $user): int
    {
        return Notification::where('user_id', $user->id)->whereNull('read_at')->count();
    }

    // ─── Helper shortcut per event ────────────────────────────────────────────

    public function orderAccepted(User $customer, string $orderNumber): void
    {
        $this->send($customer, 'order_accepted',
            'Order Diterima!',
            "Mitra sudah menerima order #{$orderNumber} dan segera menuju lokasi pickup.",
            ['order_number' => $orderNumber]
        );
    }

    public function orderOnPickup(User $customer, string $orderNumber): void
    {
        $this->send($customer, 'order_on_pickup',
            'Mitra Menuju Pickup',
            "Mitra sedang dalam perjalanan menuju lokasi pickup order #{$orderNumber}.",
            ['order_number' => $orderNumber]
        );
    }

    public function orderPickedUp(User $customer, string $orderNumber): void
    {
        $this->send($customer, 'order_picked_up',
            'Barang Diambil',
            "Mitra sudah mengambil barang untuk order #{$orderNumber}.",
            ['order_number' => $orderNumber]
        );
    }

    public function orderOnDelivery(User $customer, string $orderNumber): void
    {
        $this->send($customer, 'order_on_delivery',
            'Barang Dalam Perjalanan',
            "Order #{$orderNumber} sedang dalam perjalanan ke lokasi Anda.",
            ['order_number' => $orderNumber]
        );
    }

    public function orderDelivered(User $customer, string $orderNumber): void
    {
        $this->send($customer, 'order_delivered',
            'Barang Terkirim!',
            "Order #{$orderNumber} sudah sampai tujuan. Konfirmasi penerimaan dalam 2 jam.",
            ['order_number' => $orderNumber]
        );
    }

    public function orderCompleted(User $customer, User $mitra, string $orderNumber): void
    {
        $this->send($customer, 'rating_request',
            'Beri Rating Mitra',
            "Order #{$orderNumber} selesai. Bagaimana pengalaman Anda?",
            ['order_number' => $orderNumber, 'action' => 'rate']
        );

        $this->send($mitra, 'order_completed',
            'Order Selesai',
            "Order #{$orderNumber} dikonfirmasi selesai. Pendapatan sudah masuk ke dompet Anda.",
            ['order_number' => $orderNumber]
        );
    }

    public function jastipOrderReceived(User $customer, string $orderNumber): void
    {
        $this->send($customer, 'jastip_accepted',
            'Titipan Diterima',
            "Mitra menerima titipan Anda untuk order #{$orderNumber}.",
            ['order_number' => $orderNumber]
        );
    }

    public function newOrderAvailable(User $mitra, string $orderNumber): void
    {
        $this->send($mitra, 'new_order',
            'Ada Order Baru!',
            "Order #{$orderNumber} tersedia di sekitar Anda. Segera ambil sebelum didahului!",
            ['order_number' => $orderNumber]
        );
    }
}
