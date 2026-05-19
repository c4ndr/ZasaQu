<?php

namespace App\Console\Commands;

use App\Models\OrderPhoto;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Storage;

class CleanOldPhotos extends Command
{
    protected $signature   = 'photos:clean {--days=30 : Hapus foto order yang sudah selesai lebih dari X hari}';
    protected $description = 'Hapus foto bukti pengiriman dari order yang sudah selesai untuk hemat storage';

    public function handle(): void
    {
        // Ambil dari setting admin jika ada, fallback ke option --days
        $settingDays = \App\Models\AdminSetting::valueOf('photos_expire_days');
        $days        = $settingDays !== null ? (int) $settingDays : (int) $this->option('days');
        $cutoff      = now()->subDays($days);

        // Ambil foto dari order completed/cancelled yang sudah lama
        $photos = OrderPhoto::whereHas('order', fn($q) =>
            $q->whereIn('status', ['completed', 'cancelled'])
              ->where('updated_at', '<', $cutoff)
        )->get();

        if ($photos->isEmpty()) {
            $this->info("Tidak ada foto yang perlu dihapus.");
            return;
        }

        $deleted = 0;
        $freed   = 0;

        foreach ($photos as $photo) {
            $path = $photo->image_path;
            if (Storage::disk('public')->exists($path)) {
                $freed += Storage::disk('public')->size($path);
                Storage::disk('public')->delete($path);
            }
            $photo->delete();
            $deleted++;
        }

        // Hapus folder kosong
        $this->cleanEmptyDirs();

        $this->info(sprintf(
            "Selesai: %d foto dihapus, membebaskan %.1f MB storage.",
            $deleted,
            $freed / 1048576
        ));
    }

    private function cleanEmptyDirs(): void
    {
        $baseDir = storage_path('app/public/order-photos');
        if (!is_dir($baseDir)) return;

        foreach (scandir($baseDir) as $sub) {
            if ($sub === '.' || $sub === '..') continue;
            $path = "{$baseDir}/{$sub}";
            if (is_dir($path) && count(scandir($path)) === 2) { // hanya . dan ..
                rmdir($path);
            }
        }
    }
}
