<?php

namespace App\Http\Traits;

use Illuminate\Http\UploadedFile;

trait CompressesImage
{
    private int $imgMaxWidth  = 1280;
    private int $imgMaxHeight = 1280;
    private int $imgQuality   = 82;

    protected function compressAndStore(
        UploadedFile $file,
        string $dir,
        string $filename,
        int $maxW = 1280,
        int $maxH = 1280
    ): string {
        $storageDir = storage_path("app/public/{$dir}");
        if (!is_dir($storageDir)) mkdir($storageDir, 0755, true);

        $destPath = "{$storageDir}/{$filename}";

        if (extension_loaded('gd')) {
            $this->compressToJpeg($file->getRealPath(), $destPath, $file->getMimeType(), $maxW, $maxH);
        } else {
            $file->storeAs($dir, $filename, 'public');
        }

        return "{$dir}/{$filename}";
    }

    protected function compressBinaryAndStore(
        string $binary,
        string $mime,
        string $dir,
        string $filename,
        int $maxW = 1280,
        int $maxH = 1280
    ): string {
        $storageDir = storage_path("app/public/{$dir}");
        if (!is_dir($storageDir)) mkdir($storageDir, 0755, true);

        $tmp  = tempnam(sys_get_temp_dir(), 'zq_img_');
        file_put_contents($tmp, $binary);

        $destPath = "{$storageDir}/{$filename}";

        if (extension_loaded('gd')) {
            $this->compressToJpeg($tmp, $destPath, $mime, $maxW, $maxH);
        } else {
            file_put_contents($destPath, $binary);
        }

        @unlink($tmp);

        return "{$dir}/{$filename}";
    }

    private function compressToJpeg(string $srcPath, string $destPath, string $mime, int $maxW, int $maxH): void
    {
        $src = match (true) {
            str_contains($mime, 'jpeg'), str_contains($mime, 'jpg') => imagecreatefromjpeg($srcPath),
            str_contains($mime, 'png')  => imagecreatefrompng($srcPath),
            str_contains($mime, 'webp') => function_exists('imagecreatefromwebp') ? imagecreatefromwebp($srcPath) : null,
            default => null,
        };

        if (!$src) { copy($srcPath, $destPath); return; }

        [$origW, $origH] = getimagesize($srcPath);
        $ratio = min($maxW / $origW, $maxH / $origH, 1.0);
        $newW  = (int) round($origW * $ratio);
        $newH  = (int) round($origH * $ratio);

        if (function_exists('exif_read_data') && (str_contains($mime, 'jpeg') || str_contains($mime, 'jpg'))) {
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
        imagecopyresampled($dst, $src, 0, 0, 0, 0, $newW, $newH, imagesx($src), imagesy($src));
        imagejpeg($dst, $destPath, 82);
        imagedestroy($src);
        imagedestroy($dst);
    }
}
