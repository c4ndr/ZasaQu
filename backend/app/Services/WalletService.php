<?php

namespace App\Services;

use App\Models\User;
use App\Models\Wallet;
use App\Models\WalletTransaction;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\DB;

class WalletService
{
    public function credit(User $user, float $amount, string $type, string $description, ?Model $reference = null, string $serviceModule = 'zasago'): WalletTransaction
    {
        return DB::transaction(function () use ($user, $amount, $type, $description, $reference, $serviceModule) {
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
    }

    public function debit(User $user, float $amount, string $type, string $description, ?Model $reference = null, string $serviceModule = 'zasago'): WalletTransaction
    {
        return DB::transaction(function () use ($user, $amount, $type, $description, $reference, $serviceModule) {
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
