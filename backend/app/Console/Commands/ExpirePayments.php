<?php

namespace App\Console\Commands;

use App\Models\QrisTransaction;
use App\Models\VirtualAccount;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

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

        $vaCount = 0;
        foreach ($expiredVa as $va) {
            try {
                DB::transaction(function () use ($va) {
                    $locked = VirtualAccount::lockForUpdate()->findOrFail($va->id);
                    if ($locked->status !== 'pending') return; // sudah dibayar atau diproses
                    $locked->update(['status' => 'expired']);
                    $locked->topUpRequest()->where('status', 'pending')->update(['status' => 'expired']);
                });
                $vaCount++;
            } catch (\Throwable) {}
        }

        // Expire QRIS
        $expiredQris = QrisTransaction::where('status', 'pending')
            ->where('expired_at', '<', $now)
            ->get();

        $qrisCount = 0;
        foreach ($expiredQris as $qris) {
            try {
                DB::transaction(function () use ($qris) {
                    $locked = QrisTransaction::lockForUpdate()->findOrFail($qris->id);
                    if ($locked->status !== 'pending') return; // sudah dibayar atau diproses
                    $locked->update(['status' => 'expired']);
                    $locked->topUpRequest()->where('status', 'pending')->update(['status' => 'expired']);
                });
                $qrisCount++;
            } catch (\Throwable) {}
        }

        $this->info("Expired: {$vaCount} VA, {$qrisCount} QRIS.");
    }
}
