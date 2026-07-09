<?php

namespace App\Http\Controllers\Api\Serv;

use App\Http\Controllers\Controller;
use App\Models\ServOrder;
use App\Services\NotificationService;
use App\Services\ServOrderService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class MitraController extends Controller
{
    public function __construct(private ServOrderService $servOrderService) {}

    public function available(Request $request): JsonResponse
    {
        $orders = ServOrder::where('status', 'pending')
            ->whereNull('mitra_id')
            ->with(['customer', 'provider', 'items'])
            ->latest()
            ->get();

        return response()->json($orders);
    }

    public function active(Request $request): JsonResponse
    {
        $order = ServOrder::where('mitra_id', $request->user()->id)
            ->whereNotIn('status', ['completed', 'cancelled'])
            ->with(['customer', 'provider', 'items'])
            ->latest()
            ->first();

        return response()->json($order);
    }

    public function history(Request $request): JsonResponse
    {
        $orders = ServOrder::where('mitra_id', $request->user()->id)
            ->whereIn('status', ['completed', 'cancelled'])
            ->with(['customer', 'provider'])
            ->latest()
            ->paginate(20);

        return response()->json($orders);
    }

    public function accept(Request $request, int $id): JsonResponse
    {
        $user = $request->user();

        try {
            $order = DB::transaction(function () use ($id, $user) {
                // Cek active order di dalam transaksi — cegah race condition dua request concurrent lolos bersamaan
                $hasActive = ServOrder::where('mitra_id', $user->id)
                    ->whereNotIn('status', ['completed', 'cancelled'])
                    ->lockForUpdate()
                    ->exists();

                if ($hasActive) {
                    throw new \Exception('Selesaikan order aktif terlebih dahulu.');
                }

                $order = ServOrder::where('status', 'pending')
                    ->whereNull('mitra_id')
                    ->lockForUpdate()
                    ->findOrFail($id);

                $order->update([
                    'mitra_id'    => $user->id,
                    'status'      => 'confirmed',
                    'accepted_at' => now(),
                    'confirmed_at'=> now(),
                ]);

                return $order;
            });
        } catch (\Exception $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }

        return response()->json($order->load(['customer', 'provider', 'items']));
    }

    public function updateStatus(Request $request, int $id): JsonResponse
    {
        $user = $request->user();
        $data = $request->validate([
            'status'        => ['required', 'string'],
            'cancel_reason' => ['nullable', 'string', 'max:255'],
        ]);

        $order = ServOrder::where('mitra_id', $user->id)
            ->whereNotIn('status', ['completed', 'cancelled'])
            ->findOrFail($id);

        $allowed = [
            'confirmed'   => ['traveling', 'cancelled'],
            'traveling'   => ['in_progress'],
            'in_progress' => ['completed'],
        ];

        $current = $order->status;
        $next    = $data['status'];

        if (!in_array($next, $allowed[$current] ?? [])) {
            return response()->json(['message' => "Tidak bisa ubah status dari {$current} ke {$next}."], 422);
        }

        DB::transaction(function () use ($order, $current, $next, $data, $user) {
            $locked = ServOrder::lockForUpdate()->findOrFail($order->id);

            if ($locked->status !== $current) {
                throw new \Exception("Status pesanan sudah berubah menjadi: {$locked->status}.");
            }

            $updates = ['status' => $next];
            if ($next === 'cancelled')    $updates['cancel_reason']  = $data['cancel_reason'] ?? 'Dibatalkan oleh mitra';
            if ($next === 'traveling')    $updates['traveling_at']   = now();
            if ($next === 'in_progress')  $updates['in_progress_at'] = now();
            if ($next === 'completed')    $updates['completed_at']   = now();

            $locked->update($updates);

            $order->setRawAttributes($locked->fresh()->getAttributes());
        });

        // Settle pembayaran — idempoten, aman bila provider juga klik selesai
        if ($next === 'completed') {
            $this->servOrderService->settle($order->fresh());
        } elseif ($next === 'cancelled') {
            $this->servOrderService->releaseHold($order->fresh());
        }

        $fresh    = $order->fresh()->load(['customer', 'provider', 'items']);
        $customer = $fresh->customer;
        $notif    = app(NotificationService::class);

        match ($next) {
            'traveling'   => $notif->servOrderTraveling($customer, $fresh->order_number, $fresh->id),
            'in_progress' => $notif->servOrderInProgress($customer, $fresh->order_number, $fresh->id),
            'completed'   => $notif->servOrderCompleted($customer, $fresh->order_number, $fresh->id),
            'cancelled'   => $notif->servOrderCancelled($customer, $fresh->order_number, $fresh->id, $data['cancel_reason'] ?? 'Dibatalkan mitra'),
            default       => null,
        };

        return response()->json([
            'message' => 'Status diperbarui.',
            'data'    => $fresh,
        ]);
    }
}
