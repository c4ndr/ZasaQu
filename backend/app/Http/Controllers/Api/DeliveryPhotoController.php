<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\FoodOrder;
use App\Models\MartOrder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class DeliveryPhotoController extends Controller
{
    private const MAX_WIDTH    = 1280;
    private const MAX_HEIGHT   = 1280;
    private const JPEG_QUALITY = 82;

    // ── Food ──────────────────────────────────────────────────────────────────

    public function uploadFood(Request $request, int $orderId): JsonResponse
    {
        $order = FoodOrder::where('mitra_id', $request->user()->id)->findOrFail($orderId);

        $request->validate(['photo' => ['required', 'image', 'max:20480']]);

        $path = $this->savePhoto($request->file('photo'), 'food-delivery', $orderId);
        $order->update(['delivery_photo' => $path]);

        return response()->json(['message' => 'Foto berhasil disimpan.', 'path' => $path], 200);
    }

    public function serveFood(Request $request, int $orderId): mixed
    {
        $user  = $request->user();
        $order = FoodOrder::where(function ($q) use ($user) {
            $q->where('customer_id', $user->id)->orWhere('mitra_id', $user->id);
        })->findOrFail($orderId);

        return $this->streamPhoto($order->delivery_photo);
    }

    // ── Mart ──────────────────────────────────────────────────────────────────

    public function uploadMart(Request $request, int $orderId): JsonResponse
    {
        $order = MartOrder::where('mitra_id', $request->user()->id)->findOrFail($orderId);

        $request->validate(['photo' => ['required', 'image', 'max:20480']]);

        $path = $this->savePhoto($request->file('photo'), 'mart-delivery', $orderId);
        $order->update(['delivery_photo' => $path]);

        return response()->json(['message' => 'Foto berhasil disimpan.', 'path' => $path], 200);
    }

    public function serveMart(Request $request, int $orderId): mixed
    {
        $user  = $request->user();
        $order = MartOrder::where(function ($q) use ($user) {
            $q->where('customer_id', $user->id)->orWhere('mitra_id', $user->id);
        })->findOrFail($orderId);

        return $this->streamPhoto($order->delivery_photo);
    }

    // ── Shared helpers ────────────────────────────────────────────────────────

    private function savePhoto($file, string $prefix, int $orderId): string
    {
        $filename = Str::random(40) . '.jpg';
        $dir      = "{$prefix}/{$orderId}";
        $fullPath = storage_path("app/public/{$dir}/{$filename}");

        if (!is_dir(storage_path("app/public/{$dir}"))) {
            mkdir(storage_path("app/public/{$dir}"), 0755, true);
        }

        if (extension_loaded('gd')) {
            $this->compressAndSave($file->getRealPath(), $fullPath, $file->getMimeType());
        } else {
            $file->storeAs($dir, $filename, 'public');
        }

        return "{$dir}/{$filename}";
    }

    private function streamPhoto(?string $path): mixed
    {
        if (!$path) {
            return response()->json(['message' => 'Foto tidak tersedia.'], 404);
        }

        $fullPath = storage_path("app/public/{$path}");
        if (!file_exists($fullPath)) {
            return response()->json(['message' => 'Foto tidak ditemukan.'], 404);
        }

        return response()->streamDownload(function () use ($fullPath) {
            readfile($fullPath);
        }, basename($fullPath), [
            'Content-Type'  => 'image/jpeg',
            'Cache-Control' => 'private, max-age=3600',
        ]);
    }

    private function compressAndSave(string $srcPath, string $destPath, string $mime): void
    {
        $src = match (true) {
            str_contains($mime, 'jpeg') || str_contains($mime, 'jpg') => imagecreatefromjpeg($srcPath),
            str_contains($mime, 'png')  => imagecreatefrompng($srcPath),
            str_contains($mime, 'webp') => function_exists('imagecreatefromwebp') ? imagecreatefromwebp($srcPath) : null,
            default                     => null,
        };

        if (!$src) { copy($srcPath, $destPath); return; }

        [$origW, $origH] = getimagesize($srcPath);
        $ratio = min(self::MAX_WIDTH / $origW, self::MAX_HEIGHT / $origH, 1.0);
        $newW  = (int) round($origW * $ratio);
        $newH  = (int) round($origH * $ratio);

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
        imagecopyresampled($dst, $src, 0, 0, 0, 0, $newW, $newH, imagesx($src), imagesy($src));
        imagejpeg($dst, $destPath, self::JPEG_QUALITY);
        imagedestroy($src);
        imagedestroy($dst);
    }
}
