<?php

namespace App\Http\Controllers\Api\Merchant;

use App\Http\Controllers\Controller;
use App\Models\FoodMenuCategory;
use App\Models\FoodMenuItem;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class MenuController extends Controller
{
    // ── Helpers ──────────────────────────────────────────────────────────────

    private function merchant(Request $request): ?\App\Models\FoodMerchant
    {
        return $request->user()->foodMerchant;
    }

    private function guardMerchant(Request $request): ?JsonResponse
    {
        if (!$this->merchant($request)) {
            return response()->json(['message' => 'Anda belum terdaftar sebagai merchant.'], 404);
        }
        return null;
    }

    // ── Kategori ─────────────────────────────────────────────────────────────

    public function indexCategories(Request $request): JsonResponse
    {
        if ($err = $this->guardMerchant($request)) return $err;

        $categories = $this->merchant($request)->categories()->with('items')->get();
        return response()->json(['data' => $categories]);
    }

    public function storeCategory(Request $request): JsonResponse
    {
        if ($err = $this->guardMerchant($request)) return $err;

        $data = $request->validate([
            'name'       => ['required', 'string', 'max:100'],
            'sort_order' => ['nullable', 'integer', 'min:0'],
        ]);

        $category = $this->merchant($request)->categories()->create($data);

        return response()->json(['message' => 'Kategori dibuat.', 'data' => $category], 201);
    }

    public function updateCategory(Request $request, int $id): JsonResponse
    {
        if ($err = $this->guardMerchant($request)) return $err;

        $category = $this->merchant($request)->categories()->findOrFail($id);

        $data = $request->validate([
            'name'       => ['sometimes', 'string', 'max:100'],
            'sort_order' => ['nullable', 'integer', 'min:0'],
            'is_active'  => ['sometimes', 'boolean'],
        ]);

        $category->update($data);

        return response()->json(['message' => 'Kategori diperbarui.', 'data' => $category->fresh()]);
    }

    public function destroyCategory(Request $request, int $id): JsonResponse
    {
        if ($err = $this->guardMerchant($request)) return $err;

        $category = $this->merchant($request)->categories()->findOrFail($id);

        // Pindahkan item ke uncategorized (set category_id = null)
        $category->items()->update(['category_id' => null]);
        $category->delete();

        return response()->json(['message' => 'Kategori dihapus.']);
    }

    // ── Item Menu ─────────────────────────────────────────────────────────────

    public function indexItems(Request $request): JsonResponse
    {
        if ($err = $this->guardMerchant($request)) return $err;

        $items = $this->merchant($request)->menuItems()
            ->with('category')
            ->orderBy('category_id')
            ->orderBy('sort_order')
            ->get();

        return response()->json(['data' => $items]);
    }

    public function storeItem(Request $request): JsonResponse
    {
        if ($err = $this->guardMerchant($request)) return $err;

        $merchant = $this->merchant($request);

        $data = $request->validate([
            'category_id' => ['nullable', 'integer', 'exists:food_menu_categories,id'],
            'name'        => ['required', 'string', 'max:150'],
            'description' => ['nullable', 'string', 'max:300'],
            'price'       => ['required', 'integer', 'min:500'],
            'stock'       => ['nullable', 'integer', 'min:0'],
            'sort_order'  => ['nullable', 'integer', 'min:0'],
            'photo'       => ['nullable', 'image', 'max:5120'],
        ]);

        // Pastikan category_id milik merchant ini
        if (!empty($data['category_id'])) {
            $merchant->categories()->findOrFail($data['category_id']);
        }

        $item = $merchant->menuItems()->create(array_merge($data, ['is_available' => true]));

        if ($request->hasFile('photo')) {
            $path = $this->saveItemPhoto($request->file('photo'), $item->id);
            $item->update(['photo_path' => $path]);
        }

        return response()->json(['message' => 'Item ditambahkan.', 'data' => $item->fresh()], 201);
    }

    public function updateItem(Request $request, int $id): JsonResponse
    {
        if ($err = $this->guardMerchant($request)) return $err;

        $merchant = $this->merchant($request);
        $item     = $merchant->menuItems()->findOrFail($id);

        $data = $request->validate([
            'category_id' => ['nullable', 'integer', 'exists:food_menu_categories,id'],
            'name'        => ['sometimes', 'string', 'max:150'],
            'description' => ['nullable', 'string', 'max:300'],
            'price'       => ['sometimes', 'integer', 'min:500'],
            'stock'       => ['nullable', 'integer', 'min:0'],
            'sort_order'  => ['nullable', 'integer', 'min:0'],
            'is_available'=> ['sometimes', 'boolean'],
            'photo'       => ['nullable', 'image', 'max:5120'],
        ]);

        if (!empty($data['category_id'])) {
            $merchant->categories()->findOrFail($data['category_id']);
        }

        $item->update($data);

        if ($request->hasFile('photo')) {
            $path = $this->saveItemPhoto($request->file('photo'), $item->id);
            $item->update(['photo_path' => $path]);
        }

        return response()->json(['message' => 'Item diperbarui.', 'data' => $item->fresh()]);
    }

    public function destroyItem(Request $request, int $id): JsonResponse
    {
        if ($err = $this->guardMerchant($request)) return $err;

        $item = $this->merchant($request)->menuItems()->findOrFail($id);
        $item->delete();

        return response()->json(['message' => 'Item dihapus.']);
    }

    public function toggleItem(Request $request, int $id): JsonResponse
    {
        if ($err = $this->guardMerchant($request)) return $err;

        $item = $this->merchant($request)->menuItems()->findOrFail($id);
        $item->update(['is_available' => !$item->is_available]);

        return response()->json([
            'message'      => $item->is_available ? 'Item tersedia.' : 'Item tidak tersedia.',
            'is_available' => $item->is_available,
        ]);
    }

    // ── Foto item menu ────────────────────────────────────────────────────────

    private function saveItemPhoto(\Illuminate\Http\UploadedFile $file, int $itemId): string
    {
        $dir = storage_path('app/public/food-menu-items');
        if (!is_dir($dir)) mkdir($dir, 0755, true);

        $filename = "{$itemId}.jpg";
        $fullPath = "{$dir}/{$filename}";

        if (extension_loaded('gd')) {
            $src = $this->openImage($file->getRealPath(), $file->getMimeType());
            if ($src) {
                [$w, $h] = getimagesize($file->getRealPath());
                $ratio = min(800 / $w, 800 / $h, 1.0);
                $nw    = (int) round($w * $ratio);
                $nh    = (int) round($h * $ratio);
                $dst   = imagecreatetruecolor($nw, $nh);
                imagecopyresampled($dst, $src, 0, 0, 0, 0, $nw, $nh, $w, $h);
                imagejpeg($dst, $fullPath, 82);
                imagedestroy($src);
                imagedestroy($dst);
            } else {
                copy($file->getRealPath(), $fullPath);
            }
        } else {
            $file->storeAs('food-menu-items', $filename, 'public');
        }

        return "food-menu-items/{$filename}";
    }

    private function openImage(string $path, string $mime): mixed
    {
        return match (true) {
            str_contains($mime, 'jpeg'), str_contains($mime, 'jpg') => imagecreatefromjpeg($path),
            str_contains($mime, 'png')  => imagecreatefrompng($path),
            str_contains($mime, 'webp') => function_exists('imagecreatefromwebp') ? imagecreatefromwebp($path) : null,
            default => null,
        };
    }
}
