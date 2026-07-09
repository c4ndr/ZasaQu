<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Models\OrderPhoto;
use App\Services\ImageCompressService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class OrderPhotoController extends Controller
{
    public function __construct(private ImageCompressService $imageCompress) {}

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

        $this->imageCompress->compressAndSave($file->getRealPath(), $fullPath, $file->getMimeType());

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
}
