<?php

namespace App\Services;

use App\Models\AdminSetting;
use App\Models\FoodMerchant;
use App\Models\FoodOrder;
use App\Models\FoodOrderItem;
use App\Models\FoodMenuItem;
use App\Models\MitraDetail;
use App\Models\User;
use App\Models\Wallet;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Redis;
use Illuminate\Support\Str;

class FoodOrderService
{
    public function __construct(
        private WalletService       $walletService,
        private NotificationService $notifService,
    ) {}

    // ── Buat order baru ────────────────────────────────────────────────────────

    public function createOrder(User $customer, array $data): FoodOrder
    {
        return DB::transaction(function () use ($customer, $data) {
            $merchant = FoodMerchant::lockForUpdate()->findOrFail($data['merchant_id']);

            if (!$merchant->isActive()) {
                throw new \Exception('Merchant belum aktif.');
            }
            if (!$merchant->is_open) {
                throw new \Exception('Toko sedang tutup.');
            }

            // Validasi & hitung subtotal
            $subtotal = 0;
            $itemLines = [];
            foreach ($data['items'] as $line) {
                $menuItem = FoodMenuItem::where('merchant_id', $merchant->id)
                    ->lockForUpdate()
                    ->findOrFail($line['menu_item_id']);

                if (!$menuItem->is_available) {
                    throw new \Exception("Item \"{$menuItem->name}\" tidak tersedia.");
                }
                if ($menuItem->stock !== null && $menuItem->stock < $line['quantity']) {
                    throw new \Exception("Stok \"{$menuItem->name}\" tidak cukup.");
                }

                $lineSub    = $menuItem->price * $line['quantity'];
                $subtotal  += $lineSub;
                $itemLines[] = [
                    'menu_item'  => $menuItem,
                    'quantity'   => $line['quantity'],
                    'subtotal'   => $lineSub,
                    'notes'      => $line['notes'] ?? null,
                ];
            }

            // Snapshot komisi
            $commFood     = (float) AdminSetting::valueOf('food_commission_percent', 15);
            $commDelivery = (float) AdminSetting::valueOf('food_commission_delivery_percent', 10);
            $deliveryFee  = (int) $data['delivery_fee'];
            $total        = $subtotal + $deliveryFee;

            $commFoodAmt     = (int) round($subtotal * $commFood / 100);
            $commDeliveryAmt = (int) round($deliveryFee * $commDelivery / 100);
            $merchantIncome  = $subtotal - $commFoodAmt;
            $mitraIncome     = $deliveryFee - $commDeliveryAmt;

            // Debit wallet pelanggan (non-COD)
            if ($data['payment_method'] === 'wallet') {
                $wallet = Wallet::lockForUpdate()->where('user_id', $customer->id)->firstOrFail();
                if ($wallet->availableBalance() < $total) {
                    throw new \Exception('Saldo tidak mencukupi. Silakan top up terlebih dahulu.');
                }
                $wallet->increment('locked_balance', $total);
            }

            // Buat order
            $order = FoodOrder::create([
                'order_number'                 => $this->generateOrderNumber(),
                'customer_id'                  => $customer->id,
                'merchant_id'                  => $merchant->id,
                'status'                       => 'pending',
                'subtotal'                     => $subtotal,
                'delivery_fee'                 => $deliveryFee,
                'total_amount'                 => $total,
                'commission_rate_food'         => $commFood,
                'commission_rate_delivery'     => $commDelivery,
                'platform_commission_food'     => $commFoodAmt,
                'platform_commission_delivery' => $commDeliveryAmt,
                'merchant_income'              => $merchantIncome,
                'mitra_income'                 => $mitraIncome,
                'delivery_address'             => $data['delivery_address'],
                'delivery_lat'                 => $data['delivery_lat'],
                'delivery_lng'                 => $data['delivery_lng'],
                'payment_method'               => $data['payment_method'],
                'payment_status'               => $data['payment_method'] === 'wallet' ? 'paid' : 'pending',
                'notes'                        => $data['notes'] ?? null,
            ]);

            // Buat order items (snapshot harga & nama)
            foreach ($itemLines as $line) {
                FoodOrderItem::create([
                    'food_order_id' => $order->id,
                    'menu_item_id'  => $line['menu_item']->id,
                    'item_name'     => $line['menu_item']->name,
                    'item_price'    => $line['menu_item']->price,
                    'quantity'      => $line['quantity'],
                    'subtotal'      => $line['subtotal'],
                    'notes'         => $line['notes'],
                ]);

                // Kurangi stok jika terbatas; nonaktifkan item jika stok habis
                if ($line['menu_item']->stock !== null) {
                    $newStock = $line['menu_item']->stock - $line['quantity'];
                    $updates  = ['stock' => $newStock];
                    if ($newStock <= 0) {
                        $updates['is_available'] = false;
                    }
                    $line['menu_item']->update($updates);
                }
            }

            // Notifikasi ke merchant
            $this->notifService->send(
                $merchant->user,
                'food_new_order',
                'Order Baru Masuk!',
                "Ada order baru #{$order->order_number} dari {$customer->name}.",
                ['food_order_id' => $order->id, 'order_number' => $order->order_number]
            );

            return $order;
        });
    }

    // ── Transisi status ────────────────────────────────────────────────────────

    public function merchantAccept(FoodOrder $order, int $prepMinutes): FoodOrder
    {
        $this->assertStatus($order, 'pending');

        return DB::transaction(function () use ($order, $prepMinutes) {
            $order->update([
                'status'                  => 'merchant_accepted',
                'merchant_accepted_at'    => now(),
                'estimated_prep_minutes'  => $prepMinutes,
            ]);

            $this->notifService->send(
                $order->customer,
                'food_accepted',
                'Pesananmu Diterima!',
                "Merchant sedang menyiapkan pesananmu (estimasi {$prepMinutes} menit).",
                ['food_order_id' => $order->id, 'order_number' => $order->order_number]
            );

            return $order;
        });
    }

    public function merchantReject(FoodOrder $order, ?string $reason): FoodOrder
    {
        $this->assertStatus($order, 'pending');

        return DB::transaction(function () use ($order, $reason) {
            $order->update([
                'status'           => 'rejected',
                'rejected_at'      => now(),
                'rejection_reason' => $reason,
            ]);

            $this->restoreStock($order);
            $this->refundCustomer($order);

            $this->notifService->send(
                $order->customer,
                'food_rejected',
                'Pesanan Ditolak',
                "Pesananmu ditolak merchant" . ($reason ? ": {$reason}" : ".") . " Saldo dikembalikan.",
                ['food_order_id' => $order->id, 'order_number' => $order->order_number]
            );

            return $order;
        });
    }

    public function merchantPreparing(FoodOrder $order): FoodOrder
    {
        $this->assertStatus($order, 'merchant_accepted');

        $order->update(['status' => 'preparing', 'preparing_at' => now()]);

        $this->notifService->send(
            $order->customer, 'food_preparing',
            'Pesanan Sedang Dimasak',
            "Merchant sedang memasak pesanan #{$order->order_number}.",
            ['food_order_id' => $order->id, 'order_number' => $order->order_number]
        );

        return $order;
    }

    public function merchantReady(FoodOrder $order): FoodOrder
    {
        $this->assertStatus($order, 'preparing');

        $order->update(['status' => 'ready_for_pickup', 'ready_at' => now()]);

        $this->notifService->send(
            $order->customer, 'food_ready',
            'Pesanan Siap Diambil',
            "Pesanan #{$order->order_number} siap, mitra sedang dicari.",
            ['food_order_id' => $order->id, 'order_number' => $order->order_number]
        );

        // Broadcast ke mitra terdekat
        $this->notifyNearbyMitra($order);

        return $order;
    }

    public function mitraAccept(FoodOrder $order, User $mitra): FoodOrder
    {
        $this->assertStatus($order, 'ready_for_pickup');

        return DB::transaction(function () use ($order, $mitra) {
            $locked = FoodOrder::where('status', 'ready_for_pickup')
                ->lockForUpdate()
                ->findOrFail($order->id);

            if ($locked->status !== 'ready_for_pickup') {
                throw new \Exception('Order sudah diambil mitra lain.');
            }

            // Cek mitra tidak punya active food order lain
            $active = FoodOrder::where('mitra_id', $mitra->id)
                ->whereNotIn('status', ['completed', 'cancelled', 'rejected'])
                ->lockForUpdate()->first();

            if ($active) {
                throw new \Exception('Selesaikan order aktif terlebih dahulu.');
            }

            $locked->update([
                'mitra_id'          => $mitra->id,
                'status'            => 'mitra_on_pickup',
                'mitra_assigned_at' => now(),
                'mitra_on_pickup_at'=> now(),
            ]);

            $this->notifService->send(
                $locked->customer, 'food_mitra_assigned',
                'Mitra Menuju Merchant',
                "{$mitra->name} sedang menuju ke merchant untuk mengambil pesananmu.",
                ['food_order_id' => $locked->id, 'order_number' => $locked->order_number]
            );

            return $locked->fresh();
        });
    }

    public function mitraUpdateStatus(FoodOrder $order, string $newStatus): FoodOrder
    {
        $allowed = [
            'mitra_on_pickup' => 'picked_up',
            'picked_up'       => 'on_delivery',
            'on_delivery'     => 'delivered',
        ];

        if (!isset($allowed[$order->status]) || $allowed[$order->status] !== $newStatus) {
            throw new \Exception("Transisi status dari {$order->status} ke {$newStatus} tidak valid.");
        }

        $timestamps = [
            'picked_up'   => ['picked_up_at'   => now()],
            'on_delivery' => ['on_delivery_at'  => now()],
            'delivered'   => ['delivered_at'    => now()],
        ];

        $order->update(array_merge(['status' => $newStatus], $timestamps[$newStatus] ?? []));

        $notifs = [
            'picked_up'   => ['food_picked_up',  'Pesanan Diambil', "Mitra sudah mengambil pesanan #{$order->order_number} dari merchant."],
            'on_delivery' => ['food_on_delivery', 'Pesanan Dalam Perjalanan', "Pesanan #{$order->order_number} sedang diantar ke lokasimu."],
            'delivered'   => ['food_delivered',   'Pesanan Tiba!', "Pesanan #{$order->order_number} sudah diantar. Konfirmasi terima dalam 2 jam."],
        ];

        if (isset($notifs[$newStatus])) {
            [$type, $title, $body] = $notifs[$newStatus];
            $this->notifService->send(
                $order->customer, $type, $title, $body,
                ['food_order_id' => $order->id, 'order_number' => $order->order_number]
            );
        }

        return $order->fresh();
    }

    public function customerConfirm(FoodOrder $order): FoodOrder
    {
        $this->assertStatus($order, 'delivered');

        return DB::transaction(function () use ($order) {
            // Lock baris order agar concurrent request (mis. auto-confirm + manual confirm) tidak double-settle
            $locked = FoodOrder::lockForUpdate()->findOrFail($order->id);
            if ($locked->status !== 'delivered') {
                throw new \Exception("Status order sudah berubah: {$locked->status}.");
            }
            $locked->update(['status' => 'completed', 'completed_at' => now()]);
            $this->settleWallet($locked);
            return $locked;
        });
    }

    public function customerCancel(FoodOrder $order): FoodOrder
    {
        if (!in_array($order->status, ['pending', 'merchant_accepted'])) {
            throw new \Exception('Order hanya bisa dibatalkan saat status pending atau merchant_accepted.');
        }

        return DB::transaction(function () use ($order) {
            $order->update([
                'status'              => 'cancelled',
                'cancelled_at'        => now(),
                'cancelled_by'        => 'customer',
                'cancellation_reason' => 'Dibatalkan oleh pelanggan.',
            ]);

            $this->restoreStock($order);
            $this->refundCustomer($order);

            $this->notifService->send(
                $order->merchant->user, 'food_cancelled',
                'Order Dibatalkan',
                "Order #{$order->order_number} dibatalkan oleh pelanggan.",
                ['food_order_id' => $order->id, 'order_number' => $order->order_number]
            );

            return $order;
        });
    }

    // ── Auto-confirm (dipanggil dari scheduled task) ───────────────────────────

    public function autoConfirmDelivered(): void
    {
        $minutes = (int) AdminSetting::valueOf('food_auto_confirm_minutes', 120);
        $cutoff  = now()->subMinutes($minutes);

        FoodOrder::where('status', 'delivered')
            ->where('delivered_at', '<=', $cutoff)
            ->get()
            ->each(function (FoodOrder $order) {
                try {
                    DB::transaction(fn() => $this->customerConfirm($order));
                } catch (\Throwable) {}
            });
    }

    public function cancelTimedOutPending(): void
    {
        $minutes = (int) AdminSetting::valueOf('food_merchant_timeout_minutes', 5);
        $cutoff  = now()->subMinutes($minutes);

        FoodOrder::where('status', 'pending')
            ->where('created_at', '<=', $cutoff)
            ->get()
            ->each(function (FoodOrder $order) {
                try {
                    DB::transaction(function () use ($order) {
                        $order->update([
                            'status'              => 'cancelled',
                            'cancelled_at'        => now(),
                            'cancelled_by'        => 'system',
                            'cancellation_reason' => 'Merchant tidak merespons dalam batas waktu.',
                        ]);
                        $this->restoreStock($order);
                        $this->refundCustomer($order);
                        $this->notifService->send(
                            $order->customer, 'food_timeout',
                            'Order Dibatalkan Otomatis',
                            "Order #{$order->order_number} dibatalkan karena merchant tidak merespons. Saldo dikembalikan.",
                            ['food_order_id' => $order->id]
                        );
                    });
                } catch (\Throwable) {}
            });
    }

    // ── Submit rating ──────────────────────────────────────────────────────────

    public function submitRating(FoodOrder $order, User $rater, array $ratings): void
    {
        if ($order->status !== 'completed') {
            throw new \Exception('Rating hanya bisa diberikan untuk order yang sudah selesai.');
        }
        if ($rater->id !== $order->customer_id) {
            throw new \Exception('Hanya pelanggan yang bisa memberi rating untuk order ini.');
        }

        DB::transaction(function () use ($order, $rater, $ratings) {
            // Rating untuk merchant
            if (!empty($ratings['merchant_score'])) {
                if (!\App\Models\Rating::where('food_order_id', $order->id)->where('rater_id', $rater->id)->where('rater_role', 'customer_to_merchant')->exists()) {
                    \App\Models\Rating::create([
                        'food_order_id' => $order->id,
                        'rater_id'      => $rater->id,
                        'ratee_id'      => $order->merchant->user_id,
                        'rater_role'    => 'customer_to_merchant',
                        'score'         => $ratings['merchant_score'],
                        'comment'       => $ratings['merchant_comment'] ?? null,
                    ]);
                    $this->recalculateMerchantRating($order->merchant);
                }
            }

            // Rating untuk mitra
            if (!empty($ratings['mitra_score']) && $order->mitra_id) {
                if (!\App\Models\Rating::where('food_order_id', $order->id)->where('rater_id', $rater->id)->where('rater_role', 'customer_to_mitra')->exists()) {
                    \App\Models\Rating::create([
                        'food_order_id' => $order->id,
                        'rater_id'      => $rater->id,
                        'ratee_id'      => $order->mitra_id,
                        'rater_role'    => 'customer_to_mitra',
                        'score'         => $ratings['mitra_score'],
                        'comment'       => $ratings['mitra_comment'] ?? null,
                    ]);
                    $this->recalculateMitraRating($order->mitra_id);
                }
            }
        });
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private function restoreStock(FoodOrder $order): void
    {
        $order->load('items.menuItem');
        foreach ($order->items as $orderItem) {
            $menuItem = $orderItem->menuItem;
            if (!$menuItem || $menuItem->stock === null) {
                continue;
            }
            $newStock = $menuItem->stock + $orderItem->quantity;
            $updates  = ['stock' => $newStock];
            if ($newStock > 0 && !$menuItem->is_available) {
                $updates['is_available'] = true;
            }
            $menuItem->update($updates);
        }
    }

    private function settleWallet(FoodOrder $order): void
    {
        // Debit & lepas lock balance pelanggan
        if ($order->payment_method === 'wallet') {
            $customerWallet = Wallet::lockForUpdate()->where('user_id', $order->customer_id)->firstOrFail();
            $customerWallet->decrement('locked_balance', min($order->total_amount, (float) $customerWallet->locked_balance));
            $this->walletService->debit(
                $order->customer,
                $order->total_amount,
                'order_payment',
                "Pembayaran order #{$order->order_number}",
                $order,
                'zasafood'
            );
        }

        // Tandai COD sebagai lunas
        if ($order->payment_method === 'cod') {
            $order->update(['payment_status' => 'paid', 'cod_confirmed_at' => now()]);
        }

        // Credit merchant
        $this->walletService->credit(
            $order->merchant->user,
            $order->merchant_income,
            'order_income',
            "Pendapatan order #{$order->order_number}",
            $order,
            'zasafood'
        );

        // Credit mitra (jika ada)
        if ($order->mitra_id && $order->mitra) {
            $this->walletService->credit(
                $order->mitra,
                $order->mitra_income,
                'order_income',
                "Pendapatan delivery order #{$order->order_number}",
                $order,
                'zasafood'
            );
        }

        // Notifikasi selesai
        $this->notifService->send(
            $order->customer, 'food_completed',
            'Pesanan Selesai!',
            "Pesanan #{$order->order_number} selesai. Bagaimana pengalamanmu?",
            ['food_order_id' => $order->id, 'order_number' => $order->order_number, 'action' => 'rate']
        );

        $this->notifService->send(
            $order->merchant->user, 'food_completed',
            'Order Selesai',
            "Order #{$order->order_number} selesai. Pendapatan sudah masuk ke dompet.",
            ['food_order_id' => $order->id]
        );

        if ($order->mitra_id && $order->mitra) {
            $this->notifService->send(
                $order->mitra, 'food_completed',
                'Order Selesai',
                "Order #{$order->order_number} selesai. Pendapatan delivery sudah masuk ke dompet.",
                ['food_order_id' => $order->id]
            );
        }
    }

    private function refundCustomer(FoodOrder $order): void
    {
        if ($order->payment_method !== 'wallet' || $order->payment_status !== 'paid') {
            return;
        }

        // Kembalikan locked balance — lockForUpdate mencegah race condition concurrent refund
        $wallet = Wallet::lockForUpdate()->where('user_id', $order->customer_id)->firstOrFail();
        $wallet->decrement('locked_balance', min($order->total_amount, (float) $wallet->locked_balance));

        // Credit balik ke wallet
        $this->walletService->credit(
            $order->customer,
            $order->total_amount,
            'refund',
            "Refund order #{$order->order_number}",
            $order,
            'zasafood'
        );

        $order->update(['payment_status' => 'refunded']);
    }

    private function notifyNearbyMitra(FoodOrder $order): void
    {
        $radiusKm = (float) AdminSetting::valueOf('food_mitra_assign_radius_km', 5);
        $mLat     = $order->merchant->lat;
        $mLng     = $order->merchant->lng;

        // Cari semua mitra online yang punya data GPS di Redis
        $onlineMitras = MitraDetail::where('is_online', true)
            ->with('user')
            ->get();

        foreach ($onlineMitras as $detail) {
            $gpsData = Redis::get("gps:mitra:{$detail->user_id}");
            if (!$gpsData) continue;

            $gps  = json_decode($gpsData, true);
            $dist = $this->haversineKm($mLat, $mLng, $gps['lat'], $gps['lng']);

            if ($dist <= $radiusKm && $detail->user) {
                $this->notifService->send(
                    $detail->user, 'food_new_order',
                    'Ada Pesanan Makanan!',
                    "Pesanan #{$order->order_number} siap diambil di {$order->merchant->name} (~" . round($dist, 1) . " km).",
                    ['food_order_id' => $order->id, 'order_number' => $order->order_number]
                );
            }
        }
    }

    private function recalculateMitraRating(int $mitraId): void
    {
        // Gabungkan rating dari ZasaGo (rater_role='customer') dan ZasaFood (rater_role='customer_to_mitra')
        $avg = \App\Models\Rating::where('ratee_id', $mitraId)
            ->whereIn('rater_role', ['customer', 'customer_to_mitra'])
            ->avg('score');

        \App\Models\MitraDetail::where('user_id', $mitraId)
            ->update(['average_rating' => round((float) $avg, 2)]);
    }

    private function recalculateMerchantRating(\App\Models\FoodMerchant $merchant): void
    {
        $avg   = \App\Models\Rating::where('ratee_id', $merchant->user_id)
            ->where('rater_role', 'customer_to_merchant')
            ->avg('score');
        $count = \App\Models\Rating::where('ratee_id', $merchant->user_id)
            ->where('rater_role', 'customer_to_merchant')
            ->count();

        $merchant->update([
            'average_rating' => round((float) $avg, 2),
            'total_ratings'  => $count,
        ]);
    }

    private function assertStatus(FoodOrder $order, string $expected): void
    {
        if ($order->status !== $expected) {
            throw new \Exception("Status order harus {$expected}, saat ini: {$order->status}.");
        }
    }

    private function generateOrderNumber(): string
    {
        return 'FD-' . strtoupper(Str::random(8));
    }

    private function haversineKm(float $lat1, float $lng1, float $lat2, float $lng2): float
    {
        $R    = 6371;
        $dLat = deg2rad($lat2 - $lat1);
        $dLng = deg2rad($lng2 - $lng1);
        $a    = sin($dLat / 2) ** 2 + cos(deg2rad($lat1)) * cos(deg2rad($lat2)) * sin($dLng / 2) ** 2;
        return $R * 2 * atan2(sqrt($a), sqrt(1 - $a));
    }
}
