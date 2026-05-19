<?php

namespace App\Console\Commands;

use App\Events\GpsSessionClosed;
use App\Models\JastipSession;
use App\Models\MitraDetail;
use App\Models\Order;
use App\Services\OrderService;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Redis;

class CheckGpsStatus extends Command
{
    protected $signature   = 'gps:check';
    protected $description = 'Cek sesi JastipQu yang GPS-nya sudah mati dan tutup otomatis';

    public function __construct(private OrderService $orderService)
    {
        parent::__construct();
    }

    public function handle(): void
    {
        $this->checkGpsAndCloseSessions();
        $this->autoOfflineMitra();
        $this->autoCancelPendingOrders();
        $this->expireInactiveJastipSessions();
    }

    private function checkGpsAndCloseSessions(): void
    {
        // Beri grace period 2 menit — sesi baru belum tentu sudah kirim GPS pertama
        $activeSessions = JastipSession::where('status', 'active')
            ->where('created_at', '<=', now()->subMinutes(2))
            ->get();

        foreach ($activeSessions as $session) {
            $key  = "gps:mitra:{$session->mitra_id}";
            $data = Redis::get($key);

            if (!$data) {
                $this->info("GPS mati untuk mitra #{$session->mitra_id}, tutup sesi #{$session->id}");
                $this->orderService->closeJastipSession($session, 'gps_lost');
                MitraDetail::where('user_id', $session->mitra_id)->update(['is_online' => false]);

                if ($session->master_order_id) {
                    broadcast(new GpsSessionClosed($session->master_order_id, $session->id, 'gps_lost'));
                }
            }
        }
    }

    // Mitra yang tidak update GPS >30 menit → offline
    private function autoOfflineMitra(): void
    {
        $updated = MitraDetail::where('is_online', true)
            ->where('last_seen_at', '<=', now()->subMinutes(30))
            ->update(['is_online' => false]);

        if ($updated) {
            $this->info("Auto-offline {$updated} mitra tidak aktif.");
        }
    }

    // Order pending >24 jam tanpa mitra → auto-cancel
    private function autoCancelPendingOrders(): void
    {
        $orders = Order::where('status', 'pending')
            ->where('created_at', '<=', now()->subHours(24))
            ->get();

        foreach ($orders as $order) {
            try {
                $this->orderService->cancelOrder($order, 'Tidak ada mitra tersedia dalam 24 jam.');
                $this->info("Auto-cancel order pending #{$order->order_number}");
            } catch (\Throwable $e) {
                $this->error("Gagal auto-cancel #{$order->order_number}: {$e->getMessage()}");
            }
        }
    }

    // Sesi JastipQu yang tidak ada aktivitas >4 jam → tutup otomatis
    private function expireInactiveJastipSessions(): void
    {
        $sessions = JastipSession::where('status', 'active')
            ->where('updated_at', '<=', now()->subHours(4))
            ->get();

        foreach ($sessions as $session) {
            $this->orderService->closeJastipSession($session, 'inactive');
            $this->info("Auto-expire sesi jastip #{$session->id} karena tidak aktif.");
        }
    }
}
