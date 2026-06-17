<?php

namespace App\Http\Controllers\Api\Mart;

use App\Http\Controllers\Controller;
use App\Models\AdminSetting;
use App\Models\MartOrder;
use App\Models\Wallet;
use App\Services\NotificationService;
use App\Services\WalletService;
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

    // ── Riwayat pengiriman selesai ───────────────────────────────────────────
    public function history(Request $request): JsonResponse
    {
        $orders = MartOrder::with(['seller:id,name,logo_path,address,lat,lng', 'customer:id,name'])
            ->where('mitra_id', $request->user()->id)
            ->whereIn('status', ['completed', 'cancelled', 'delivered'])
            ->latest('delivered_at')
            ->limit(50)
            ->get();

        return response()->json($orders);
    }

    // ── Terima pesanan ────────────────────────────────────────────────────────
    public function accept(Request $request, int $id): JsonResponse
    {
        $mitra = $request->user();

        $minBalance = (float) (AdminSetting::where('key', 'wallet_minimum_mitra')->value('value') ?? 0);

        try {
            DB::transaction(function () use ($mitra, $id, $minBalance) {
                // Cek saldo minimum dengan lock agar tidak lolos concurrent accept
                if ($minBalance > 0) {
                    $wallet    = Wallet::where('user_id', $mitra->id)->lockForUpdate()->first();
                    $available = $wallet ? $wallet->availableBalance() : 0;
                    if ($available < $minBalance) {
                        throw new \Exception('Saldo tidak mencukupi untuk menerima pengiriman. '
                            . 'Minimum: Rp ' . number_format($minBalance, 0, ',', '.') . '. '
                            . 'Saldo Anda: Rp ' . number_format($available, 0, ',', '.') . '.');
                    }
                }

                // Cek mitra sudah punya order aktif
                $active = MartOrder::where('mitra_id', $mitra->id)
                    ->whereNotIn('status', ['delivered', 'completed', 'cancelled'])
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

        // Auto-complete: mitra selesaikan → langsung completed, tidak perlu konfirmasi customer
        $actualStatus = $data['status'] === 'delivered' ? 'completed' : $data['status'];

        $timestamps = [
            'on_delivery' => [],
            'completed'   => ['delivered_at' => now(), 'completed_at' => now()],
        ];

        DB::transaction(function () use ($order, $actualStatus, $timestamps, $mitra) {
            $locked = MartOrder::lockForUpdate()->findOrFail($order->id);

            // Re-check status setelah lock — cegah double-settle jika mitra double-tap
            if ($locked->status !== $order->status) {
                throw new \Exception("Status pesanan sudah berubah: {$locked->status}.");
            }

            $locked->update(array_merge(['status' => $actualStatus], $timestamps[$actualStatus] ?? []));

            if ($actualStatus === 'completed') {
                $sellerUser = $locked->seller?->user;

                if ($locked->payment_method === 'wallet') {
                    if ($sellerUser && $locked->seller_income > 0) {
                        app(WalletService::class)->credit(
                            $sellerUser,
                            $locked->seller_income,
                            'order_income',
                            "Pendapatan ZasaMart #{$locked->order_number}",
                            $locked,
                            'zasamart'
                        );
                    }
                } else {
                    // COD: debit komisi platform dari wallet mitra
                    if ($locked->platform_commission > 0) {
                        app(WalletService::class)->debitForce(
                            $mitra,
                            $locked->platform_commission,
                            'platform_commission',
                            "Komisi platform COD ZasaMart #{$locked->order_number}",
                            $locked,
                            'zasamart'
                        );
                    }
                }
            }
        });

        $msgs = [
            'on_delivery' => ['Pesanan dikirim 🚀',  "Kurir sedang mengantarkan pesanan {$order->order_number}."],
            'completed'   => ['Pesanan selesai! 🎉', "Pesanan {$order->order_number} sudah diantar dan selesai."],
        ];
        if (isset($msgs[$actualStatus]) && $order->customer) {
            [$title, $body] = $msgs[$actualStatus];
            app(NotificationService::class)->send(
                $order->customer,
                'mart_status_' . $actualStatus,
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
