<?php

namespace App\Console\Commands;

use App\Events\RideStatusUpdated;
use App\Models\AdminSetting;
use App\Models\RideOrder;
use App\Models\Wallet;
use App\Services\NotificationService;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

class AutoCancelRidePending extends Command
{
    protected $signature   = 'ride:auto-cancel-pending';
    protected $description = 'Auto-cancel ZasaRide order pending yang tidak diambil mitra melebihi batas waktu';

    public function __construct(private NotificationService $notif)
    {
        parent::__construct();
    }

    public function handle(): void
    {
        $minutes = (int) (AdminSetting::where('key', 'ride_pending_timeout_minutes')->value('value') ?? 10);
        $cutoff  = now()->subMinutes($minutes);

        $orders = RideOrder::where('status', 'pending')
            ->where('created_at', '<=', $cutoff)
            ->get();

        foreach ($orders as $order) {
            try {
                DB::transaction(function () use ($order) {
                    $order->update([
                        'status'        => 'cancelled',
                        'cancel_reason' => 'Tidak ada driver yang tersedia. Silakan coba lagi.',
                        'cancelled_at'  => now(),
                    ]);

                    // Lepas locked_balance jika pembayaran wallet
                    if ($order->payment_method === 'wallet') {
                        $wallet = Wallet::lockForUpdate()->where('user_id', $order->customer_id)->first();
                        if ($wallet && $wallet->locked_balance > 0) {
                            $wallet->decrement('locked_balance', min((float) $order->fare, (float) $wallet->locked_balance));
                        }
                    }
                });

                $fresh = $order->fresh(['customer']);
                broadcast(new RideStatusUpdated($fresh, 'pending'));

                // Beritahu pelanggan via push + in-app notification
                if ($fresh->customer) {
                    $this->notif->send(
                        $fresh->customer,
                        'ride_cancelled',
                        'Ride Dibatalkan',
                        "Order ZasaRide #{$fresh->order_number} dibatalkan karena tidak ada driver tersedia. Silakan coba lagi.",
                        ['order_id' => $fresh->id, 'module' => 'zasaride']
                    );
                }

                $this->info("Auto-cancel ride order #{$order->order_number}");
            } catch (\Throwable $e) {
                $this->error("Gagal cancel ride #{$order->order_number}: {$e->getMessage()}");
            }
        }

        $this->info("Ride auto-cancel selesai. {$orders->count()} order diproses.");
    }
}
