<?php

namespace App\Http\Controllers\Api\Ride;

use App\Events\RideOrderPlaced;
use App\Events\RideStatusUpdated;
use App\Http\Controllers\Controller;
use App\Models\RideFare;
use App\Models\RideOrder;
use App\Models\Wallet;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class CustomerController extends Controller
{
    // Estimasi harga sebelum pesan
    public function estimate(Request $request): JsonResponse
    {
        $data = $request->validate([
            'vehicle_type'    => ['required', 'in:motor,mobil'],
            'pickup_lat'      => ['required', 'numeric', 'between:-90,90'],
            'pickup_lng'      => ['required', 'numeric', 'between:-180,180'],
            'destination_lat' => ['required', 'numeric', 'between:-90,90'],
            'destination_lng' => ['required', 'numeric', 'between:-180,180'],
        ]);

        $fare = RideFare::where('vehicle_type', $data['vehicle_type'])->where('is_active', true)->first();
        if (!$fare) return response()->json(['message' => 'Tarif tidak tersedia untuk kendaraan ini.'], 422);

        $straight = RideOrder::straightDistance(
            $data['pickup_lat'], $data['pickup_lng'],
            $data['destination_lat'], $data['destination_lng'],
        );
        $calc = $fare->calculateFare($straight);

        return response()->json([
            'vehicle_type'   => $data['vehicle_type'],
            'straight_km'    => round($straight, 2),
            'distance_km'    => $calc['distance_km'],
            'fare'           => $calc['fare'],
            'base_fare'      => (float) $fare->base_fare,
            'per_km_fare'    => (float) $fare->per_km_fare,
            'minimum_fare'   => (float) $fare->minimum_fare,
        ]);
    }

    // Buat order baru
    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'vehicle_type'        => ['required', 'in:motor,mobil'],
            'ride_type'           => ['nullable', 'in:regular,school'],
            'passenger_name'      => ['nullable', 'string', 'max:100'],
            'school_name'         => ['nullable', 'string', 'max:150'],
            'pickup_address'      => ['required', 'string', 'max:255'],
            'pickup_lat'          => ['required', 'numeric', 'between:-90,90'],
            'pickup_lng'          => ['required', 'numeric', 'between:-180,180'],
            'destination_address' => ['required', 'string', 'max:255'],
            'destination_lat'     => ['required', 'numeric', 'between:-90,90'],
            'destination_lng'     => ['required', 'numeric', 'between:-180,180'],
            'payment_method'      => ['required', 'in:wallet,cod'],
            'notes'               => ['nullable', 'string', 'max:255'],
        ]);

        if (($data['ride_type'] ?? 'regular') === 'school') {
            if (empty($data['passenger_name'])) return response()->json(['message' => 'Nama anak wajib diisi untuk antar sekolah.'], 422);
            if (empty($data['school_name']))    return response()->json(['message' => 'Nama sekolah wajib diisi.'], 422);
        }

        $user = $request->user();

        // Pastikan tidak ada ride aktif
        $active = RideOrder::where('customer_id', $user->id)
            ->whereIn('status', ['pending', 'accepted', 'on_pickup', 'on_ride'])
            ->exists();
        if ($active) return response()->json(['message' => 'Anda masih memiliki perjalanan yang aktif.'], 422);

        $fare = RideFare::where('vehicle_type', $data['vehicle_type'])->where('is_active', true)->first();
        if (!$fare) return response()->json(['message' => 'Tarif tidak tersedia.'], 422);

        $straight = RideOrder::straightDistance(
            $data['pickup_lat'], $data['pickup_lng'],
            $data['destination_lat'], $data['destination_lng'],
        );
        $calc = $fare->calculateFare($straight);

        // Cek saldo wallet kalau bayar wallet
        if ($data['payment_method'] === 'wallet') {
            $wallet = Wallet::where('user_id', $user->id)->first();
            if (!$wallet || $wallet->balance < $calc['fare']) {
                return response()->json(['message' => 'Saldo wallet tidak cukup.'], 422);
            }
        }

        $order = DB::transaction(function () use ($data, $user, $calc) {
            return RideOrder::create([
                'order_number'        => RideOrder::generateNumber(),
                'customer_id'         => $user->id,
                'vehicle_type'        => $data['vehicle_type'],
                'ride_type'           => $data['ride_type'] ?? 'regular',
                'passenger_name'      => $data['passenger_name'] ?? null,
                'school_name'         => $data['school_name'] ?? null,
                'pickup_address'      => $data['pickup_address'],
                'pickup_lat'          => $data['pickup_lat'],
                'pickup_lng'          => $data['pickup_lng'],
                'destination_address' => $data['destination_address'],
                'destination_lat'     => $data['destination_lat'],
                'destination_lng'     => $data['destination_lng'],
                'distance_km'         => $calc['distance_km'],
                'fare'                => $calc['fare'],
                'platform_commission' => $calc['platform_commission'],
                'mitra_income'        => $calc['mitra_income'],
                'payment_method'      => $data['payment_method'],
                'status'              => 'pending',
                'notes'               => $data['notes'] ?? null,
            ]);
        });

        broadcast(new RideOrderPlaced($order))->toOthers();

        return response()->json($order->load('customer'), 201);
    }

    // Daftar order customer
    public function index(Request $request): JsonResponse
    {
        $orders = RideOrder::where('customer_id', $request->user()->id)
            ->with('mitra')
            ->latest()
            ->paginate(20);
        return response()->json($orders);
    }

    // Detail order
    public function show(Request $request, int $id): JsonResponse
    {
        $order = RideOrder::where('customer_id', $request->user()->id)
            ->with(['customer', 'mitra'])
            ->findOrFail($id);
        return response()->json($order);
    }

    // Batalkan order (hanya saat pending)
    public function cancel(Request $request, int $id): JsonResponse
    {
        $order = RideOrder::where('customer_id', $request->user()->id)
            ->whereIn('status', ['pending'])
            ->findOrFail($id);

        $prev = $order->status;
        $order->update([
            'status'        => 'cancelled',
            'cancel_reason' => $request->input('reason', 'Dibatalkan oleh pelanggan'),
            'cancelled_at'  => now(),
        ]);

        broadcast(new RideStatusUpdated($order, $prev));
        return response()->json(['message' => 'Order dibatalkan.']);
    }
}
