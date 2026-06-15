<?php

namespace App\Http\Controllers\Api\Home;

use App\Http\Controllers\Controller;
use App\Models\HomeOrder;
use App\Services\WalletService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class MitraController extends Controller
{
    // Order pending yang belum di-claim mitra
    public function available(Request $request): JsonResponse
    {
        $orders = HomeOrder::where('status', 'pending')
            ->whereNull('mitra_id')
            ->with(['customer', 'provider', 'items'])
            ->latest()
            ->get();

        return response()->json($orders);
    }

    // Order aktif yang sedang dikerjakan mitra ini
    public function active(Request $request): JsonResponse
    {
        $order = HomeOrder::where('mitra_id', $request->user()->id)
            ->whereNotIn('status', ['completed', 'cancelled'])
            ->with(['customer', 'provider', 'items'])
            ->latest()
            ->first();

        return response()->json($order);
    }

    // Riwayat order mitra
    public function history(Request $request): JsonResponse
    {
        $orders = HomeOrder::where('mitra_id', $request->user()->id)
            ->whereIn('status', ['completed', 'cancelled'])
            ->with(['customer', 'provider'])
            ->latest()
            ->paginate(20);

        return response()->json($orders);
    }

    // Claim / terima order
    public function accept(Request $request, int $id): JsonResponse
    {
        $user = $request->user();

        $hasActive = HomeOrder::where('mitra_id', $user->id)
            ->whereNotIn('status', ['completed', 'cancelled'])
            ->exists();

        if ($hasActive) {
            return response()->json(['message' => 'Selesaikan order aktif terlebih dahulu.'], 422);
        }

        $order = DB::transaction(function () use ($id, $user) {
            $order = HomeOrder::where('status', 'pending')
                ->whereNull('mitra_id')
                ->lockForUpdate()
                ->findOrFail($id);

            $order->update([
                'mitra_id'    => $user->id,
                'status'      => 'confirmed',
                'accepted_at' => now(),
            ]);

            return $order;
        });

        return response()->json($order->load(['customer', 'provider', 'items']));
    }

    // Update status order
    public function updateStatus(Request $request, int $id): JsonResponse
    {
        $user  = $request->user();
        $data  = $request->validate([
            'status'        => ['required', 'string'],
            'cancel_reason' => ['nullable', 'string', 'max:255'],
        ]);

        $order = HomeOrder::where('mitra_id', $user->id)
            ->whereNotIn('status', ['completed', 'cancelled'])
            ->findOrFail($id);

        $allowed = [
            'confirmed'   => ['traveling', 'cancelled'],
            'traveling'   => ['in_progress'],
            'in_progress' => ['ready', 'completed'],
            'ready'       => ['delivering', 'completed'],
            'delivering'  => ['completed'],
            'picked_up'   => ['processing'],
            'processing'  => ['ready'],
        ];

        $current = $order->status;
        $next    = $data['status'];

        if (!in_array($next, $allowed[$current] ?? [])) {
            return response()->json(['message' => "Tidak bisa ubah status dari {$current} ke {$next}."], 422);
        }

        DB::transaction(function () use ($order, $current, $next, $data, $user) {
            $locked = HomeOrder::lockForUpdate()->findOrFail($order->id);

            if ($locked->status !== $current) {
                throw new \Exception("Status pesanan sudah berubah menjadi: {$locked->status}.");
            }

            $updates = ['status' => $next];
            if ($next === 'cancelled')  $updates['cancel_reason'] = $data['cancel_reason'] ?? 'Dibatalkan oleh mitra';
            if ($next === 'ready')      $updates['ready_at']      = now();
            if ($next === 'completed')  $updates['completed_at']  = now();

            $locked->update($updates);

            if ($next === 'completed' && $locked->provider_income > 0) {
                app(WalletService::class)->credit(
                    $user,
                    $locked->provider_income,
                    'order_income',
                    "Pendapatan ZasaHome #{$locked->order_number}",
                    $locked,
                    'zasahome'
                );
            }

            $order->setRawAttributes($locked->fresh()->getAttributes());
        });

        return response()->json([
            'message' => 'Status diperbarui.',
            'data'    => $order->fresh()->load(['customer', 'provider', 'items']),
        ]);
    }
}
