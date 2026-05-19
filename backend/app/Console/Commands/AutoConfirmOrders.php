<?php

namespace App\Console\Commands;

use App\Models\AdminSetting;
use App\Models\Order;
use App\Services\OrderService;
use Illuminate\Console\Command;

/**
 * SLA: Auto-confirm penerimaan jika pelanggan tidak respons setelah X menit (default 2 jam).
 * Juga handle timeout konfirmasi COD.
 */
class AutoConfirmOrders extends Command
{
    protected $signature   = 'orders:auto-confirm';
    protected $description = 'Auto-confirm order yang sudah delivered melewati batas waktu SLA';

    public function __construct(private OrderService $orderService)
    {
        parent::__construct();
    }

    public function handle(): void
    {
        $autoMinutes = (int) (AdminSetting::where('key', 'auto_confirm_minutes')->value('value') ?? 120);
        $codMinutes  = (int) (AdminSetting::where('key', 'cod_confirm_timeout_minutes')->value('value') ?? 60);

        // Auto-confirm: order yang sudah 'delivered' melebihi batas waktu
        // Kecualikan COD yang belum dikonfirmasi customer — ada loop tersendiri di bawah
        $cutoff = now()->subMinutes($autoMinutes);
        $orders = Order::where('status', 'delivered')
            ->where('delivered_at', '<=', $cutoff)
            ->where(function ($q) {
                $q->where('payment_method', '!=', 'cod')
                  ->orWhereNotNull('cod_confirmed_at');
            })
            ->get();

        foreach ($orders as $order) {
            try {
                $this->orderService->updateStatus($order, 'completed');
                $this->info("Auto-confirm order #{$order->order_number}");
            } catch (\Throwable $e) {
                $this->error("Gagal auto-confirm #{$order->order_number}: {$e->getMessage()}");
            }
        }

        // COD timeout: auto-complete order COD yang tidak dikonfirmasi pelanggan
        $codCutoff = now()->subMinutes($codMinutes);
        $codOrders = Order::where('payment_method', 'cod')
            ->where('status', 'delivered')
            ->where('payment_status', 'pending')
            ->whereNull('cod_confirmed_at')
            ->where('delivered_at', '<=', $codCutoff)
            ->get();

        foreach ($codOrders as $order) {
            try {
                $order->update(['cod_confirmed_at' => now()]);
                $this->orderService->updateStatus($order->fresh(), 'completed');
                $this->info("COD auto-complete order #{$order->order_number}");
            } catch (\Throwable $e) {
                $this->error("Gagal COD auto-complete #{$order->order_number}: {$e->getMessage()}");
            }
        }

        $this->info('SLA auto-confirm selesai.');
    }
}
