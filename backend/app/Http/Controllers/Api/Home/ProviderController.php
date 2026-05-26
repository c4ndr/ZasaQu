<?php

namespace App\Http\Controllers\Api\Home;

use App\Http\Controllers\Controller;
use App\Models\HomeOrder;
use App\Models\HomeProvider;
use App\Models\HomeService;
use App\Services\WalletService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class ProviderController extends Controller
{
    private function provider(Request $request): HomeProvider
    {
        return $request->user()->homeProvider;
    }

    public function profile(Request $request): JsonResponse
    {
        $provider = $this->provider($request);
        if (!$provider) return response()->json(['message' => 'Profil provider tidak ditemukan.'], 404);

        return response()->json(['data' => $provider->load('allServices')]);
    }

    public function updateProfile(Request $request): JsonResponse
    {
        $provider = $this->provider($request);
        if (!$provider) return response()->json(['message' => 'Profil provider tidak ditemukan.'], 404);

        $data = $request->validate([
            'name'        => ['sometimes', 'string', 'max:100'],
            'description' => ['sometimes', 'nullable', 'string'],
            'address'     => ['sometimes', 'string', 'max:255'],
            'lat'         => ['sometimes', 'nullable', 'numeric', 'between:-90,90'],
            'lng'         => ['sometimes', 'nullable', 'numeric', 'between:-180,180'],
            'phone'       => ['sometimes', 'nullable', 'string', 'max:20'],
            'open_time'   => ['sometimes', 'nullable', 'date_format:H:i'],
            'close_time'  => ['sometimes', 'nullable', 'date_format:H:i'],
        ]);

        $provider->update($data);

        return response()->json(['message' => 'Profil diperbarui.', 'data' => $provider->fresh()->load('allServices')]);
    }

    public function toggleOpen(Request $request): JsonResponse
    {
        $provider = $this->provider($request);
        if (!$provider) return response()->json(['message' => 'Provider tidak ditemukan.'], 404);

        if (!$provider->isActive()) {
            return response()->json(['message' => 'Akun belum aktif.'], 403);
        }

        $provider->update(['is_open' => !$provider->is_open]);
        $label = $provider->is_open ? 'dibuka' : 'ditutup';

        return response()->json(['message' => "Toko {$label}.", 'is_open' => $provider->is_open]);
    }

    public function uploadImage(Request $request, string $type): JsonResponse
    {
        if (!in_array($type, ['logo', 'banner'])) abort(404);

        $provider = $this->provider($request);
        if (!$provider) return response()->json(['message' => 'Provider tidak ditemukan.'], 404);

        $request->validate(['image' => ['required', 'image', 'max:' . ($type === 'logo' ? 5120 : 10240)]]);

        $old = $provider->{"{$type}_path"};
        $path = $request->file('image')->store("home_providers/{$provider->id}", 'public');

        $provider->update(["{$type}_path" => $path]);
        if ($old && $old !== $path) Storage::disk('public')->delete($old);

        return response()->json([
            'message'           => ucfirst($type) . ' berhasil diupload.',
            "{$type}_path"      => $path,
        ]);
    }

    // ── Services CRUD ────────────────────────────────────────────────────────

    public function storeService(Request $request): JsonResponse
    {
        $provider = $this->provider($request);
        if (!$provider) return response()->json(['message' => 'Provider tidak ditemukan.'], 404);

        $data = $request->validate([
            'name'            => ['required', 'string', 'max:100'],
            'description'     => ['nullable', 'string'],
            'unit'            => ['required', 'in:kg,item,jam,sesi'],
            'price'           => ['required', 'integer', 'min:100'],
            'min_order'       => ['nullable', 'numeric', 'min:0.1'],
            'estimated_hours' => ['nullable', 'integer', 'min:1', 'max:168'],
        ]);

        $service = $provider->allServices()->create($data);

        return response()->json(['message' => 'Layanan ditambahkan.', 'data' => $service], 201);
    }

    public function updateService(Request $request, HomeService $service): JsonResponse
    {
        $provider = $this->provider($request);
        if (!$provider || $service->provider_id !== $provider->id) {
            return response()->json(['message' => 'Tidak ditemukan.'], 404);
        }

        $data = $request->validate([
            'name'            => ['sometimes', 'string', 'max:100'],
            'description'     => ['sometimes', 'nullable', 'string'],
            'unit'            => ['sometimes', 'in:kg,item,jam,sesi'],
            'price'           => ['sometimes', 'integer', 'min:100'],
            'min_order'       => ['sometimes', 'nullable', 'numeric', 'min:0.1'],
            'estimated_hours' => ['sometimes', 'nullable', 'integer', 'min:1'],
            'is_active'       => ['sometimes', 'boolean'],
        ]);

        $service->update($data);

        return response()->json(['message' => 'Layanan diperbarui.', 'data' => $service->fresh()]);
    }

    public function deleteService(Request $request, HomeService $service): JsonResponse
    {
        $provider = $this->provider($request);
        if (!$provider || $service->provider_id !== $provider->id) {
            return response()->json(['message' => 'Tidak ditemukan.'], 404);
        }

        $service->update(['is_active' => false]);

        return response()->json(['message' => 'Layanan dinonaktifkan.']);
    }

    // ── Orders ───────────────────────────────────────────────────────────────

    public function orders(Request $request): JsonResponse
    {
        $provider = $this->provider($request);
        if (!$provider) return response()->json(['message' => 'Provider tidak ditemukan.'], 404);

        $status = $request->status;
        $query  = $provider->orders()->with('customer', 'items')->orderByDesc('created_at');

        if ($status) $query->where('status', $status);

        return response()->json($query->paginate(20));
    }

    public function updateOrderStatus(Request $request, HomeOrder $order): JsonResponse
    {
        $provider = $this->provider($request);
        if (!$provider || $order->provider_id !== $provider->id) {
            return response()->json(['message' => 'Tidak ditemukan.'], 404);
        }

        $allowed = [
            'pending'    => ['confirmed', 'cancelled'],
            'confirmed'  => ['picked_up', 'cancelled'],
            'picked_up'  => ['processing'],
            'processing' => ['ready'],
            'ready'      => ['delivering', 'completed'],
            'delivering' => ['completed'],
        ];

        $data = $request->validate([
            'status'        => ['required', 'string'],
            'cancel_reason' => ['nullable', 'string', 'max:255'],
            'ready_at'      => ['nullable', 'date'],
        ]);

        $current  = $order->status;
        $next     = $data['status'];
        $valid    = $allowed[$current] ?? [];

        if (!in_array($next, $valid)) {
            return response()->json(['message' => "Tidak bisa ubah status dari {$current} ke {$next}."], 422);
        }

        $updates = ['status' => $next];
        if ($next === 'cancelled')  $updates['cancel_reason'] = $data['cancel_reason'] ?? 'Dibatalkan oleh provider';
        if ($next === 'ready')      $updates['ready_at']      = now();
        if ($next === 'completed')  $updates['completed_at']  = now();

        $order->update($updates);

        // Kredit income ke wallet provider saat order completed
        if ($next === 'completed' && $order->provider_income > 0) {
            $providerUser = $order->provider?->user;
            if ($providerUser) {
                app(WalletService::class)->credit(
                    $providerUser,
                    $order->provider_income,
                    'order_income',
                    "Pendapatan order ZasaHome #{$order->order_number}",
                    $order
                );
            }
        }

        return response()->json([
            'message' => 'Status pesanan diperbarui.',
            'data'    => $order->fresh()->load('customer', 'items'),
        ]);
    }
}
