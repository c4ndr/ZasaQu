<?php

namespace App\Http\Controllers\Api\Serv;

use App\Http\Controllers\Controller;
use App\Models\ChatRoom;
use App\Models\ServOrder;
use App\Models\ServProvider;
use App\Models\ServService;
use App\Models\User;
use App\Services\NotificationService;
use App\Services\ServOrderService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;

class ProviderController extends Controller
{
    public function __construct(private ServOrderService $servOrderService) {}
    private function provider(Request $request): ?ServProvider
    {
        return $request->user()->servProvider;
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
            'name'              => ['sometimes', 'string', 'max:100'],
            'description'       => ['sometimes', 'nullable', 'string'],
            'address'           => ['sometimes', 'string', 'max:255'],
            'lat'               => ['sometimes', 'nullable', 'numeric', 'between:-90,90'],
            'lng'               => ['sometimes', 'nullable', 'numeric', 'between:-180,180'],
            'phone'             => ['sometimes', 'nullable', 'string', 'max:20'],
            'open_time'         => ['sometimes', 'nullable', 'date_format:H:i'],
            'close_time'        => ['sometimes', 'nullable', 'date_format:H:i'],
            'specializations'   => ['sometimes', 'nullable', 'array'],
            'specializations.*' => ['string', 'max:60'],
            'skill_level'       => ['sometimes', 'nullable', 'in:pemula,terlatih,berpengalaman,profesional,master'],
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

    public function uploadImageBase64(Request $request, string $type): JsonResponse
    {
        if (!in_array($type, ['logo', 'banner'])) abort(404);

        $provider = $this->provider($request);
        if (!$provider) return response()->json(['message' => 'Provider tidak ditemukan.'], 404);

        $data = $request->validate([
            'data' => ['required', 'string'],
            'mime' => ['required', 'in:image/jpeg,image/png,image/webp'],
        ]);

        $old    = $provider->{"{$type}_path"};
        $binary = base64_decode(preg_replace('/^data:image\/\w+;base64,/', '', $data['data']));
        $ext    = match($data['mime']) { 'image/png' => 'png', 'image/webp' => 'webp', default => 'jpg' };
        $path   = "serv_providers/{$provider->id}/{$type}.{$ext}";

        Storage::disk('public')->put($path, $binary);
        $provider->update(["{$type}_path" => $path]);
        if ($old && $old !== $path) Storage::disk('public')->delete($old);

        return response()->json(['message' => ucfirst($type) . ' berhasil diupload.', "{$type}_path" => $path]);
    }

    // ── Services CRUD ────────────────────────────────────────────────────────

    public function storeService(Request $request): JsonResponse
    {
        $provider = $this->provider($request);
        if (!$provider) return response()->json(['message' => 'Provider tidak ditemukan.'], 404);

        $data = $request->validate([
            'name'            => ['required', 'string', 'max:100'],
            'description'     => ['nullable', 'string'],
            'unit'            => ['required', 'in:item,jam,sesi,titik,meter'],
            'price'           => ['required', 'integer', 'min:100'],
            'min_order'       => ['nullable', 'numeric', 'min:0.1'],
            'estimated_hours' => ['nullable', 'integer', 'min:1', 'max:168'],
        ]);

        $service = $provider->allServices()->create($data);

        return response()->json(['message' => 'Layanan ditambahkan.', 'data' => $service], 201);
    }

    public function updateService(Request $request, ServService $service): JsonResponse
    {
        $provider = $this->provider($request);
        if (!$provider || $service->provider_id !== $provider->id) {
            return response()->json(['message' => 'Tidak ditemukan.'], 404);
        }

        $data = $request->validate([
            'name'            => ['sometimes', 'string', 'max:100'],
            'description'     => ['sometimes', 'nullable', 'string'],
            'unit'            => ['sometimes', 'in:item,jam,sesi,titik,meter'],
            'price'           => ['sometimes', 'integer', 'min:100'],
            'min_order'       => ['sometimes', 'nullable', 'numeric', 'min:0.1'],
            'estimated_hours' => ['sometimes', 'nullable', 'integer', 'min:1'],
            'is_active'       => ['sometimes', 'boolean'],
        ]);

        $service->update($data);

        return response()->json(['message' => 'Layanan diperbarui.', 'data' => $service->fresh()]);
    }

    public function deleteService(Request $request, ServService $service): JsonResponse
    {
        $provider = $this->provider($request);
        if (!$provider || $service->provider_id !== $provider->id) {
            return response()->json(['message' => 'Tidak ditemukan.'], 404);
        }

        $service->update(['is_active' => false]);

        return response()->json(['message' => 'Layanan dinonaktifkan.']);
    }

    // ── Konsultasi ───────────────────────────────────────────────────────────

    public function consultations(Request $request): JsonResponse
    {
        $provider = $this->provider($request);
        if (!$provider) return response()->json(['message' => 'Provider tidak ditemukan.'], 404);

        $rooms = ChatRoom::where('order_type', 'zasaserv_consult')
            ->where('provider_id', $provider->id)
            ->withCount('messages')
            ->orderByDesc('updated_at')
            ->get()
            ->map(function ($room) {
                $lastMsg  = $room->messages()->with('sender:id,name')->latest()->first();
                $customer = User::find($room->customer_id, ['id', 'name']);
                return [
                    'id'           => $room->id,
                    'customer'     => $customer,
                    'last_message' => $lastMsg ? ['content' => $lastMsg->content, 'created_at' => $lastMsg->created_at, 'sender_name' => $lastMsg->sender?->name] : null,
                    'updated_at'   => $room->updated_at,
                    'is_suspended' => $room->is_suspended,
                ];
            });

        return response()->json(['data' => $rooms]);
    }

    // ── Orders ───────────────────────────────────────────────────────────────

    public function orders(Request $request): JsonResponse
    {
        $provider = $this->provider($request);
        if (!$provider) return response()->json(['message' => 'Provider tidak ditemukan.'], 404);

        $query = $provider->orders()->with('customer', 'items')->orderByDesc('created_at');
        if ($request->status) $query->where('status', $request->status);

        return response()->json($query->paginate(min((int) ($request->per_page ?? 20), 100)));
    }

    public function updateOrderStatus(Request $request, ServOrder $order): JsonResponse
    {
        $provider = $this->provider($request);
        if (!$provider || $order->provider_id !== $provider->id) {
            return response()->json(['message' => 'Tidak ditemukan.'], 404);
        }

        $allowed = [
            'pending'     => ['confirmed', 'cancelled'],
            'confirmed'   => ['traveling', 'cancelled'],
            'traveling'   => ['in_progress'],
            'in_progress' => ['completed'],
        ];

        $data = $request->validate([
            'status'        => ['required', 'string'],
            'cancel_reason' => ['nullable', 'string', 'max:255'],
        ]);

        $current = $order->status;
        $next    = $data['status'];
        $valid   = $allowed[$current] ?? [];

        if (!in_array($next, $valid)) {
            return response()->json(['message' => "Tidak bisa ubah status dari {$current} ke {$next}."], 422);
        }

        DB::transaction(function () use ($order, $current, $next, $data) {
            $locked = ServOrder::lockForUpdate()->findOrFail($order->id);

            if ($locked->status !== $current) {
                throw new \Exception("Status pesanan sudah berubah menjadi: {$locked->status}.");
            }

            $updates = ['status' => $next];
            if ($next === 'cancelled')    $updates['cancel_reason']   = $data['cancel_reason'] ?? 'Dibatalkan oleh provider';
            if ($next === 'confirmed')    $updates['confirmed_at']    = now();
            if ($next === 'traveling')    $updates['traveling_at']    = now();
            if ($next === 'in_progress')  $updates['in_progress_at']  = now();
            if ($next === 'completed')    $updates['completed_at']    = now();

            $locked->update($updates);

            $order->setRawAttributes($locked->fresh()->getAttributes());
        });

        // Settle pembayaran — idempoten, aman bila mitra sudah klik selesai lebih dulu
        if ($next === 'completed') {
            $this->servOrderService->settle($order->fresh());
        } elseif ($next === 'cancelled') {
            $this->servOrderService->releaseHold($order->fresh());
        }

        $fresh    = $order->fresh()->load('customer', 'items');
        $customer = $fresh->customer;
        $notif    = app(NotificationService::class);

        match ($next) {
            'confirmed'   => $notif->servOrderConfirmed($customer, $fresh->order_number, $fresh->id, $provider->name),
            'traveling'   => $notif->servOrderTraveling($customer, $fresh->order_number, $fresh->id),
            'in_progress' => $notif->servOrderInProgress($customer, $fresh->order_number, $fresh->id),
            'completed'   => $notif->servOrderCompleted($customer, $fresh->order_number, $fresh->id),
            'cancelled'   => $notif->servOrderCancelled($customer, $fresh->order_number, $fresh->id, $data['cancel_reason'] ?? 'Dibatalkan provider'),
            default       => null,
        };

        return response()->json([
            'message' => 'Status pesanan diperbarui.',
            'data'    => $fresh,
        ]);
    }
}
