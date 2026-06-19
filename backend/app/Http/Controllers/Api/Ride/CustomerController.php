<?php

namespace App\Http\Controllers\Api\Ride;

use App\Events\RideOrderPlaced;
use App\Events\RideStatusUpdated;
use App\Http\Controllers\Controller;
use App\Models\AdminSetting;
use App\Models\Promo;
use App\Models\RideFare;
use App\Models\RideOrder;
use App\Models\Wallet;
use App\Models\User;
use App\Services\NotificationService;
use App\Services\WalletService;
use Illuminate\Support\Facades\Redis;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class CustomerController extends Controller
{
    public function __construct(
        private WalletService $walletService,
        private NotificationService $notifService,
    ) {}
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
            'promo_code'          => ['nullable', 'string', 'max:50'],
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

        // Validasi promo jika ada
        $promoDiscount = 0;
        $validatedPromo = null;
        if (!empty($data['promo_code'])) {
            $promo = Promo::where('code', strtoupper($data['promo_code']))->where('is_active', true)->first();
            if (!$promo || !$promo->isVoucher()) {
                return response()->json(['message' => 'Kode promo tidak ditemukan.'], 422);
            }
            if ($promo->expires_at && $promo->expires_at->isPast()) {
                return response()->json(['message' => 'Kode promo sudah kedaluwarsa.'], 422);
            }
            if ($promo->max_uses !== null && $promo->used_count >= $promo->max_uses) {
                return response()->json(['message' => 'Kode promo sudah habis digunakan.'], 422);
            }
            if (!$promo->isValidForModule('zasaride')) {
                return response()->json(['message' => 'Kode promo tidak berlaku untuk ZasaRide.'], 422);
            }
            $promoDiscount = $promo->calculateDiscount((int) $calc['fare']);
            $validatedPromo = $promo;
        }

        $finalFare = max(0, (int) $calc['fare'] - $promoDiscount);

        // Hitung ulang commission dan income dari finalFare (setelah promo),
        // bukan dari $calc yang dihitung dari fare sebelum promo.
        $commissionRate   = (float) ($fare->commission_rate ?? 10);
        $finalCommission  = (int) round($finalFare * $commissionRate / 100);
        $finalMitraIncome = $finalFare - $finalCommission;

        // Cek & kunci saldo wallet kalau bayar wallet
        if ($data['payment_method'] === 'wallet') {
            if (!AdminSetting::walletEnabled()) {
                return response()->json(['message' => 'Pembayaran via wallet sementara tidak tersedia.'], 422);
            }
            $wallet = Wallet::where('user_id', $user->id)->first();
            if (!$wallet || $wallet->availableBalance() < $finalFare) {
                return response()->json(['message' => 'Saldo wallet tidak cukup.'], 422);
            }
        }

        try {
            $order = DB::transaction(function () use ($data, $user, $calc, $promoDiscount, $finalFare, $finalCommission, $finalMitraIncome, $validatedPromo) {
                // Kunci saldo agar tidak bisa dipakai order lain
                if ($data['payment_method'] === 'wallet') {
                    Wallet::lockForUpdate()->where('user_id', $user->id)
                        ->first()
                        ->increment('locked_balance', $finalFare);
                }

                $order = RideOrder::create([
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
                    'fare'                => $finalFare,
                    'platform_commission' => $finalCommission,
                    'mitra_income'        => $finalMitraIncome,
                    'payment_method'      => $data['payment_method'],
                    'status'              => 'pending',
                    'promo_code'          => $data['promo_code'] ?? null,
                    'discount_amount'     => $promoDiscount,
                    'notes'               => $data['notes'] ?? null,
                ]);

                if ($validatedPromo) {
                    // Lock promo row dan re-check max_uses sebelum increment — cegah over-redeem concurrent
                    $lockedPromo = Promo::lockForUpdate()->findOrFail($validatedPromo->id);
                    if ($lockedPromo->max_uses !== null && $lockedPromo->used_count >= $lockedPromo->max_uses) {
                        throw new \Exception('Kode promo sudah habis digunakan.');
                    }
                    $lockedPromo->increment('used_count');
                }

                return $order;
            });
        } catch (\Exception $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }

        broadcast(new RideOrderPlaced($order))->toOthers();

        // FCM push ke semua mitra yang sesuai vehicle_type dan punya token
        $mitraRole = $order->vehicle_type === 'mobil' ? 'mitra_mobil' : 'mitra_motor';
        User::where('role', $mitraRole)->whereNotNull('fcm_token')
            ->each(fn($m) => $this->notifService->newOrderAvailable($m, $order->order_number, $order->id));

        return response()->json($order->load('customer'), 201);
    }

    // Daftar order customer
    public function index(Request $request): JsonResponse
    {
        $orders = RideOrder::where('customer_id', $request->user()->id)
            ->with(['mitra', 'customerRating'])
            ->latest()
            ->paginate(20);

        $orders->getCollection()->transform(function ($order) {
            $arr = $order->toArray();
            $arr['my_rating'] = $order->customerRating;
            unset($arr['customer_rating']);
            return $arr;
        });

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
        DB::transaction(function () use ($order, $request) {
            $order->update([
                'status'        => 'cancelled',
                'cancel_reason' => $request->input('reason', 'Dibatalkan oleh pelanggan'),
                'cancelled_at'  => now(),
            ]);

            // Lepas locked_balance saat order wallet dibatalkan
            if ($order->payment_method === 'wallet') {
                $wallet = Wallet::lockForUpdate()->where('user_id', $order->customer_id)->first();
                if ($wallet) {
                    $wallet->decrement('locked_balance', min((float) $order->fare, (float) $wallet->locked_balance));
                }
            }
        });

        broadcast(new RideStatusUpdated($order, $prev));
        return response()->json(['message' => 'Order dibatalkan.']);
    }

    public function mitraLocation(Request $request, int $id): JsonResponse
    {
        $order = RideOrder::where('customer_id', $request->user()->id)->findOrFail($id);

        if (!$order->mitra_id) {
            return response()->json(['location' => null, 'gps_active' => false]);
        }

        $data = Redis::get("gps:mitra:{$order->mitra_id}");
        if (!$data) {
            return response()->json(['location' => null, 'gps_active' => false]);
        }

        return response()->json(['location' => json_decode($data, true), 'gps_active' => true]);
    }
}
