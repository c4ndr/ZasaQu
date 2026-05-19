<?php

namespace App\Http\Controllers\Api\Food;

use App\Http\Controllers\Controller;
use App\Models\FoodMerchant;
use App\Models\FoodOrder;
use App\Services\FoodOrderService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Redis;

class FoodOrderController extends Controller
{
    public function __construct(private FoodOrderService $foodOrderService) {}

    // ── Browse merchant (publik, tapi butuh login) ────────────────────────────

    public function indexMerchants(Request $request): JsonResponse
    {
        $merchants = FoodMerchant::where('status', 'active')
            ->when($request->category, fn($q) => $q->where('category', $request->category))
            ->when($request->search,   fn($q) => $q->where('name', 'like', "%{$request->search}%"))
            ->withCount('menuItems')
            ->orderByDesc('average_rating')
            ->get();

        // Hitung jarak jika ada koordinat
        if ($request->lat && $request->lng) {
            $lat = (float) $request->lat;
            $lng = (float) $request->lng;
            $merchants = $merchants->map(function ($m) use ($lat, $lng) {
                $R    = 6371;
                $dLat = deg2rad($m->lat - $lat);
                $dLng = deg2rad($m->lng - $lng);
                $a    = sin($dLat/2)**2 + cos(deg2rad($lat))*cos(deg2rad($m->lat))*sin($dLng/2)**2;
                $m->distance_km = round($R * 2 * atan2(sqrt($a), sqrt(1-$a)), 1);
                return $m;
            })->sortBy('distance_km')->values();
        }

        return response()->json(['data' => $merchants]);
    }

    public function showMerchant(int $id): JsonResponse
    {
        $merchant = FoodMerchant::where('status', 'active')
            ->with(['categories' => fn($q) => $q->where('is_active', true)->with(['items' => fn($q2) => $q2->where('is_available', true)->orderBy('sort_order')])])
            ->findOrFail($id);

        return response()->json(['data' => $merchant]);
    }

    // ── Estimasi ongkir ────────────────────────────────────────────────────────

    public function estimateDelivery(Request $request): JsonResponse
    {
        $request->validate([
            'merchant_id'  => ['required', 'integer', 'exists:food_merchants,id'],
            'delivery_lat' => ['required', 'numeric', 'between:-90,90'],
            'delivery_lng' => ['required', 'numeric', 'between:-180,180'],
        ]);

        $merchant = FoodMerchant::findOrFail($request->merchant_id);

        // Pakai OSRM atau fallback Haversine (reuse ShippingController logic)
        $distKm = $this->roadDistance(
            $merchant->lat, $merchant->lng,
            (float) $request->delivery_lat, (float) $request->delivery_lng
        );

        $base  = (int) \App\Models\AdminSetting::valueOf('shipping_motor_base', 5000);
        $perKm = (int) \App\Models\AdminSetting::valueOf('shipping_motor_per_km', 3000);
        $fee   = (int) (ceil(($base + max($distKm, 1) * $perKm) / 100) * 100);

        $speedKmh = 30;
        $deliveryMins = (int) ceil(($distKm / $speedKmh) * 60);

        return response()->json([
            'distance_km'       => $distKm,
            'delivery_fee'      => $fee,
            'estimated_minutes' => $deliveryMins,
        ]);
    }

    // ── Order CRUD ────────────────────────────────────────────────────────────

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'merchant_id'      => ['required', 'integer', 'exists:food_merchants,id'],
            'items'            => ['required', 'array', 'min:1'],
            'items.*.menu_item_id' => ['required', 'integer', 'exists:food_menu_items,id'],
            'items.*.quantity' => ['required', 'integer', 'min:1', 'max:50'],
            'items.*.notes'    => ['nullable', 'string', 'max:200'],
            'delivery_address' => ['required', 'string', 'max:255'],
            'delivery_lat'     => ['required', 'numeric', 'between:-90,90'],
            'delivery_lng'     => ['required', 'numeric', 'between:-180,180'],
            'delivery_fee'     => ['required', 'integer', 'min:0'],
            'payment_method'   => ['required', 'in:wallet,cod'],
            'notes'            => ['nullable', 'string', 'max:500'],
        ]);

        try {
            $order = $this->foodOrderService->createOrder($request->user(), $data);
        } catch (\Exception $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }

        return response()->json([
            'message' => 'Order berhasil dibuat.',
            'data'    => $order->load('items', 'merchant'),
        ], 201);
    }

    public function index(Request $request): JsonResponse
    {
        $orders = FoodOrder::where('customer_id', $request->user()->id)
            ->with(['merchant:id,name,slug,logo_path', 'items'])
            ->when($request->status, fn($q) => $q->where('status', $request->status))
            ->latest()
            ->paginate(15);

        return response()->json($orders);
    }

    public function show(Request $request, int $id): JsonResponse
    {
        $order = FoodOrder::where('customer_id', $request->user()->id)
            ->with(['merchant', 'items', 'mitra:id,name,phone'])
            ->findOrFail($id);

        // Sertakan GPS mitra jika order aktif
        $gps = null;
        if ($order->mitra_id && in_array($order->status, ['mitra_on_pickup', 'picked_up', 'on_delivery'])) {
            $raw = Redis::get("gps:mitra:{$order->mitra_id}");
            $gps = $raw ? json_decode($raw, true) : null;
        }

        return response()->json(['data' => $order, 'mitra_gps' => $gps]);
    }

    public function cancel(Request $request, int $id): JsonResponse
    {
        $order = FoodOrder::where('customer_id', $request->user()->id)->findOrFail($id);

        try {
            $this->foodOrderService->customerCancel($order);
        } catch (\Exception $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }

        return response()->json(['message' => 'Order berhasil dibatalkan.']);
    }

    public function confirm(Request $request, int $id): JsonResponse
    {
        $order = FoodOrder::where('customer_id', $request->user()->id)->findOrFail($id);

        try {
            $this->foodOrderService->customerConfirm($order);
        } catch (\Exception $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }

        return response()->json(['message' => 'Pesanan dikonfirmasi selesai. Terima kasih!']);
    }

    public function rate(Request $request, int $id): JsonResponse
    {
        $order = FoodOrder::where('customer_id', $request->user()->id)->findOrFail($id);

        $data = $request->validate([
            'merchant_score'   => ['required', 'integer', 'min:1', 'max:5'],
            'merchant_comment' => ['nullable', 'string', 'max:500'],
            'mitra_score'      => ['nullable', 'integer', 'min:1', 'max:5'],
            'mitra_comment'    => ['nullable', 'string', 'max:500'],
        ]);

        try {
            $this->foodOrderService->submitRating($order, $request->user(), $data);
        } catch (\Exception $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }

        return response()->json(['message' => 'Rating berhasil dikirim. Terima kasih!']);
    }

    public function mitraLocation(Request $request, int $id): JsonResponse
    {
        $order = FoodOrder::where('customer_id', $request->user()->id)->findOrFail($id);

        if (!$order->mitra_id) {
            return response()->json(['location' => null, 'gps_active' => false]);
        }

        $raw = Redis::get("gps:mitra:{$order->mitra_id}");
        return response()->json([
            'location'   => $raw ? json_decode($raw, true) : null,
            'gps_active' => (bool) $raw,
        ]);
    }

    // ── OSRM / Haversine ──────────────────────────────────────────────────────

    private function roadDistance(float $lat1, float $lng1, float $lat2, float $lng2): float
    {
        $url = sprintf(
            'https://router.project-osrm.org/route/v1/driving/%s,%s;%s,%s?overview=false',
            $lng1, $lat1, $lng2, $lat2
        );
        try {
            $ctx  = stream_context_create(['http' => ['timeout' => 5, 'ignore_errors' => true]]);
            $body = @file_get_contents($url, false, $ctx);
            if ($body) {
                $data = json_decode($body, true);
                if (($data['code'] ?? '') === 'Ok' && isset($data['routes'][0]['distance'])) {
                    return round($data['routes'][0]['distance'] / 1000, 1);
                }
            }
        } catch (\Throwable $e) {
            \Log::warning('OSRM failed in FoodOrderController', ['error' => $e->getMessage()]);
        }
        return round($this->haversine($lat1, $lng1, $lat2, $lng2), 1);
    }

    private function haversine(float $lat1, float $lng1, float $lat2, float $lng2): float
    {
        $R    = 6371;
        $dLat = deg2rad($lat2 - $lat1);
        $dLng = deg2rad($lng2 - $lng1);
        $a    = sin($dLat/2)**2 + cos(deg2rad($lat1))*cos(deg2rad($lat2))*sin($dLng/2)**2;
        return $R * 2 * atan2(sqrt($a), sqrt(1-$a));
    }
}
