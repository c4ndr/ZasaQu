<?php

namespace App\Http\Controllers\Api\Home;

use App\Http\Controllers\Controller;
use App\Models\HomeOrder;
use App\Models\HomeOrderItem;
use App\Models\HomeProvider;
use App\Models\HomeService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CustomerController extends Controller
{
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
            'delivery_address'    => ['nullable', 'string', 'max:255'],
            'delivery_lat'        => ['nullable', 'numeric'],
            'delivery_lng'        => ['nullable', 'numeric'],
            'notes'               => ['nullable', 'string', 'max:500'],
            'scheduled_pickup_at' => ['nullable', 'date', 'after:now'],
            'items'               => ['required', 'array', 'min:1'],
            'items.*.service_id'  => ['required', 'exists:home_services,id'],
            'items.*.quantity'    => ['required', 'numeric', 'min:0.1'],
        ]);

        $provider = HomeProvider::findOrFail($data['provider_id']);

        if (!$provider->isActive()) {
            return response()->json(['message' => 'Provider tidak tersedia.'], 422);
        }

        $totalPrice = 0;
        $orderItems = [];

        foreach ($data['items'] as $item) {
            $service = HomeService::where('id', $item['service_id'])
                ->where('provider_id', $provider->id)
                ->where('is_active', true)
                ->firstOrFail();

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
            'total_price'         => $totalPrice,
            'scheduled_pickup_at' => $data['scheduled_pickup_at'] ?? null,
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

        return response()->json([
            'message' => 'Pesanan dibatalkan.',
            'data'    => $order->fresh()->load('items', 'provider'),
        ]);
    }
}
