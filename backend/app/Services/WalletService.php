<?php

namespace App\Services;

use App\Models\User;
use App\Models\Wallet;
use App\Models\WalletTransaction;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\App;
use Illuminate\Support\Facades\DB;

class WalletService
{
    public function credit(User $user, float $amount, string $type, string $description, ?Model $reference = null, string $serviceModule = 'zasago'): WalletTransaction
    {
        $tx = DB::transaction(function () use ($user, $amount, $type, $description, $reference, $serviceModule) {
            $wallet = Wallet::lockForUpdate()->where('user_id', $user->id)->firstOrFail();

            $before = (float) $wallet->balance;
            $after  = $before + $amount;

            $wallet->update(['balance' => $after]);

            return WalletTransaction::create([
                'wallet_id'      => $wallet->id,
                'service_module' => $serviceModule,
                'type'           => $type,
                'amount'         => $amount,
                'balance_before' => $before,
                'balance_after'  => $after,
                'description'    => $description,
                'reference_type' => $reference ? get_class($reference) : null,
                'reference_id'   => $reference?->id,
                'status'         => 'completed',
            ]);
        });

        try {
            App::make(FcmService::class)->sendToUser(
                $user,
                '💰 Saldo Masuk',
                'Rp ' . number_format($amount, 0, ',', '.') . ' telah masuk ke dompetmu.',
                ['type' => 'wallet_credit', 'amount' => (string) $amount, 'balance_after' => (string) $tx->balance_after]
            );
        } catch (\Throwable) {}

        return $tx;
    }

    public function debit(User $user, float $amount, string $type, string $description, ?Model $reference = null, string $serviceModule = 'zasago'): WalletTransaction
    {
        $tx = DB::transaction(function () use ($user, $amount, $type, $description, $reference, $serviceModule) {
            $wallet = Wallet::lockForUpdate()->where('user_id', $user->id)->firstOrFail();

            if ($wallet->availableBalance() < $amount) {
                throw new \Exception('Saldo tidak mencukupi.');
            }

            $before = (float) $wallet->balance;
            $after  = $before - $amount;

            $wallet->update(['balance' => $after]);

            return WalletTransaction::create([
                'wallet_id'      => $wallet->id,
                'service_module' => $serviceModule,
                'type'           => $type,
                'amount'         => $amount,
                'balance_before' => $before,
                'balance_after'  => $after,
                'description'    => $description,
                'reference_type' => $reference ? get_class($reference) : null,
                'reference_id'   => $reference?->id,
                'status'         => 'completed',
            ]);
        });

        try {
            App::make(FcmService::class)->sendToUser(
                $user,
                '💸 Saldo Berkurang',
                'Rp ' . number_format($amount, 0, ',', '.') . ' telah digunakan dari dompetmu.',
                ['type' => 'wallet_debit', 'amount' => (string) $amount, 'balance_after' => (string) $tx->balance_after]
            );
        } catch (\Throwable) {}

        return $tx;
    }

    // Debit tanpa cek saldo — khusus potongan komisi COD yang wajib dipungut
    // Saldo bisa jadi minus (hutang komisi mitra ke platform)
    public function debitForce(User $user, float $amount, string $type, string $description, ?Model $reference = null, string $serviceModule = 'zasago'): WalletTransaction
    {
        $tx = DB::transaction(function () use ($user, $amount, $type, $description, $reference, $serviceModule) {
            $wallet = Wallet::lockForUpdate()->where('user_id', $user->id)->firstOrFail();

            $before = (float) $wallet->balance;
            $after  = $before - $amount;

            $wallet->update(['balance' => $after]);

            return WalletTransaction::create([
                'wallet_id'      => $wallet->id,
                'service_module' => $serviceModule,
                'type'           => $type,
                'amount'         => $amount,
                'balance_before' => $before,
                'balance_after'  => $after,
                'description'    => $description,
                'reference_type' => $reference ? get_class($reference) : null,
                'reference_id'   => $reference?->id,
                'status'         => 'completed',
            ]);
        });

        try {
            App::make(FcmService::class)->sendToUser(
                $user,
                '💸 Saldo Berkurang',
                'Rp ' . number_format($amount, 0, ',', '.') . ' telah digunakan dari dompetmu.',
                ['type' => 'wallet_debit', 'amount' => (string) $amount, 'balance_after' => (string) $tx->balance_after]
            );
        } catch (\Throwable) {}

        return $tx;
    }

    public function getTransactions(User $user, int $perPage = 20)
    {
        return WalletTransaction::whereHas('wallet', fn($q) => $q->where('user_id', $user->id))
            ->latest()
            ->paginate($perPage);
    }

    public function getSummary(User $user): array
    {
        $wallet = $user->wallet;
        return [
            'balance'          => (float) $wallet->balance,
            'locked_balance'   => (float) $wallet->locked_balance,
            'available'        => $wallet->availableBalance(),
        ];
    }
}
