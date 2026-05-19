<?php

namespace App\Console\Commands;

use App\Models\OrderPhoto;
use Illuminate\Console\Command;

class RecompressPhotos extends Command
{
    protected $signature   = 'photos:recompress
                                {--min-kb=200 : Hanya proses foto di atas ukuran ini (KB)}
                                {--quality=72 : Kualitas JPEG output (1-100)}
                                {--max-px=1280 : Dimensi terpanjang maksimum (px)}
                                {--dry-run : Tampilkan daftar tanpa mengubah file}';
    protected $description = 'Rekompresi foto lama yang belum dikompresi oleh GD';

    private const SUPPORTED_MIME = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

    public function handle(): int
    {
        if (!extension_loaded('gd')) {
            $this->error('Ekstensi GD tidak aktif. Install php-gd terlebih dahulu.');
            return 1;
        }

        $minBytes  = (int) $this->option('min-kb') * 1024;
        $quality   = (int) $this->option('quality');
        $maxPx     = (int) $this->option('max-px');
        $dryRun    = $this->option('dry-run');

        $photos = OrderPhoto::all();

        $targets = $photos->filter(function ($photo) use ($minBytes) {
            $path = storage_path("app/public/{$photo->image_path}");
            return file_exists($path) && filesize($path) > $minBytes;
        });

        if ($targets->isEmpty()) {
            $this->info("Tidak ada foto yang perlu direkompresi (threshold: {$this->option('min-kb')} KB).");
            return 0;
        }

        $this->info(sprintf('Ditemukan %d foto yang akan direkompresi.', $targets->count()));

        if ($dryRun) {
            $this->warn('[DRY RUN] Tidak ada file yang diubah.');
            $targets->each(function ($photo) {
                $path = storage_path("app/public/{$photo->image_path}");
                $this->line(sprintf('  [%d KB] %s', round(filesize($path) / 1024), $photo->image_path));
            });
            return 0;
        }

        $totalBefore = 0;
        $totalAfter  = 0;
        $success     = 0;
        $skipped     = 0;

        $bar = $this->output->createProgressBar($targets->count());
        $bar->start();

        foreach ($targets as $photo) {
            $path = storage_path("app/public/{$photo->image_path}");
            $sizeBefore = filesize($path);

            $mime = mime_content_type($path);
            if (!in_array($mime, self::SUPPORTED_MIME)) {
                $skipped++;
                $bar->advance();
                continue;
            }

            $ok = $this->compress($path, $mime, $quality, $maxPx);
            if ($ok) {
                $totalBefore += $sizeBefore;
                $totalAfter  += filesize($path);
                $success++;
            } else {
                $skipped++;
            }

            $bar->advance();
        }

        $bar->finish();
        $this->newLine(2);

        $savedMb = ($totalBefore - $totalAfter) / 1048576;
        $this->info(sprintf(
            "Selesai: %d foto direkompresi, %d dilewati. Ruang dibebaskan: %.1f MB (%.0f MB → %.0f MB).",
            $success,
            $skipped,
            $savedMb,
            $totalBefore / 1048576,
            $totalAfter  / 1048576,
        ));

        return 0;
    }

    private function compress(string $path, string $mime, int $quality, int $maxPx): bool
    {
        try {
            $src = match (true) {
                str_contains($mime, 'jpeg') || str_contains($mime, 'jpg') => @imagecreatefromjpeg($path),
                str_contains($mime, 'png')  => @imagecreatefrompng($path),
                str_contains($mime, 'webp') => function_exists('imagecreatefromwebp') ? @imagecreatefromwebp($path) : null,
                default                     => null,
            };
        } catch (\Throwable) {
            return false; // File corrupt/tidak valid
        }

        if (!$src) return false;

        [$origW, $origH] = getimagesize($path);

        // Auto-rotate dari EXIF
        if (function_exists('exif_read_data') && str_contains($mime, 'jpeg')) {
            $exif = @exif_read_data($path);
            $orientation = $exif['Orientation'] ?? 1;
            $src = match ($orientation) {
                3 => imagerotate($src, 180, 0),
                6 => imagerotate($src, -90, 0),
                8 => imagerotate($src, 90,  0),
                default => $src,
            };
            if (in_array($orientation, [6, 8])) [$origW, $origH] = [$origH, $origW];
        }

        $ratio = min($maxPx / $origW, $maxPx / $origH, 1.0);
        $newW  = (int) round($origW * $ratio);
        $newH  = (int) round($origH * $ratio);

        $dst = imagecreatetruecolor($newW, $newH);
        imagecopyresampled($dst, $src, 0, 0, 0, 0, $newW, $newH, imagesx($src), imagesy($src));

        // Tulis langsung ke path yang sama
        $result = imagejpeg($dst, $path, $quality);

        imagedestroy($src);
        imagedestroy($dst);

        return $result;
    }
}
