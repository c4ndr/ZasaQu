<?php

namespace App\Services;

use App\Models\HomeOrder;
use App\Models\User;
use App\Models\Wallet;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class HomeOrderService
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
    public function releaseHold(HomeOrder $order): void
    {
        DB::transaction(function () use ($order) {
            $wallet = Wallet::lockForUpdate()->where('user_id', $order->customer_id)->first();
            if (!$wallet) return;
            $wallet->decrement('locked_balance', min((float) $order->total_price, (float) $wallet->locked_balance));
        });
    }

    /**
     * Settle pembayaran order ZasaHome secara atomik.
     *
     * Dipanggil dari MitraController DAN ProviderController saat status → completed.
     * Guard `settled_at` memastikan pembayaran hanya terjadi sekali meski kedua pihak
     * sama-sama klik "selesai" (idempoten).
     *
     * Distribusi:
     *   - customer wallet → didebit total_price (hold dilepas dalam proses yang sama)
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
                    "Pembayaran ZasaHome #{$locked->order_number}",
                    $locked,
                    'zasahome'
                );
            }

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
