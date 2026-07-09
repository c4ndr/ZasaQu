<?php

namespace App\Services;

class ImageCompressService
{
    private const MAX_WIDTH    = 1280;
    private const MAX_HEIGHT   = 1280;
    private const JPEG_QUALITY = 82;

    /**
     * Kompres gambar dan simpan ke $destPath. Fallback copy langsung kalau
     * GD tidak tersedia atau tipe tidak didukung.
     */
    public function compressAndSave(string $srcPath, string $destPath, string $mime): void
    {
        if (!extension_loaded('gd')) {
            copy($srcPath, $destPath);
            return;
        }

        $src = match (true) {
            str_contains($mime, 'jpeg') || str_contains($mime, 'jpg') => imagecreatefromjpeg($srcPath),
            str_contains($mime, 'png')  => imagecreatefrompng($srcPath),
            str_contains($mime, 'webp') => function_exists('imagecreatefromwebp') ? imagecreatefromwebp($srcPath) : null,
            str_contains($mime, 'heic') => null, // HEIC butuh Imagick
            default                     => null,
        };

        if (!$src) {
            // Tipe tidak didukung GD — salin saja
            copy($srcPath, $destPath);
            return;
        }

        [$origW, $origH] = getimagesize($srcPath);

        $ratio = min(self::MAX_WIDTH / $origW, self::MAX_HEIGHT / $origH, 1.0);
        $newW  = (int) round($origW * $ratio);
        $newH  = (int) round($origH * $ratio);

        // Putar otomatis berdasarkan EXIF (foto portrait dari HP)
        if (function_exists('exif_read_data') && in_array($mime, ['image/jpeg', 'image/jpg'])) {
            $exif = @exif_read_data($srcPath);
            $orientation = $exif['Orientation'] ?? 1;
            if (in_array($orientation, [3, 6, 8])) {
                $src = match ($orientation) {
                    3 => imagerotate($src, 180, 0),
                    6 => imagerotate($src, -90, 0),
                    8 => imagerotate($src, 90, 0),
                };
                if (in_array($orientation, [6, 8])) [$newW, $newH] = [$newH, $newW];
            }
        }

        $dst = imagecreatetruecolor($newW, $newH);

        if (str_contains($mime, 'png')) {
            imagealphablending($dst, false);
            imagesavealpha($dst, true);
        }

        imagecopyresampled($dst, $src, 0, 0, 0, 0, $newW, $newH, imagesx($src), imagesy($src));
        imagejpeg($dst, $destPath, self::JPEG_QUALITY);

        imagedestroy($src);
        imagedestroy($dst);
    }
}
