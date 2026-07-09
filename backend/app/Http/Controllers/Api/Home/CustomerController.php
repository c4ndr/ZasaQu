<?php

namespace App\Http\Controllers\Api\Home;

use App\Http\Controllers\Controller;
use App\Models\AdminSetting;
use App\Models\HomeOrder;
use App\Models\HomeOrderItem;
use App\Models\HomeProvider;
use App\Models\HomeService;
use App\Services\HomeOrderService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CustomerController extends Controller
{
    public function __construct(private HomeOrderService $homeOrderService) {}

    public function providers(Request $request): JsonResponse
    {
        $query = HomeProvider::where('status', 'active')
            ->with('services');

        if ($request->category) {
            $query->where('category', $request->category);
        }
        if ($request->search) {
            $query->where('name', 'like', '%' . $request->search . '%');
        }

        $providers = $query->orderByDesc('average_rating')->paginate(20);

        return response()->json($providers);
    }

    public function provider(HomeProvider $provider): JsonResponse
    {
        if (!$provider->isActive()) {
            return response()->json(['message' => 'Provider tidak tersedia.'], 404);
        }

        return response()->json([
            'data' => $provider->load('services'),
        ]);
    }

    public function placeOrder(Request $request): JsonResponse
    {
        $data = $request->validate([
            'provider_id'         => ['required', 'exists:home_providers,id'],
            'pickup_address'      => ['required', 'string', 'max:255'],
            'pickup_lat'          => ['nullable', 'numeric'],
            'pickup_lng'          => ['nullable', 'numeric'],
            'pickup_type'         => ['nullable', 'in:antar_jemput,mandiri,on_site'],
            'scheduled_at'        => ['nullable', 'date', 'after:now'],
            'delivery_address'    => ['nullable', 'string', 'max:255'],
            'delivery_lat'        => ['nullable', 'numeric'],
            'delivery_lng'        => ['nullable', 'numeric'],
            'notes'               => ['nullable', 'string', 'max:500'],
            'items'               => ['required', 'array', 'min:1'],
            'items.*.service_id'  => ['required', 'exists:home_services,id'],
            'items.*.quantity'    => ['required', 'numeric', 'min:0.1'],
        ]);

        $provider = HomeProvider::findOrFail($data['provider_id']);

        if (!$provider->isActive()) {
            return response()->json(['message' => 'Provider tidak tersedia.'], 422);
        }

        $onSiteCategories = ['pijat', 'cleaning', 'tukang', 'cukur', 'lainnya'];
        $isOnSite         = in_array($provider->category, $onSiteCategories);

        // On-site: provider selalu datang ke pelanggan, tidak ada pilihan pickup
        $pickupType = $isOnSite ? 'on_site' : ($data['pickup_type'] ?? 'mandiri');
        $pickupFee  = (!$isOnSite && $pickupType === 'antar_jemput' && $provider->offers_pickup)
            ? (int) ($provider->pickup_fee ?? 0)
            : 0;

        if (!$isOnSite && $pickupType === 'antar_jemput' && !$provider->offers_pickup) {
            return response()->json(['message' => 'Provider ini tidak menyediakan layanan antar jemput.'], 422);
        }

        $totalPrice = 0;
        $orderItems = [];

        // Pre-load semua service sekaligus — hindari N+1 query per item
        $serviceIds = collect($data['items'])->pluck('service_id')->unique();
        $services   = HomeService::whereIn('id', $serviceIds)
            ->where('provider_id', $provider->id)
            ->where('is_active', true)
            ->get()
            ->keyBy('id');

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
            ];
        }

        // Komisi platform hanya dari harga jasa (bukan pickup fee — itu milik mitra)
        $commRate        = (float) AdminSetting::valueOf('home_commission_percent', 10);
        $commission      = (int) round($totalPrice * $commRate / 100);
        $providerIncome  = $totalPrice - $commission;
        // Mitra kurir mendapat seluruh pickup_fee (ongkos antar-jemput)
        // On-site: pickup_fee = 0, mitra_income = 0
        $mitraIncome     = $pickupFee;
        $grandTotal      = $totalPrice + $pickupFee;

        try {
            $this->homeOrderService->placeHold($request->user(), $grandTotal);
        } catch (\Exception $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }

        $order = HomeOrder::create([
            'order_number'        => HomeOrder::generateNumber(),
            'customer_id'         => $request->user()->id,
            'provider_id'         => $provider->id,
            'status'              => 'pending',
            'pickup_address'      => $data['pickup_address'],
            'pickup_lat'          => $data['pickup_lat'] ?? null,
            'pickup_lng'          => $data['pickup_lng'] ?? null,
            'delivery_address'    => $data['delivery_address'] ?? null,
            'delivery_lat'        => $data['delivery_lat'] ?? null,
            'delivery_lng'        => $data['delivery_lng'] ?? null,
            'notes'               => $data['notes'] ?? null,
            'pickup_type'         => $pickupType,
            'pickup_fee'          => $pickupFee,
            'total_price'         => $totalPrice + $pickupFee,
            'scheduled_pickup_at' => $data['scheduled_at'] ?? null,
            'commission_rate'     => $commRate,
            'platform_commission' => $commission,
            'provider_income'     => $providerIncome,
            'mitra_income'        => $mitraIncome,
        ]);

        foreach ($orderItems as $item) {
            $item['order_id'] = $order->id;
            HomeOrderItem::create($item);
        }

        return response()->json([
            'message' => 'Pesanan berhasil dibuat.',
            'data'    => $order->load('items', 'provider'),
        ], 201);
    }

    public function myOrders(Request $request): JsonResponse
    {
        $orders = HomeOrder::where('customer_id', $request->user()->id)
            ->with('provider', 'items')
            ->orderByDesc('created_at')
            ->paginate(20);

        return response()->json($orders);
    }

    public function orderDetail(Request $request, HomeOrder $order): JsonResponse
    {
        if ($order->customer_id !== $request->user()->id) {
            return response()->json(['message' => 'Tidak ditemukan.'], 404);
        }

        return response()->json([
            'data' => $order->load('items', 'provider'),
        ]);
    }

    public function cancelOrder(Request $request, HomeOrder $order): JsonResponse
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

        $this->homeOrderService->releaseHold($order);

        return response()->json([
            'message' => 'Pesanan dibatalkan.',
            'data'    => $order->fresh()->load('items', 'provider'),
        ]);
    }
}
