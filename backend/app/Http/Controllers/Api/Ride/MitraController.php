<?php

namespace App\Http\Controllers\Api\Ride;

use App\Events\RideStatusUpdated;
use App\Http\Controllers\Controller;
use App\Models\AdminSetting;
use App\Models\RideOrder;
use App\Models\Wallet;
use App\Services\WalletService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class MitraController extends Controller
{
    public function __construct(private WalletService $walletService) {}

    // Order tersedia (pending, sesuai vehicle_type mitra)
    public function available(Request $request): JsonResponse
    {
        $user        = $request->user();
        $vehicleType = str_contains($user->role, 'mobil') ? 'mobil' : 'motor';

        $orders = RideOrder::where('status', 'pending')
            ->where('vehicle_type', $vehicleType)
            ->with('customer')
            ->latest()
            ->get();

        return response()->json($orders);
    }

    // Order aktif mitra yang sedang ditangani
    public function active(Request $request): JsonResponse
    {
        $order = RideOrder::where('mitra_id', $request->user()->id)
            ->whereIn('status', ['accepted', 'on_pickup', 'on_ride'])
            ->with(['customer'])
            ->latest()
            ->first();
        return response()->json($order);
    }

    // Terima order
    public function accept(Request $request, int $id): JsonResponse
    {
        $user = $request->user();

        // Pastikan tidak ada ride aktif
        $hasActive = RideOrder::where('mitra_id', $user->id)
            ->whereIn('status', ['accepted', 'on_pickup', 'on_ride'])
            ->exists();
        if ($hasActive) return response()->json(['message' => 'Selesaikan perjalanan aktif terlebih dahulu.'], 422);

        // Cek saldo minimum
        $minBalance = (float) (AdminSetting::where('key', 'wallet_minimum_mitra')->value('value') ?? 0);
        if ($minBalance > 0) {
            $wallet = Wallet::where('user_id', $user->id)->first();
            if (!$wallet || $wallet->availableBalance() < $minBalance) {
                return response()->json([
                    'message' => 'Saldo tidak mencukupi untuk menerima order. Minimum: Rp '
                        . number_format($minBalance, 0, ',', '.') . '.',
                ], 422);
            }
        }

        $order = DB::transaction(function () use ($id, $user) {
            $order = RideOrder::where('status', 'pending')->lockForUpdate()->findOrFail($id);
            $order->update([
                'mitra_id'    => $user->id,
                'status'      => 'accepted',
                'accepted_at' => now(),
            ]);
            return $order;
        });

        broadcast(new RideStatusUpdated($order->fresh(['mitra']), 'pending'));
        return response()->json($order->load(['customer', 'mitra']));
    }

    // Update status perjalanan
    public function updateStatus(Request $request, int $id): JsonResponse
    {
        $data = $request->validate([
            'status' => ['required', 'in:on_pickup,on_ride,completed,cancelled'],
            'reason' => ['nullable', 'string', 'max:255'],
        ]);

        $order = RideOrder::where('mitra_id', $request->user()->id)
            ->whereIn('status', ['accepted', 'on_pickup', 'on_ride'])
            ->findOrFail($id);

        $prev      = $order->status;
        $newStatus = $data['status'];

        // Validasi alur status
        $allowed = [
            'accepted'  => ['on_pickup', 'cancelled'],
            'on_pickup' => ['on_ride', 'cancelled'],
            'on_ride'   => ['completed'],
        ];
        if (!in_array($newStatus, $allowed[$prev] ?? [])) {
            return response()->json(['message' => 'Perubahan status tidak valid.'], 422);
        }

        // Foto wajib untuk order sekolah sebelum completed
        if ($newStatus === 'completed' && $order->ride_type === 'school' && !$order->proof_photo_path) {
            return response()->json(['message' => 'Upload foto bukti tiba di sekolah terlebih dahulu.', 'require_photo' => true], 422);
        }

        $timestamps = [
            'on_pickup' => ['on_pickup_at' => now()],
            'on_ride'   => ['on_ride_at'   => now()],
            'completed' => ['completed_at' => now(), 'payment_status' => 'paid'],
            'cancelled' => ['cancelled_at' => now(), 'cancel_reason' => $data['reason'] ?? 'Dibatalkan oleh mitra'],
        ];

        DB::transaction(function () use ($order, $newStatus, $timestamps, $prev) {
            $order->update(array_merge(['status' => $newStatus], $timestamps[$newStatus] ?? []));

            // Selesaikan wallet saat order completed
            if ($newStatus === 'completed') {
                $mitra    = $order->mitra;
                $customer = $order->customer;

                if ($order->payment_method === 'wallet') {
                    // Lepas locked_balance customer & debit pembayaran
                    $custWallet = Wallet::lockForUpdate()->where('user_id', $order->customer_id)->first();
                    if ($custWallet) {
                        $custWallet->decrement('locked_balance', min((float) $order->fare, (float) $custWallet->locked_balance));
                    }
                    $this->walletService->debit(
                        $customer,
                        (float) $order->fare,
                        'order_payment',
                        "Pembayaran ZasaRide #{$order->order_number}",
                        $order,
                        'zasaride'
                    );

                    // Credit income ke mitra (netto setelah komisi)
                    $this->walletService->credit(
                        $mitra,
                        (float) $order->mitra_income,
                        'order_income',
                        "Pendapatan ZasaRide #{$order->order_number}",
                        $order,
                        'zasaride'
                    );
                } elseif ($order->payment_method === 'cod') {
                    // COD: mitra terima cash dari customer, potong komisi platform dari wallet mitra
                    $this->walletService->debitForce(
                        $mitra,
                        (float) $order->platform_commission,
                        'platform_commission',
                        "Komisi platform ZasaRide #{$order->order_number} (COD)",
                        $order,
                        'zasaride'
                    );
                }
            }
        });

        broadcast(new RideStatusUpdated($order->fresh(['mitra']), $prev));
        return response()->json($order->fresh(['customer', 'mitra']));
    }

    // Upload foto bukti tiba di sekolah
    public function uploadProofPhoto(Request $request, int $id): JsonResponse
    {
        $request->validate(['photo' => ['required', 'image', 'max:2048']]);

        $order = RideOrder::where('mitra_id', $request->user()->id)
            ->where('ride_type', 'school')
            ->whereIn('status', ['on_pickup', 'on_ride'])
            ->findOrFail($id);

        $path = $request->file('photo')->store("ride_proof/{$order->id}", 'public');
        $order->update(['proof_photo_path' => $path]);

        return response()->json(['path' => $path, 'url' => asset("storage/{$path}")]);
    }

    // Riwayat ride mitra
    public function history(Request $request): JsonResponse
    {
        $orders = RideOrder::where('mitra_id', $request->user()->id)
            ->with('customer')
            ->latest()
            ->paginate(20);
        return response()->json($orders);
    }
}
