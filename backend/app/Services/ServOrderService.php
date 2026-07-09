<?php

namespace App\Services;

use App\Models\ServOrder;
use App\Models\User;
use App\Models\Wallet;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class ServOrderService
{
    public function __construct(private WalletService $walletService) {}

    /**
     * Tahan (hold) saldo pelanggan sebesar total_price saat order dibuat.
     * Gagal (Exception) jika saldo tersedia tidak cukup — dipanggil dalam
     * transaksi pembuatan order oleh CustomerController.
     */
    public function placeHold(User $customer, int $amount): void
    {
        DB::transaction(function () use ($customer, $amount) {
            $wallet = Wallet::lockForUpdate()->where('user_id', $customer->id)->firstOrFail();
            if ($wallet->availableBalance() < $amount) {
                throw new \Exception('Saldo tidak mencukupi. Silakan top up terlebih dahulu.');
            }
            $wallet->increment('locked_balance', $amount);
        });
    }

    /**
     * Lepas hold saldo pelanggan saat order dibatalkan (oleh pelanggan, provider, atau mitra).
     * Pakai min() terhadap locked_balance saat ini agar aman meski dipanggil lebih dari sekali.
     */
    public function releaseHold(ServOrder $order): void
    {
        DB::transaction(function () use ($order) {
            $wallet = Wallet::lockForUpdate()->where('user_id', $order->customer_id)->first();
            if (!$wallet) return;
            $wallet->decrement('locked_balance', min((float) $order->total_price, (float) $wallet->locked_balance));
        });
    }

    /**
     * Settle pembayaran order ZasaServis secara atomik.
     *
     * Dipanggil dari MitraController DAN ProviderController saat status → completed.
     * Guard `settled_at` memastikan pembayaran hanya terjadi sekali (idempoten).
     *
     * Distribusi:
     *   - customer wallet → didebit total_price (hold dilepas dalam proses yang sama)
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

            // Debit pelanggan sebesar total_price — gagal (saldo tak cukup) akan
            // melempar Exception dan membatalkan seluruh transaksi settle ini,
            // sehingga provider TIDAK bisa dikredit tanpa pembayaran nyata.
            $customer = $locked->customer;
            if ($customer && $locked->total_price > 0) {
                $custWallet = Wallet::lockForUpdate()->where('user_id', $customer->id)->firstOrFail();
                $custWallet->decrement('locked_balance', min((float) $locked->total_price, (float) $custWallet->locked_balance));
                $this->walletService->debit(
                    $customer,
                    (float) $locked->total_price,
                    'order_payment',
                    "Pembayaran ZasaServis #{$locked->order_number}",
                    $locked,
                    'zasaserv'
                );
            }

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
