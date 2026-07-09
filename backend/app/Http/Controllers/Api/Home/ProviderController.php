<?php

namespace App\Http\Controllers\Api\Home;

use App\Http\Controllers\Controller;
use App\Http\Traits\CompressesImage;
use App\Models\HomeOrder;
use App\Models\HomeProvider;
use App\Models\HomeService;
use App\Services\HomeOrderService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class ProviderController extends Controller
{
    use CompressesImage;

    public function __construct(private HomeOrderService $homeOrderService) {}

    private function provider(Request $request): HomeProvider
    {
        return $request->user()->homeProvider;
    }

    public function profile(Request $request): JsonResponse
    {
        $provider = $this->provider($request);
        if (!$provider) return response()->json(['message' => 'Profil provider tidak ditemukan.'], 404);

        return response()->json(['data' => $provider->load('allServices', 'user')]);
    }

    public function updateProfile(Request $request): JsonResponse
    {
        $provider = $this->provider($request);
        if (!$provider) return response()->json(['message' => 'Profil provider tidak ditemukan.'], 404);

        $data = $request->validate([
            'name'          => ['sometimes', 'string', 'max:100'],
            'description'   => ['sometimes', 'nullable', 'string'],
            'address'       => ['sometimes', 'string', 'max:255'],
            'lat'           => ['sometimes', 'nullable', 'numeric', 'between:-90,90'],
            'lng'           => ['sometimes', 'nullable', 'numeric', 'between:-180,180'],
            'phone'         => ['sometimes', 'nullable', 'string', 'max:20'],
            'open_time'     => ['sometimes', 'nullable', 'date_format:H:i'],
            'close_time'    => ['sometimes', 'nullable', 'date_format:H:i'],
            'offers_pickup'    => ['sometimes', 'boolean'],
            'pickup_fee'       => ['sometimes', 'nullable', 'integer', 'min:0'],
            'specializations'   => ['sometimes', 'nullable', 'array'],
            'specializations.*' => ['string', 'max:60'],
            'skill_level'       => ['sometimes', 'nullable', 'string', 'in:pemula,terlatih,berpengalaman,profesional,master'],
            'experience_years'  => ['sometimes', 'nullable', 'integer', 'min:0', 'max:60'],
            'certificates'      => ['sometimes', 'nullable', 'array', 'max:10'],
            'certificates.*'    => ['string', 'max:120'],
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
        $path = $this->compressAndStore($request->file('image'), "home_providers/{$provider->id}", "{$type}.jpg");

        $provider->update(["{$type}_path" => $path]);
        if ($old && $old !== $path) Storage::disk('public')->delete($old);

        return response()->json([
            'message'           => ucfirst($type) . ' berhasil diupload.',
            "{$type}_path"      => $path,
        ]);
    }

    public function uploadImageBase64(Request $request, string $type): JsonResponse
    {
        if (!in_array($type, ['logo', 'banner'])) abort(404);

        $provider = $this->provider($request);
        if (!$provider) return response()->json(['message' => 'Provider tidak ditemukan.'], 404);

        $data = $request->validate([
            'data' => ['required', 'string'],
            'mime' => ['required', 'string', 'in:image/jpeg,image/png,image/webp,image/gif'],
        ]);

        $old    = $provider->{"{$type}_path"};
        $binary = base64_decode(preg_replace('/^data:image\/\w+;base64,/', '', $data['data']));
        $path   = $this->compressBinaryAndStore($binary, $data['mime'], "home_providers/{$provider->id}", "{$type}.jpg");
        $provider->update(["{$type}_path" => $path]);
        if ($old && $old !== $path) Storage::disk('public')->delete($old);

        return response()->json([
            'message'      => ucfirst($type) . ' berhasil diupload.',
            "{$type}_path" => $path,
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
        $query  = $provider->orders()->with('customer', 'items', 'provider')->orderByDesc('created_at');

        if ($status) $query->where('status', $status);

        $perPage = min((int) ($request->per_page ?? 20), 100);
        return response()->json($query->paginate($perPage));
    }

    public function updateOrderStatus(Request $request, HomeOrder $order): JsonResponse
    {
        $provider = $this->provider($request);
        if (!$provider || $order->provider_id !== $provider->id) {
            return response()->json(['message' => 'Tidak ditemukan.'], 404);
        }

        $onSiteCategories = ['pijat', 'cleaning', 'tukang', 'cukur', 'lainnya'];
        $isOnSite         = in_array($provider->category, $onSiteCategories);

        $allowed = $isOnSite ? [
            'pending'     => ['confirmed', 'cancelled'],
            'confirmed'   => ['traveling', 'cancelled'],
            'traveling'   => ['in_progress'],
            'in_progress' => ['completed'],
        ] : [
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

        \Illuminate\Support\Facades\DB::transaction(function () use ($order, $current, $next, $data) {
            // Lock baris order agar concurrent update tidak double-settle
            $locked = HomeOrder::lockForUpdate()->findOrFail($order->id);

            // Re-check status setelah lock — cegah double-settle jika dua request masuk bersamaan
            if ($locked->status !== $current) {
                throw new \Exception("Status pesanan sudah berubah menjadi: {$locked->status}.");
            }

            $updates = ['status' => $next];
            if ($next === 'cancelled')  $updates['cancel_reason'] = $data['cancel_reason'] ?? 'Dibatalkan oleh provider';
            if ($next === 'ready')      $updates['ready_at']      = now();
            if ($next === 'completed')  $updates['completed_at']  = now();

            $locked->update($updates);

            // Sync ke objek $order agar fresh() benar
            $order->setRawAttributes($locked->fresh()->getAttributes());
        });

        // Settle pembayaran di luar transaction status — idempoten, aman bila mitra
        // sudah klik selesai lebih dulu (settled_at guard mencegah double credit)
        if ($next === 'completed') {
            $this->homeOrderService->settle($order->fresh());
        } elseif ($next === 'cancelled') {
            $this->homeOrderService->releaseHold($order->fresh());
        }

        return response()->json([
            'message' => 'Status pesanan diperbarui.',
            'data'    => $order->fresh()->load('customer', 'items'),
        ]);
    }
}
