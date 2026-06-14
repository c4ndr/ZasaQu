<?php

namespace App\Http\Controllers\Api\Ride;

use App\Events\RideStatusUpdated;
use App\Http\Controllers\Controller;
use App\Models\RideOrder;
use App\Models\Wallet;
use App\Models\WalletTransaction;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class MitraController extends Controller
{
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

            // Transfer income ke wallet mitra saat completed
            if ($newStatus === 'completed' && $order->payment_method === 'wallet') {
                $wallet = Wallet::firstOrCreate(['user_id' => $order->mitra_id], ['balance' => 0]);
                $wallet->increment('balance', $order->mitra_income);
                WalletTransaction::create([
                    'wallet_id'   => $wallet->id,
                    'type'        => 'credit',
                    'amount'      => $order->mitra_income,
                    'description' => "Pendapatan ZasaRide #{$order->order_number}",
                    'reference'   => "ride_order_{$order->id}",
                ]);

                // Kurangi saldo customer
                $custWallet = Wallet::where('user_id', $order->customer_id)->first();
                if ($custWallet) {
                    $custWallet->decrement('balance', $order->fare);
                    WalletTransaction::create([
                        'wallet_id'   => $custWallet->id,
                        'type'        => 'debit',
                        'amount'      => $order->fare,
                        'description' => "Pembayaran ZasaRide #{$order->order_number}",
                        'reference'   => "ride_order_{$order->id}",
                    ]);
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
