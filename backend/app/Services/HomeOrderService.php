<?php

namespace App\Services;

use App\Models\HomeOrder;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class HomeOrderService
{
    public function __construct(private WalletService $walletService) {}

    /**
     * Settle pembayaran order ZasaHome secara atomik.
     *
     * Dipanggil dari MitraController DAN ProviderController saat status → completed.
     * Guard `settled_at` memastikan pembayaran hanya terjadi sekali meski kedua pihak
     * sama-sama klik "selesai" (idempoten).
     *
     * Distribusi:
     *   - provider_income → wallet home_provider (penyedia jasa)
     *   - mitra_income    → wallet mitra kurir (jika ada & > 0)
     */
    public function settle(HomeOrder $order): void
    {
        DB::transaction(function () use ($order) {
            $locked = HomeOrder::lockForUpdate()->findOrFail($order->id);

            // Sudah diselesaikan sebelumnya — skip (idempoten)
            if ($locked->settled_at !== null) return;

            $locked->update(['settled_at' => now()]);

            // Kredit provider (penyedia jasa laundry, tukang, dll)
            if ($locked->provider_income > 0) {
                $providerUser = $locked->provider?->user;
                if ($providerUser) {
                    $this->walletService->credit(
                        $providerUser,
                        (float) $locked->provider_income,
                        'order_income',
                        "Pendapatan ZasaHome #{$locked->order_number}",
                        $locked,
                        'zasahome'
                    );
                } else {
                    Log::warning("ZasaHome settle: provider user tidak ditemukan untuk order #{$locked->order_number}");
                }
            }

            // Kredit mitra kurir (hanya untuk order antar_jemput dengan pickup_fee)
            if ($locked->mitra_income > 0 && $locked->mitra_id) {
                $mitraUser = User::find($locked->mitra_id);
                if ($mitraUser) {
                    $this->walletService->credit(
                        $mitraUser,
                        (float) $locked->mitra_income,
                        'order_income',
                        "Ongkir ZasaHome #{$locked->order_number}",
                        $locked,
                        'zasahome'
                    );
                } else {
                    Log::warning("ZasaHome settle: mitra user tidak ditemukan untuk order #{$locked->order_number}");
                }
            }
        });
    }
}
