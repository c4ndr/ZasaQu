<?php

namespace App\Http\Controllers\Api\Serv;

use App\Http\Controllers\Controller;
use App\Models\ServOrder;
use App\Services\WalletService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class MitraController extends Controller
{
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

        $hasActive = ServOrder::where('mitra_id', $user->id)
            ->whereNotIn('status', ['completed', 'cancelled'])
            ->exists();

        if ($hasActive) {
            return response()->json(['message' => 'Selesaikan order aktif terlebih dahulu.'], 422);
        }

        $order = DB::transaction(function () use ($id, $user) {
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

            if ($next === 'completed' && $locked->provider_income > 0) {
                app(WalletService::class)->credit(
                    $user,
                    $locked->provider_income,
                    'order_income',
                    "Pendapatan ZasaServ #{$locked->order_number}",
                    $locked,
                    'zasaserv'
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
