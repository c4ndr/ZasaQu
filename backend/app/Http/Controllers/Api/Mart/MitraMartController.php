<?php

namespace App\Http\Controllers\Api\Mart;

use App\Http\Controllers\Controller;
use App\Models\MartOrder;
use App\Services\NotificationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class MitraMartController extends Controller
{
    // ── Pesanan tersedia (status=packed, belum ada mitra) ─────────────────────
    public function available(Request $request): JsonResponse
    {
        $orders = MartOrder::with(['seller:id,name,logo_path,address,lat,lng', 'items'])
            ->where('status', 'packed')
            ->whereNull('mitra_id')
            ->latest('packed_at')
            ->get();

        return response()->json($orders);
    }

    // ── Pesanan aktif mitra ───────────────────────────────────────────────────
    public function myOrders(Request $request): JsonResponse
    {
        $orders = MartOrder::with(['seller:id,name,logo_path,address,lat,lng', 'customer:id,name,phone', 'items'])
            ->where('mitra_id', $request->user()->id)
            ->whereNotIn('status', ['completed', 'cancelled'])
            ->latest()
            ->get();

        return response()->json($orders);
    }

    // ── Terima pesanan ────────────────────────────────────────────────────────
    public function accept(Request $request, int $id): JsonResponse
    {
        $mitra = $request->user();

        try {
            DB::transaction(function () use ($mitra, $id) {
                // Cek mitra sudah punya order aktif
                $active = MartOrder::where('mitra_id', $mitra->id)
                    ->whereNotIn('status', ['completed', 'cancelled'])
                    ->lockForUpdate()
                    ->first();

                if ($active) {
                    throw new \Exception('Anda masih memiliki pengiriman aktif (' . $active->order_number . ').');
                }

                $order = MartOrder::where('status', 'packed')
                    ->whereNull('mitra_id')
                    ->lockForUpdate()
                    ->findOrFail($id);

                $order->update([
                    'mitra_id'   => $mitra->id,
                    'status'     => 'picking_up',
                ]);

                // Notif ke customer
                if ($order->customer) {
                    app(NotificationService::class)->send(
                        $order->customer,
                        'mart_mitra_accepted',
                        "Kurir menuju toko 🛵",
                        "Pesanan {$order->order_number} sedang dijemput kurir.",
                        ['order_id' => $order->id, 'module' => 'zasamart']
                    );
                }
            });
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException) {
            return response()->json(['message' => 'Pesanan tidak tersedia atau sudah diambil mitra lain.'], 404);
        } catch (\Exception $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }

        return response()->json([
            'message' => 'Pesanan diterima.',
            'data'    => MartOrder::with(['seller:id,name,logo_path,address,lat,lng', 'customer:id,name,phone', 'items'])
                            ->find($id),
        ]);
    }

    // ── Update status ─────────────────────────────────────────────────────────
    public function updateStatus(Request $request, int $id): JsonResponse
    {
        $data  = $request->validate(['status' => ['required', 'string']]);
        $mitra = $request->user();

        $order = MartOrder::where('mitra_id', $mitra->id)->findOrFail($id);

        $allowed = [
            'picking_up'  => 'on_delivery',
            'on_delivery' => 'delivered',
        ];

        $next = $allowed[$order->status] ?? null;
        if ($next !== $data['status']) {
            return response()->json(['message' => "Tidak bisa update dari {$order->status} ke {$data['status']}."], 422);
        }

        $timestamps = [
            'on_delivery' => [],
            'delivered'   => ['delivered_at' => now()],
        ];

        $order->update(array_merge(['status' => $data['status']], $timestamps[$data['status']] ?? []));

        // Notifikasi
        $msgs = [
            'on_delivery' => ['Pesanan dikirim 🚀', "Kurir sedang mengantarkan pesanan {$order->order_number}."],
            'delivered'   => ['Pesanan tiba! 🎉', "Pesanan {$order->order_number} sudah diterima. Jangan lupa konfirmasi!"],
        ];
        if (isset($msgs[$data['status']]) && $order->customer) {
            [$title, $body] = $msgs[$data['status']];
            app(NotificationService::class)->send(
                $order->customer,
                'mart_status_' . $data['status'],
                $title, $body,
                ['order_id' => $order->id, 'module' => 'zasamart']
            );
        }

        return response()->json([
            'message' => 'Status diperbarui.',
            'data'    => $order->fresh(['seller:id,name,logo_path,address,lat,lng', 'customer:id,name,phone', 'items']),
        ]);
    }
}
