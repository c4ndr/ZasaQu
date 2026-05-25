<?php

namespace App\Http\Controllers\Api\Merchant;

use App\Http\Controllers\Controller;
use App\Models\FoodMerchant;
use App\Models\FoodOrder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class ProfileController extends Controller
{
    public function show(Request $request): JsonResponse
    {
        $merchant = $request->user()->foodMerchant;

        if (!$merchant) {
            return response()->json(['message' => 'Anda belum terdaftar sebagai merchant.'], 404);
        }

        return response()->json(['data' => $merchant->load('categories.items')]);
    }

    public function statistics(Request $request): JsonResponse
    {
        $merchant = $request->user()->foodMerchant;

        if (!$merchant) {
            return response()->json(['message' => 'Anda belum terdaftar sebagai merchant.'], 404);
        }

        $base = FoodOrder::where('merchant_id', $merchant->id);

        $today = now()->startOfDay();

        $stats = $base->clone()
            ->selectRaw("
                COUNT(*) as total_orders,
                SUM(CASE WHEN status = 'completed' THEN merchant_income ELSE 0 END) as total_revenue,
                SUM(CASE WHEN created_at >= ? THEN 1 ELSE 0 END) as orders_today,
                SUM(CASE WHEN status = 'completed' AND created_at >= ? THEN merchant_income ELSE 0 END) as revenue_today,
                SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending_orders
            ", [$today, $today])
            ->first();

        return response()->json([
            'data' => [
                'orders_today'    => (int)   ($stats->orders_today   ?? 0),
                'revenue_today'   => (float) ($stats->revenue_today  ?? 0),
                'pending_orders'  => (int)   ($stats->pending_orders ?? 0),
                'total_orders'    => (int)   ($stats->total_orders   ?? 0),
                'total_revenue'   => (float) ($stats->total_revenue  ?? 0),
                'average_rating'  => round((float) ($merchant->average_rating ?? 0), 1),
            ],
        ]);
    }

    public function update(Request $request): JsonResponse
    {
        $merchant = $request->user()->foodMerchant;

        if (!$merchant) {
            return response()->json(['message' => 'Anda belum terdaftar sebagai merchant.'], 404);
        }

        $data = $request->validate([
            'name'                  => ['sometimes', 'string', 'max:150'],
            'description'           => ['nullable', 'string', 'max:500'],
            'category'              => ['sometimes', 'in:makanan_berat,minuman,snack,lainnya'],
            'address'               => ['sometimes', 'string', 'max:255'],
            'lat'                   => ['sometimes', 'numeric', 'between:-90,90'],
            'lng'                   => ['sometimes', 'numeric', 'between:-180,180'],
            'phone'                 => ['nullable', 'string', 'max:20'],
            'open_time'             => ['nullable', 'date_format:H:i'],
            'close_time'            => ['nullable', 'date_format:H:i'],
            'avg_prep_time_minutes' => ['sometimes', 'integer', 'min:1', 'max:180'],
        ]);

        if (isset($data['name'])) {
            $data['slug'] = Str::slug($data['name']) . '-' . substr($merchant->slug, -6);
        }

        $merchant->update($data);

        return response()->json(['message' => 'Profil toko diperbarui.', 'data' => $merchant->fresh()]);
    }

    public function toggleOpen(Request $request): JsonResponse
    {
        $merchant = $request->user()->foodMerchant;

        if (!$merchant) {
            return response()->json(['message' => 'Anda belum terdaftar sebagai merchant.'], 404);
        }

        if (!$merchant->isActive()) {
            return response()->json(['message' => 'Toko belum disetujui admin.'], 403);
        }

        $merchant->update(['is_open' => !$merchant->is_open]);

        return response()->json([
            'message' => $merchant->is_open ? 'Toko dibuka.' : 'Toko ditutup.',
            'is_open' => $merchant->is_open,
        ]);
    }

    public function uploadLogo(Request $request): JsonResponse
    {
        $merchant = $request->user()->foodMerchant;

        if (!$merchant) {
            return response()->json(['message' => 'Anda belum terdaftar sebagai merchant.'], 404);
        }

        $request->validate(['image' => ['required', 'image', 'max:5120']]);

        $path = $this->saveImage($request->file('image'), "food-merchants/{$merchant->id}", 'logo');
        $merchant->update(['logo_path' => $path]);

        return response()->json(['message' => 'Logo diperbarui.', 'logo_path' => $path]);
    }

    public function uploadBanner(Request $request): JsonResponse
    {
        $merchant = $request->user()->foodMerchant;

        if (!$merchant) {
            return response()->json(['message' => 'Anda belum terdaftar sebagai merchant.'], 404);
        }

        $request->validate(['image' => ['required', 'image', 'max:10240']]);

        $path = $this->saveImage($request->file('image'), "food-merchants/{$merchant->id}", 'banner');
        $merchant->update(['banner_path' => $path]);

        return response()->json(['message' => 'Banner diperbarui.', 'banner_path' => $path]);
    }

    private function saveImage(\Illuminate\Http\UploadedFile $file, string $dir, string $name): string
    {
        $storageDir = storage_path("app/public/{$dir}");
        if (!is_dir($storageDir)) {
            mkdir($storageDir, 0755, true);
        }

        $filename = "{$name}.jpg";
        $fullPath = "{$storageDir}/{$filename}";

        if (extension_loaded('gd')) {
            try {
                $this->compressImage($file->getRealPath(), $fullPath, $file->getMimeType(), 1200, 1200);
            } catch (\Throwable $e) {
                \Log::warning("Image compression failed for {$dir}/{$filename}: " . $e->getMessage());
                copy($file->getRealPath(), $fullPath);
            }
        } else {
            $file->storeAs($dir, $filename, 'public');
        }

        return "{$dir}/{$filename}";
    }

    private function compressImage(string $src, string $dest, string $mime, int $maxW, int $maxH): void
    {
        $img = match (true) {
            str_contains($mime, 'jpeg'), str_contains($mime, 'jpg') => imagecreatefromjpeg($src),
            str_contains($mime, 'png')  => imagecreatefrompng($src),
            str_contains($mime, 'webp') => function_exists('imagecreatefromwebp') ? imagecreatefromwebp($src) : null,
            default => null,
        };

        if (!$img) { copy($src, $dest); return; }

        $size = @getimagesize($src);
        if (!$size || !$size[0] || !$size[1]) {
            imagedestroy($img);
            copy($src, $dest);
            return;
        }

        [$w, $h] = $size;
        $ratio = min($maxW / $w, $maxH / $h, 1.0);
        $nw = (int) round($w * $ratio);
        $nh = (int) round($h * $ratio);

        $dst = imagecreatetruecolor($nw, $nh);
        if (!$dst) {
            imagedestroy($img);
            copy($src, $dest);
            return;
        }

        imagecopyresampled($dst, $img, 0, 0, 0, 0, $nw, $nh, $w, $h);
        imagejpeg($dst, $dest, 85);
        imagedestroy($img);
        imagedestroy($dst);
    }
}
