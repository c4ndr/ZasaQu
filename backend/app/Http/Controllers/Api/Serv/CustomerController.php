<?php

namespace App\Http\Controllers\Api\Serv;

use App\Http\Controllers\Controller;
use App\Models\AdminSetting;
use App\Models\ServOrder;
use App\Models\ServOrderItem;
use App\Models\ServProvider;
use App\Models\ServService;
use App\Services\NotificationService;
use App\Services\ServOrderService;
use Illuminate\Support\Facades\DB;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CustomerController extends Controller
{
    public function __construct(
        private NotificationService $notifService,
        private ServOrderService $servOrderService,
    ) {}

    public function providers(Request $request): JsonResponse
    {
        $query = ServProvider::where('status', 'active')->with('services');

        if ($request->category) {
            $query->where('category', $request->category);
        }
        if ($request->search) {
            $query->where('name', 'like', '%' . $request->search . '%');
        }

        return response()->json($query->orderByDesc('average_rating')->paginate(20));
    }

    public function provider(ServProvider $provider): JsonResponse
    {
        if (!$provider->isActive()) {
            return response()->json(['message' => 'Provider tidak tersedia.'], 404);
        }

        return response()->json([
            'data' => $provider->load('services'),
            'meta' => [
                'consultation_enabled' => AdminSetting::valueOf('serv_consultation_enabled', '1') === '1',
            ],
        ]);
    }

    public function placeOrder(Request $request): JsonResponse
    {
        $data = $request->validate([
            'provider_id'        => ['required', 'exists:serv_providers,id'],
            'address'            => ['required', 'string', 'max:255'],
            'lat'                => ['nullable', 'numeric', 'between:-90,90'],
            'lng'                => ['nullable', 'numeric', 'between:-180,180'],
            'scheduled_at'       => ['nullable', 'date', 'after:now'],
            'notes'              => ['nullable', 'string', 'max:500'],
            'items'              => ['required', 'array', 'min:1'],
            'items.*.service_id' => ['required', 'exists:serv_services,id'],
            'items.*.quantity'   => ['required', 'numeric', 'min:0.1'],
            'items.*.notes'      => ['nullable', 'string', 'max:255'],
        ]);

        $provider = ServProvider::findOrFail($data['provider_id']);

        if (!$provider->isActive()) {
            return response()->json(['message' => 'Provider tidak tersedia.'], 422);
        }

        // Pre-load semua service — hindari N+1
        $serviceIds = collect($data['items'])->pluck('service_id')->unique();
        $services   = ServService::whereIn('id', $serviceIds)
            ->where('provider_id', $provider->id)
            ->where('is_active', true)
            ->get()
            ->keyBy('id');

        $totalPrice = 0;
        $orderItems = [];

        foreach ($data['items'] as $item) {
            $service = $services->get($item['service_id']);
            abort_if(!$service, 422, 'Layanan tidak ditemukan atau tidak aktif.');

            $subtotal = (int) ($service->price * $item['quantity']);
            $totalPrice += $subtotal;

            $orderItems[] = [
                'service_id'   => $service->id,
                'service_name' => $service->name,
                'unit'         => $service->unit,
                'quantity'     => $item['quantity'],
                'price'        => $service->price,
                'subtotal'     => $subtotal,
                'notes'        => $item['notes'] ?? null,
            ];
        }

        $commRate   = (float) AdminSetting::valueOf('serv_commission_percent', 10);
        $commission = (int) round($totalPrice * $commRate / 100);

        try {
            $this->servOrderService->placeHold($request->user(), $totalPrice);
        } catch (\Exception $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }

        $order = ServOrder::create([
            'order_number'        => ServOrder::generateNumber(),
            'customer_id'         => $request->user()->id,
            'provider_id'         => $provider->id,
            'status'              => 'pending',
            'address'             => $data['address'],
            'lat'                 => $data['lat'] ?? null,
            'lng'                 => $data['lng'] ?? null,
            'notes'               => $data['notes'] ?? null,
            'scheduled_at'        => $data['scheduled_at'] ?? null,
            'total_price'         => $totalPrice,
            'commission_rate'     => $commRate,
            'platform_commission' => $commission,
            'provider_income'     => $totalPrice - $commission,
        ]);

        foreach ($orderItems as $item) {
            $item['order_id'] = $order->id;
            ServOrderItem::create($item);
        }

        // Notifikasi ke provider
        if ($provider->user) {
            $this->notifService->servOrderPlaced(
                $provider->user, $order->order_number, $order->id, $request->user()->name
            );
        }

        return response()->json([
            'message' => 'Pesanan servis berhasil dibuat.',
            'data'    => $order->load('items', 'provider'),
        ], 201);
    }

    public function myOrders(Request $request): JsonResponse
    {
        $orders = ServOrder::where('customer_id', $request->user()->id)
            ->with('provider', 'items')
            ->orderByDesc('created_at')
            ->paginate(20);

        return response()->json($orders);
    }

    public function orderDetail(Request $request, ServOrder $order): JsonResponse
    {
        if ($order->customer_id !== $request->user()->id) {
            return response()->json(['message' => 'Tidak ditemukan.'], 404);
        }

        return response()->json(['data' => $order->load('items', 'provider')]);
    }

    public function cancelOrder(Request $request, ServOrder $order): JsonResponse
    {
        if ($order->customer_id !== $request->user()->id) {
            return response()->json(['message' => 'Tidak ditemukan.'], 404);
        }

        if (!$order->canCancel()) {
            return response()->json(['message' => 'Pesanan tidak bisa dibatalkan pada status ini.'], 422);
        }

        $data = $request->validate([
            'reason' => ['nullable', 'string', 'max:255'],
        ]);

        $order->update([
            'status'        => 'cancelled',
            'cancel_reason' => $data['reason'] ?? 'Dibatalkan oleh pelanggan',
        ]);

        $this->servOrderService->releaseHold($order);

        return response()->json([
            'message' => 'Pesanan dibatalkan.',
            'data'    => $order->fresh()->load('items', 'provider'),
        ]);
    }

    public function rateOrder(Request $request, ServOrder $order): JsonResponse
    {
        if ($order->customer_id !== $request->user()->id) {
            return response()->json(['message' => 'Tidak ditemukan.'], 404);
        }

        if ($order->status !== 'completed') {
            return response()->json(['message' => 'Pesanan belum selesai.'], 422);
        }

        if ($order->rated_at) {
            return response()->json(['message' => 'Pesanan sudah dinilai.'], 422);
        }

        $data = $request->validate([
            'score'   => ['required', 'integer', 'min:1', 'max:5'],
            'comment' => ['nullable', 'string', 'max:500'],
        ]);

        $order->update([
            'provider_score'   => $data['score'],
            'provider_comment' => $data['comment'] ?? null,
            'rated_at'         => now(),
        ]);

        $stats = ServOrder::where('provider_id', $order->provider_id)
            ->whereNotNull('provider_score')
            ->selectRaw('AVG(provider_score) as avg, COUNT(*) as total')
            ->first();

        $order->provider()->update([
            'average_rating' => round((float) $stats->avg, 2),
            'total_ratings'  => (int) $stats->total,
        ]);

        return response()->json(['message' => 'Rating berhasil dikirim.']);
    }
}
