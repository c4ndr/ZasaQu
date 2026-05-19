<?php

namespace App\Console\Commands;

use App\Models\OtpCode;
use Illuminate\Console\Command;

class CleanExpiredOtps extends Command
{
    protected $signature   = 'otp:cleanup';
    protected $description = 'Hapus OTP yang sudah expired dari database';

    public function handle(): void
    {
        $deleted = OtpCode::where('expired_at', '<', now())->delete();

        $this->info("OTP expired dibersihkan: {$deleted} record dihapus.");
    }
}
