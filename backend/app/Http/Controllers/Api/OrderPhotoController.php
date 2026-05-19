<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Models\OrderPhoto;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class OrderPhotoController extends Controller
{
    // Maks dimensi & kualitas JPEG setelah kompresi
    private const MAX_WIDTH  = 1280;
    private const MAX_HEIGHT = 1280;
    private const JPEG_QUALITY = 82;

    // Serve foto dengan validasi kepemilikan — mencegah akses publik tanpa auth
    public function serve(Request $request, int $orderId, string $stage): \Symfony\Component\HttpFoundation\StreamedResponse|\Illuminate\Http\JsonResponse
    {
        $user  = $request->user();
        $order = Order::where(function ($q) use ($user) {
            $q->where('customer_id', $user->id)->orWhere('mitra_id', $user->id);
        })->findOrFail($orderId);

        $photo = $order->photos()->where('stage', $stage)->firstOrFail();
        $path  = storage_path("app/public/{$photo->image_path}");

        if (!file_exists($path)) {
            return response()->json(['message' => 'Foto tidak ditemukan.'], 404);
        }

        return response()->streamDownload(function () use ($path) {
            readfile($path);
        }, basename($path), [
            'Content-Type'  => 'image/jpeg',
            'Cache-Control' => 'private, max-age=3600',
        ]);
    }

    public function upload(Request $request, int $orderId): JsonResponse
    {
        $order = Order::where('mitra_id', $request->user()->id)->findOrFail($orderId);

        $data = $request->validate([
            'stage' => ['required', 'in:pickup,packing,delivery'],
            'photo' => ['required', 'image', 'max:20480'], // 20MB — cukup untuk foto kamera HP
        ]);

        if ($order->photos()->where('stage', $data['stage'])->exists()) {
            return response()->json(['message' => 'Foto untuk tahap ini sudah diupload.'], 422);
        }

        $file     = $request->file('photo');
        $filename = Str::random(40) . '.jpg';
        $dir      = "order-photos/{$orderId}";
        $fullPath = storage_path("app/public/{$dir}/{$filename}");

        // Pastikan direktori ada
        if (!is_dir(storage_path("app/public/{$dir}"))) {
            mkdir(storage_path("app/public/{$dir}"), 0755, true);
        }

        // Kompres dengan GD jika tersedia, fallback simpan langsung
        if (extension_loaded('gd')) {
            $this->compressAndSave($file->getRealPath(), $fullPath, $file->getMimeType());
        } else {
            // GD belum install — simpan langsung tanpa kompresi
            $file->storeAs($dir, $filename, 'public');
        }

        $photo = OrderPhoto::create([
            'order_id'   => $order->id,
            'stage'      => $data['stage'],
            'image_path' => "{$dir}/{$filename}",
            'taken_at'   => now(),
        ]);

        $sizeKb = file_exists($fullPath) ? round(filesize($fullPath) / 1024) : '?';

        return response()->json([
            'message' => 'Foto berhasil diupload.',
            'data'    => $photo,
            'size_kb' => $sizeKb,
        ], 201);
    }

    private function compressAndSave(string $srcPath, string $destPath, string $mime): void
    {
        // Buat resource gambar sesuai tipe
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

        // Hitung dimensi baru dengan mempertahankan rasio
        $ratio  = min(self::MAX_WIDTH / $origW, self::MAX_HEIGHT / $origH, 1.0);
        $newW   = (int) round($origW * $ratio);
        $newH   = (int) round($origH * $ratio);

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
                // Setelah rotasi 90/270, tukar dimensi
                if (in_array($orientation, [6, 8])) [$newW, $newH] = [$newH, $newW];
            }
        }

        $dst = imagecreatetruecolor($newW, $newH);

        // Pertahankan transparansi PNG
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
