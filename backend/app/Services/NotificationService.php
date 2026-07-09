<?php

namespace App\Services;

use App\Models\Notification;
use App\Models\User;
use Illuminate\Support\Facades\App;

class NotificationService
{
    public function send(User $user, string $type, string $title, string $body, array $data = []): Notification
    {
        $notif = Notification::create([
            'user_id' => $user->id,
            'type'    => $type,
            'title'   => $title,
            'body'    => $body,
            'data'    => $data,
        ]);

        // Kirim FCM push notification (best-effort, jangan sampai gagalkan in-app)
        try {
            App::make(FcmService::class)->sendToUser($user, $title, $body, array_merge($data, ['type' => $type]));
        } catch (\Throwable) {}

        return $notif;
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

    public function orderAccepted(User $customer, string $orderNumber, int $orderId): void
    {
        $this->send($customer, 'order_accepted',
            'Order Diterima!',
            "Mitra sudah menerima order #{$orderNumber} dan segera menuju lokasi pickup.",
            ['order_number' => $orderNumber, 'order_id' => $orderId]
        );
    }

    public function orderOnPickup(User $customer, string $orderNumber, int $orderId): void
    {
        $this->send($customer, 'order_on_pickup',
            'Mitra Menuju Pickup',
            "Mitra sedang dalam perjalanan menuju lokasi pickup order #{$orderNumber}.",
            ['order_number' => $orderNumber, 'order_id' => $orderId]
        );
    }

    public function orderPickedUp(User $customer, string $orderNumber, int $orderId): void
    {
        $this->send($customer, 'order_picked_up',
            'Barang Diambil',
            "Mitra sudah mengambil barang untuk order #{$orderNumber}.",
            ['order_number' => $orderNumber, 'order_id' => $orderId]
        );
    }

    public function orderOnDelivery(User $customer, string $orderNumber, int $orderId): void
    {
        $this->send($customer, 'order_on_delivery',
            'Barang Dalam Perjalanan',
            "Order #{$orderNumber} sedang dalam perjalanan ke lokasi Anda.",
            ['order_number' => $orderNumber, 'order_id' => $orderId]
        );
    }

    public function orderCompleted(User $customer, User $mitra, string $orderNumber, int $orderId): void
    {
        $this->send($customer, 'rating_request',
            'Beri Rating Mitra',
            "Order #{$orderNumber} selesai. Bagaimana pengalaman Anda?",
            ['order_number' => $orderNumber, 'order_id' => $orderId, 'action' => 'rate']
        );

        $this->send($mitra, 'order_completed',
            'Order Selesai',
            "Order #{$orderNumber} dikonfirmasi selesai. Pendapatan sudah masuk ke dompet Anda.",
            ['order_number' => $orderNumber, 'order_id' => $orderId]
        );
    }

    public function jastipOrderReceived(User $customer, string $orderNumber, int $orderId): void
    {
        $this->send($customer, 'jastip_accepted',
            'Titipan Diterima',
            "Mitra menerima titipan Anda untuk order #{$orderNumber}.",
            ['order_number' => $orderNumber, 'order_id' => $orderId]
        );
    }

    public function orderCancelledForMitra(User $mitra, string $orderNumber, int $orderId): void
    {
        $this->send($mitra, 'order_cancelled',
            'Order Dibatalkan',
            "Order #{$orderNumber} dibatalkan oleh pelanggan.",
            ['order_number' => $orderNumber, 'order_id' => $orderId]
        );
    }

    public function newOrderAvailable(User $mitra, string $orderNumber, int $orderId): void
    {
        $this->send($mitra, 'new_order',
            'Ada Order Baru!',
            "Order #{$orderNumber} tersedia di sekitar Anda. Segera ambil sebelum didahului!",
            ['order_number' => $orderNumber, 'order_id' => $orderId]
        );
    }

    // ─── ZasaServ ──────────────────────────────────────────────────────────────

    public function servOrderPlaced(User $provider, string $orderNumber, int $orderId, string $customerName): void
    {
        $this->send($provider, 'serv_order_placed',
            'Pesanan Servis Baru!',
            "{$customerName} memesan layanan servis. Order #{$orderNumber}.",
            ['order_number' => $orderNumber, 'order_id' => $orderId, 'module' => 'zasaserv']
        );
    }

    public function servOrderConfirmed(User $customer, string $orderNumber, int $orderId, string $providerName): void
    {
        $this->send($customer, 'serv_order_confirmed',
            'Pesanan Dikonfirmasi',
            "{$providerName} mengkonfirmasi pesanan servis #{$orderNumber}.",
            ['order_number' => $orderNumber, 'order_id' => $orderId, 'module' => 'zasaserv']
        );
    }

    public function servOrderTraveling(User $customer, string $orderNumber, int $orderId): void
    {
        $this->send($customer, 'serv_order_traveling',
            'Teknisi Menuju Lokasi',
            "Teknisi sedang dalam perjalanan menuju lokasi Anda untuk order #{$orderNumber}.",
            ['order_number' => $orderNumber, 'order_id' => $orderId, 'module' => 'zasaserv']
        );
    }

    public function servOrderInProgress(User $customer, string $orderNumber, int $orderId): void
    {
        $this->send($customer, 'serv_order_in_progress',
            'Pengerjaan Dimulai',
            "Teknisi sedang mengerjakan order servis #{$orderNumber} di lokasi Anda.",
            ['order_number' => $orderNumber, 'order_id' => $orderId, 'module' => 'zasaserv']
        );
    }

    public function servOrderCompleted(User $customer, string $orderNumber, int $orderId): void
    {
        $this->send($customer, 'serv_order_completed',
            'Servis Selesai',
            "Order servis #{$orderNumber} telah selesai dikerjakan. Terima kasih!",
            ['order_number' => $orderNumber, 'order_id' => $orderId, 'module' => 'zasaserv']
        );
    }

    public function servOrderCancelled(User $customer, string $orderNumber, int $orderId, string $reason): void
    {
        $this->send($customer, 'serv_order_cancelled',
            'Pesanan Dibatalkan',
            "Order servis #{$orderNumber} dibatalkan. Alasan: {$reason}.",
            ['order_number' => $orderNumber, 'order_id' => $orderId, 'module' => 'zasaserv']
        );
    }

    // ─── ZasaRide ──────────────────────────────────────────────────────────────

    public function rideAccepted(User $customer, string $orderNumber, int $orderId, string $driverName): void
    {
        $this->send($customer, 'ride_accepted',
            'Driver Ditemukan!',
            "Driver {$driverName} menerima perjalanan #{$orderNumber} dan segera menuju lokasi penjemputan.",
            ['order_number' => $orderNumber, 'order_id' => $orderId, 'module' => 'zasaride']
        );
    }

    public function rideOnPickup(User $customer, string $orderNumber, int $orderId): void
    {
        $this->send($customer, 'ride_on_pickup',
            'Driver Dalam Perjalanan',
            "Driver sedang menuju lokasi penjemputanmu untuk order #{$orderNumber}.",
            ['order_number' => $orderNumber, 'order_id' => $orderId, 'module' => 'zasaride']
        );
    }

    public function rideOnRide(User $customer, string $orderNumber, int $orderId): void
    {
        $this->send($customer, 'ride_on_ride',
            'Perjalanan Dimulai',
            "Perjalananmu #{$orderNumber} sudah dimulai. Selamat jalan!",
            ['order_number' => $orderNumber, 'order_id' => $orderId, 'module' => 'zasaride']
        );
    }

    public function rideCompleted(User $customer, string $orderNumber, int $orderId): void
    {
        $this->send($customer, 'ride_completed',
            'Perjalanan Selesai',
            "Perjalanan #{$orderNumber} telah selesai. Terima kasih sudah menggunakan ZasaRide!",
            ['order_number' => $orderNumber, 'order_id' => $orderId, 'module' => 'zasaride']
        );
    }

    public function rideCancelledByMitra(User $customer, string $orderNumber, int $orderId): void
    {
        $this->send($customer, 'ride_cancelled',
            'Perjalanan Dibatalkan Driver',
            "Driver membatalkan perjalanan #{$orderNumber}. Coba pesan kembali.",
            ['order_number' => $orderNumber, 'order_id' => $orderId, 'module' => 'zasaride']
        );
    }

    // ─── Withdraw & Admin ──────────────────────────────────────────────────────

    public function jastipSessionStarted(User $mitra, string $destination, string $type = 'zasago'): void
    {
        // Cooldown: 1 notifikasi per mitra per 2 jam agar tidak spam pelanggan
        $cacheKey = "jastip_notif:{$mitra->id}";
        if (\Illuminate\Support\Facades\Cache::has($cacheKey)) return;
        \Illuminate\Support\Facades\Cache::put($cacheKey, true, now()->addHours(2));

        $dest    = $destination ?: 'sekitar area';
        $title   = '🛍️ Ada Mitra Jastip Dekat Kamu!';
        $body    = "{$mitra->name} lagi jalan ke {$dest}. Mau nitip beli sesuatu? Pesan sekarang!";
        $data    = ['type' => 'jastip_available', 'mitra_id' => (string) $mitra->id, 'module' => $type];

        User::where('role', 'pelanggan')->chunk(100, function ($customers) use ($title, $body, $data) {
            foreach ($customers as $customer) {
                try {
                    App::make(FcmService::class)->sendToUser($customer, $title, $body, $data);
                } catch (\Throwable) {}
            }
        });
    }

    public function topUpRequestCreated(User $admin, User $user, int $amount, int $topUpId): void
    {
        $this->send($admin, 'topup_request',
            '💰 Top Up Baru Masuk',
            "{$user->name} mengajukan top up Rp " . number_format($amount, 0, ',', '.') . '. Konfirmasi sekarang.',
            ['topup_id' => $topUpId, 'user_id' => $user->id, 'module' => 'admin']
        );
    }

    public function withdrawRequestCreated(User $admin, User $mitra, int $amount, int $withdrawId): void
    {
        $this->send($admin, 'withdraw_request',
            'Permintaan Withdraw Baru',
            "{$mitra->name} mengajukan withdraw Rp " . number_format($amount, 0, ',', '.') . '. Segera proses.',
            ['withdraw_id' => $withdrawId, 'mitra_id' => $mitra->id, 'module' => 'admin']
        );
    }

    public function complaintCreated(User $admin, string $customerName, string $orderNumber, int $complaintId): void
    {
        $this->send($admin, 'complaint_created',
            '⚠️ Laporan Masalah Baru',
            "{$customerName} melaporkan masalah pada order #{$orderNumber}. Segera tinjau.",
            ['complaint_id' => $complaintId, 'order_number' => $orderNumber, 'module' => 'admin']
        );
    }

    public function complaintResolved(User $customer, int $complaintId, float $refundAmount, string $note): void
    {
        $body = $refundAmount > 0
            ? 'Laporanmu sudah ditinjau. Refund Rp ' . number_format($refundAmount, 0, ',', '.') . " diberikan. Catatan: {$note}"
            : "Laporanmu sudah ditinjau. Catatan: {$note}";

        $this->send($customer, 'complaint_resolved',
            'Laporan Masalah Ditinjau',
            $body,
            ['complaint_id' => $complaintId, 'refund_amount' => $refundAmount]
        );
    }

    public function newChatMessage(User $recipient, string $senderName, string $orderNumber, int $orderId, string $orderType = 'zasago'): void
    {
        // Hanya kirim FCM push, tidak buat DB record agar tidak spam notifikasi in-app
        try {
            App::make(FcmService::class)->sendToUser(
                $recipient,
                "💬 Pesan dari {$senderName}",
                "Ada pesan baru di order #{$orderNumber}. Ketuk untuk membalas.",
                ['type' => 'chat_message', 'order_id' => (string) $orderId, 'order_number' => $orderNumber, 'order_type' => $orderType]
            );
        } catch (\Throwable) {}
    }
}
