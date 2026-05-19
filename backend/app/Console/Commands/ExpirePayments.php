<?php

namespace App\Console\Commands;

use App\Models\QrisTransaction;
use App\Models\TopUpRequest;
use App\Models\VirtualAccount;
use Illuminate\Console\Command;

/**
 * Expire VA dan QRIS yang sudah melewati waktu.
 */
class ExpirePayments extends Command
{
    protected $signature   = 'payments:expire';
    protected $description = 'Expire virtual account dan QRIS yang sudah melewati batas waktu';

    public function handle(): void
    {
        $now = now();

        // Expire VA
        $expiredVa = VirtualAccount::where('status', 'pending')
            ->where('expired_at', '<', $now)
            ->get();

        foreach ($expiredVa as $va) {
            $va->update(['status' => 'expired']);
            $va->topUpRequest()->where('status', 'pending')->update(['status' => 'expired']);
        }

        // Expire QRIS
        $expiredQris = QrisTransaction::where('status', 'pending')
            ->where('expired_at', '<', $now)
            ->get();

        foreach ($expiredQris as $qris) {
            $qris->update(['status' => 'expired']);
            $qris->topUpRequest()->where('status', 'pending')->update(['status' => 'expired']);
        }

        $this->info("Expired: {$expiredVa->count()} VA, {$expiredQris->count()} QRIS.");
    }
}
