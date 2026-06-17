<?php

namespace App\Http\Controllers\Api\Ride;

use App\Events\RideStatusUpdated;
use App\Http\Controllers\Controller;
use App\Models\AdminSetting;
use App\Models\RideOrder;
use App\Models\Wallet;
use App\Services\NotificationService;
use App\Services\WalletService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class MitraController extends Controller
{
    public function __construct(
        private WalletService       $walletService,
        private NotificationService $notifService,
    ) {}

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

        // Cek saldo minimum (boleh di luar transaksi — hanya early-return, bukan guard final)
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

        try {
            $order = DB::transaction(function () use ($id, $user) {
                // Cek active ride di dalam transaksi — cegah race condition dua request concurrent lolos bersamaan
                $hasActive = RideOrder::where('mitra_id', $user->id)
                    ->whereIn('status', ['accepted', 'on_pickup', 'on_ride'])
                    ->lockForUpdate()
                    ->exists();
                if ($hasActive) {
                    throw new \Exception('Selesaikan perjalanan aktif terlebih dahulu.');
                }

                $order = RideOrder::where('status', 'pending')->lockForUpdate()->findOrFail($id);
                $order->update([
                    'mitra_id'    => $user->id,
                    'status'      => 'accepted',
                    'accepted_at' => now(),
                ]);
                return $order;
            });
        } catch (\Exception $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }

        $fresh = $order->fresh(['customer', 'mitra']);
        broadcast(new RideStatusUpdated($fresh, 'pending'));

        $this->notifService->rideAccepted(
            $fresh->customer,
            $fresh->order_number,
            $fresh->id,
            $fresh->mitra?->name ?? 'Driver'
        );

        return response()->json($fresh);
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
            // Lock baris order — cegah race condition (mis. mitra double-tap)
            $locked = RideOrder::lockForUpdate()->findOrFail($order->id);

            // Re-check status setelah lock — jika sudah berubah (concurrent request), batalkan
            if ($locked->status !== $prev) {
                throw new \Exception("Status perjalanan sudah berubah: {$locked->status}.");
            }

            $locked->update(array_merge(['status' => $newStatus], $timestamps[$newStatus] ?? []));

            // Lepas locked_balance customer saat mitra cancel order wallet
            if ($newStatus === 'cancelled' && $locked->payment_method === 'wallet') {
                $custWallet = Wallet::lockForUpdate()->where('user_id', $locked->customer_id)->first();
                if ($custWallet) {
                    $custWallet->decrement('locked_balance', min((float) $locked->fare, (float) $custWallet->locked_balance));
                }
            }

            // Selesaikan wallet saat order completed
            if ($newStatus === 'completed') {
                $locked->load('mitra', 'customer');
                $mitra    = $locked->mitra;
                $customer = $locked->customer;

                if ($locked->payment_method === 'wallet') {
                    // Lepas locked_balance customer & debit pembayaran
                    $custWallet = Wallet::lockForUpdate()->where('user_id', $locked->customer_id)->first();
                    if ($custWallet) {
                        $custWallet->decrement('locked_balance', min((float) $locked->fare, (float) $custWallet->locked_balance));
                    }
                    $this->walletService->debit(
                        $customer,
                        (float) $locked->fare,
                        'order_payment',
                        "Pembayaran ZasaRide #{$locked->order_number}",
                        $locked,
                        'zasaride'
                    );

                    // Credit income ke mitra (netto setelah komisi)
                    $this->walletService->credit(
                        $mitra,
                        (float) $locked->mitra_income,
                        'order_income',
                        "Pendapatan ZasaRide #{$locked->order_number}",
                        $locked,
                        'zasaride'
                    );
                } elseif ($locked->payment_method === 'cod') {
                    // COD: mitra terima cash dari customer, potong komisi platform dari wallet mitra
                    $this->walletService->debitForce(
                        $mitra,
                        (float) $locked->platform_commission,
                        'platform_commission',
                        "Komisi platform ZasaRide #{$locked->order_number} (COD)",
                        $locked,
                        'zasaride'
                    );
                }
            }

            $order->setRawAttributes($locked->fresh()->getAttributes());
        });

        $fresh    = $order->fresh(['customer', 'mitra']);
        $customer = $fresh->customer;

        broadcast(new RideStatusUpdated($fresh, $prev));

        match ($newStatus) {
            'on_pickup' => $this->notifService->rideOnPickup($customer, $fresh->order_number, $fresh->id),
            'on_ride'   => $this->notifService->rideOnRide($customer, $fresh->order_number, $fresh->id),
            'completed' => $this->notifService->rideCompleted($customer, $fresh->order_number, $fresh->id),
            'cancelled' => $this->notifService->rideCancelledByMitra($customer, $fresh->order_number, $fresh->id),
            default     => null,
        };

        return response()->json($fresh);
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
