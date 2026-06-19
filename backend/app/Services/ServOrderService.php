<?php

namespace App\Services;

use App\Models\ServOrder;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class ServOrderService
{
    public function __construct(private WalletService $walletService) {}

    /**
     * Settle pembayaran order ZasaServis secara atomik.
     *
     * Dipanggil dari MitraController DAN ProviderController saat status → completed.
     * Guard `settled_at` memastikan pembayaran hanya terjadi sekali (idempoten).
     *
     * Distribusi:
     *   - provider_income → wallet serv_provider (perusahaan/individu penyedia servis)
     *   - mitra_income    → wallet mitra (jika ada & > 0, untuk servis dengan mitra kurir)
     */
    public function settle(ServOrder $order): void
    {
        DB::transaction(function () use ($order) {
            $locked = ServOrder::lockForUpdate()->findOrFail($order->id);

            // Sudah diselesaikan sebelumnya — skip (idempoten)
            if ($locked->settled_at !== null) return;

            $locked->update(['settled_at' => now()]);

            // Kredit provider (perusahaan servis: AC, listrik, dll)
            if ($locked->provider_income > 0) {
                $providerUser = $locked->provider?->user;
                if ($providerUser) {
                    $this->walletService->credit(
                        $providerUser,
                        (float) $locked->provider_income,
                        'order_income',
                        "Pendapatan ZasaServis #{$locked->order_number}",
                        $locked,
                        'zasaserv'
                    );
                } else {
                    Log::warning("ZasaServis settle: provider user tidak ditemukan untuk order #{$locked->order_number}");
                }
            }

            // Kredit mitra (jika ada mitra_income yang ditetapkan di order)
            if ($locked->mitra_income > 0 && $locked->mitra_id) {
                $mitraUser = User::find($locked->mitra_id);
                if ($mitraUser) {
                    $this->walletService->credit(
                        $mitraUser,
                        (float) $locked->mitra_income,
                        'order_income',
                        "Komisi mitra ZasaServis #{$locked->order_number}",
                        $locked,
                        'zasaserv'
                    );
                } else {
                    Log::warning("ZasaServis settle: mitra user tidak ditemukan untuk order #{$locked->order_number}");
                }
            }
        });
    }
}
