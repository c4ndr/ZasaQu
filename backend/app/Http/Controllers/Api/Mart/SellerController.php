<?php

namespace App\Http\Controllers\Api\Mart;

use App\Http\Controllers\Controller;
use App\Models\MartOrder;
use App\Models\MartProduct;
use App\Models\MartSeller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class SellerController extends Controller
{
    private function seller(Request $request): MartSeller
    {
        return $request->user()->martSeller;
    }

    // ── Store profile ─────────────────────────────────────────────────────────

    public function profile(Request $request): JsonResponse
    {
        $seller = $this->seller($request);
        if (!$seller) return response()->json(['message' => 'Profil toko tidak ditemukan.'], 404);
        return response()->json($seller->load('allProducts.category'));
    }

    public function updateProfile(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name'        => ['sometimes', 'string', 'max:100'],
            'description' => ['nullable', 'string', 'max:1000'],
            'address'     => ['sometimes', 'string', 'max:500'],
            'lat'         => ['nullable', 'numeric'],
            'lng'         => ['nullable', 'numeric'],
            'phone'       => ['nullable', 'string', 'max:20'],
        ]);

        $seller = $this->seller($request);
        $seller->update($data);
        return response()->json($seller);
    }

    public function toggleOpen(Request $request): JsonResponse
    {
        $seller = $this->seller($request);
        abort_if($seller->status !== 'active', 422, 'Toko belum aktif.');
        $seller->update(['is_open' => !$seller->is_open]);
        return response()->json(['is_open' => $seller->is_open]);
    }

    public function uploadImage(Request $request, string $type): JsonResponse
    {
        $request->validate(['image' => ['required', 'image', 'max:2048']]);
        $seller = $this->seller($request);
        $field  = $type === 'logo' ? 'logo_path' : 'banner_path';

        if ($seller->$field) Storage::disk('public')->delete($seller->$field);

        $path = $request->file('image')->store("mart_sellers/{$seller->id}", 'public');
        $seller->update([$field => $path]);

        return response()->json(['path' => $path]);
    }

    // ── Products ──────────────────────────────────────────────────────────────

    public function products(Request $request): JsonResponse
    {
        $products = $this->seller($request)->allProducts()
            ->with('category:id,name,icon')
            ->when($request->search, fn($q) => $q->where('name', 'like', "%{$request->search}%"))
            ->latest()
            ->paginate(20);

        return response()->json($products);
    }

    public function storeProduct(Request $request): JsonResponse
    {
        $data = $request->validate([
            'category_id'   => ['nullable', 'exists:mart_categories,id'],
            'name'          => ['required', 'string', 'max:200'],
            'description'   => ['nullable', 'string', 'max:2000'],
            'price'         => ['required', 'integer', 'min:0'],
            'compare_price' => ['nullable', 'integer', 'min:0'],
            'stock'         => ['required', 'integer', 'min:0'],
            'weight'        => ['required', 'integer', 'min:0'],
        ]);

        $seller  = $this->seller($request);
        $product = $seller->allProducts()->create(array_merge($data, [
            'slug' => Str::slug($data['name']) . '-' . Str::random(6),
        ]));

        return response()->json($product, 201);
    }

    public function updateProduct(Request $request, int $id): JsonResponse
    {
        $data = $request->validate([
            'category_id'   => ['nullable', 'exists:mart_categories,id'],
            'name'          => ['sometimes', 'string', 'max:200'],
            'description'   => ['nullable', 'string', 'max:2000'],
            'price'         => ['sometimes', 'integer', 'min:0'],
            'compare_price' => ['nullable', 'integer', 'min:0'],
            'stock'         => ['sometimes', 'integer', 'min:0'],
            'weight'        => ['sometimes', 'integer', 'min:0'],
            'is_active'     => ['sometimes', 'boolean'],
        ]);

        $product = $this->seller($request)->allProducts()->findOrFail($id);
        $product->update($data);
        return response()->json($product);
    }

    public function uploadProductImage(Request $request, int $id): JsonResponse
    {
        $request->validate(['image' => ['required', 'image', 'max:2048']]);
        $product = $this->seller($request)->allProducts()->findOrFail($id);

        $path   = $request->file('image')->store("mart_products/{$product->id}", 'public');
        $images = $product->images ?? [];
        if (count($images) >= 5) array_shift($images);
        $images[] = $path;
        $product->update(['images' => $images]);

        return response()->json(['images' => $product->images]);
    }

    public function deleteProductImage(Request $request, int $id): JsonResponse
    {
        $data    = $request->validate(['path' => ['required', 'string']]);
        $product = $this->seller($request)->allProducts()->findOrFail($id);

        Storage::disk('public')->delete($data['path']);
        $images = array_values(array_filter($product->images ?? [], fn($p) => $p !== $data['path']));
        $product->update(['images' => $images]);

        return response()->json(['images' => $product->images]);
    }

    public function deleteProduct(int $id, Request $request): JsonResponse
    {
        $product = $this->seller($request)->allProducts()->findOrFail($id);
        $product->update(['is_active' => false, 'stock' => 0]);
        return response()->json(['message' => 'Produk dinonaktifkan.']);
    }

    // ── Orders ────────────────────────────────────────────────────────────────

    public function orders(Request $request): JsonResponse
    {
        $orders = MartOrder::with(['customer:id,name,phone', 'items'])
            ->where('seller_id', $this->seller($request)->id)
            ->when($request->status, fn($q) => $q->where('status', $request->status))
            ->latest()
            ->paginate(20);

        return response()->json($orders);
    }

    public function orderDetail(Request $request, int $id): JsonResponse
    {
        $order = MartOrder::with(['customer:id,name,phone', 'items', 'mitra:id,name,phone'])
            ->where('seller_id', $this->seller($request)->id)
            ->findOrFail($id);

        return response()->json($order);
    }

    public function confirmOrder(Request $request, int $id): JsonResponse
    {
        $order = MartOrder::where('seller_id', $this->seller($request)->id)
            ->where('status', 'pending')
            ->findOrFail($id);

        $order->update(['status' => 'confirmed']);
        return response()->json(['message' => 'Pesanan dikonfirmasi.']);
    }

    public function packOrder(Request $request, int $id): JsonResponse
    {
        $order = MartOrder::where('seller_id', $this->seller($request)->id)
            ->where('status', 'confirmed')
            ->findOrFail($id);

        $order->update(['status' => 'packed', 'packed_at' => now()]);
        return response()->json(['message' => 'Pesanan ditandai siap diambil.']);
    }

    public function cancelOrder(Request $request, int $id): JsonResponse
    {
        $data  = $request->validate(['reason' => ['required', 'string', 'max:255']]);
        $order = MartOrder::where('seller_id', $this->seller($request)->id)
            ->whereIn('status', ['pending', 'confirmed'])
            ->findOrFail($id);

        $order->items->each(fn($item) => $item->product->increment('stock', $item->quantity));
        $order->update([
            'status'       => 'cancelled',
            'cancel_reason'=> $data['reason'],
            'cancelled_at' => now(),
        ]);

        return response()->json(['message' => 'Pesanan dibatalkan.']);
    }
}
