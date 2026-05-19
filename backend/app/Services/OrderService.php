<?php

namespace App\Services;

use App\Events\JastipOrderPlaced;
use App\Events\NewOrderAvailable;
use App\Events\OrderNoLongerAvailable;
use App\Events\OrderStatusUpdated;
use App\Models\AdminSetting;
use App\Models\JastipSession;
use App\Models\Order;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class OrderService
{
    public function __construct(
        private WalletService        $walletService,
        private CommissionService    $commissionService,
        private NotificationService  $notifService,
    ) {}

    // ─── Buat order master ──────────────────────────────────────────────────

    public function createMasterOrder(User $customer, array $data): Order
    {
        $order = DB::transaction(function () use ($customer, $data) {
            $fee     = (float) $data['shipping_fee'];
            $vtype   = $data['vehicle_type'];

            // Snapshot tarif saat order dibuat
            $baseSetting    = $vtype === 'motor' ? 'shipping_motor_base'   : 'shipping_mobil_base';
            $perKmSetting   = $vtype === 'motor' ? 'shipping_motor_per_km' : 'shipping_mobil_per_km';
            $commSetting    = 'commission_master_percent';
            $settings       = AdminSetting::whereIn('key', [$baseSetting, $perKmSetting, $commSetting])
                                ->pluck('value', 'key');

            if ($data['payment_method'] === 'wallet') {
                $wallet = $customer->wallet;
                if ($wallet->availableBalance() < $fee) {
                    throw new \Exception('Saldo tidak mencukupi. Silakan top up terlebih dahulu.');
                }
                $wallet->increment('locked_balance', $fee);
            }

            return Order::create([
                'order_number'      => $this->generateOrderNumber(),
                'customer_id'       => $customer->id,
                'type'              => 'master',
                'status'            => 'pending',
                'is_jastip_enabled' => $data['is_jastip_enabled'] ?? false,
                'require_photo'     => $data['require_photo'] ?? false,
                'pickup_address'    => $data['pickup_address'],
                'pickup_lat'        => $data['pickup_lat'],
                'pickup_lng'        => $data['pickup_lng'],
                'dropoff_address'   => $data['dropoff_address'],
                'dropoff_lat'       => $data['dropoff_lat'],
                'dropoff_lng'       => $data['dropoff_lng'],
                'item_category_id'  => $data['item_category_id'] ?? null,
                'item_description'  => $data['item_description'],
                'item_value'        => $data['item_value'] ?? 0,
                'vehicle_type'      => $vtype,
                'requires_disclaimer' => $data['requires_disclaimer'] ?? false,
                'shipping_fee'      => $fee,
                'rate_base_fee'     => (float) ($settings[$baseSetting]  ?? 5000),
                'rate_per_km'       => (float) ($settings[$perKmSetting] ?? 3000),
                'commission_rate'   => (float) ($settings[$commSetting]  ?? 10),
                'payment_method'    => $data['payment_method'] ?? 'wallet',
                'payment_status'    => 'pending',
                'notes'             => $data['notes'] ?? null,
            ]);
        });

        // Broadcast setelah transaction commit — order sudah ada di DB
        broadcast(new NewOrderAvailable($order));

        return $order;
    }

    // Dipanggil dari luar jika perlu notify mitra tersedia
    public function notifyMitrasNewOrder(Order $order, array $mitras): void
    {
        foreach ($mitras as $mitra) {
            $this->notifService->newOrderAvailable($mitra, $order->order_number);
        }
    }

    // ─── Buat order jastip ──────────────────────────────────────────────────

    public function createJastipOrder(User $customer, JastipSession $session, array $data, CorridorService $corridorService): Order
    {
        if (!$session->isActive()) {
            throw new \Exception('Sesi JastipQu sudah tidak aktif.');
        }
        if ($session->isFull()) {
            throw new \Exception('Kapasitas titipan mitra sudah penuh.');
        }

        // Validasi koridor
        if ($session->route_polyline) {
            [$valid, $reason] = $corridorService->isValidJastipRoute(
                $data['pickup_lat'], $data['pickup_lng'],
                $data['dropoff_lat'], $data['dropoff_lng'],
                $session->route_polyline,
                $session->corridor_width
            );
            if (!$valid) {
                throw new \Exception($reason);
            }
        }

        return DB::transaction(function () use ($customer, $session, $data) {
            $fee = (float) $data['shipping_fee'];

            if ($data['payment_method'] === 'wallet') {
                $wallet = $customer->wallet;
                if ($wallet->availableBalance() < $fee) {
                    throw new \Exception('Saldo tidak mencukupi.');
                }
                $wallet->increment('locked_balance', $fee);
            }

            // Snapshot komisi saat order dibuat agar tidak terpengaruh perubahan admin setting
            $commRate = (float) (AdminSetting::where('key', 'commission_jastip_percent')->value('value') ?? 10.0);

            $order = Order::create([
                'order_number'      => $this->generateOrderNumber(),
                'customer_id'       => $customer->id,
                'mitra_id'          => $session->mitra_id,
                'jastip_session_id' => $session->id,
                'type'              => 'jastip',
                'status'            => 'accepted', // langsung accepted karena mitra sudah aktif
                'is_jastip_enabled' => false,
                'pickup_address'    => $data['pickup_address'],
                'pickup_lat'        => $data['pickup_lat'],
                'pickup_lng'        => $data['pickup_lng'],
                'dropoff_address'   => $data['dropoff_address'],
                'dropoff_lat'       => $data['dropoff_lat'],
                'dropoff_lng'       => $data['dropoff_lng'],
                'item_category_id'  => $data['item_category_id'] ?? null,
                'item_description'  => $data['item_description'],
                'item_value'        => $data['item_value'] ?? 0,
                'vehicle_type'      => $session->vehicle_type,
                'requires_disclaimer' => $data['requires_disclaimer'] ?? false,
                'shipping_fee'      => $fee,
                'commission_rate'   => $commRate,
                'payment_method'    => $data['payment_method'] ?? 'wallet',
                'payment_status'    => 'pending',
                'accepted_at'       => now(),
                'notes'             => $data['notes'] ?? null,
            ]);

            // Update sesi: tambah jumlah jastip & akumulasi ongkir
            $session->increment('jastip_count');
            $session->increment('total_jastip_fee', $fee);
            $session->refresh();

            // Broadcast ke pelanggan master
            if ($session->master_order_id) {
                broadcast(new JastipOrderPlaced(
                    $session->master_order_id,
                    $order,
                    $session->jastip_count
                ));
            }

            $this->notifService->jastipOrderReceived($customer, $order->order_number);

            return $order;
        });
    }

    // ─── Mitra terima order master ──────────────────────────────────────────

    public function acceptOrder(Order $order, User $mitra): void
    {
        if ($order->status !== 'pending') {
            throw new \Exception('Order tidak dalam status pending.');
        }

        $order->update([
            'mitra_id'    => $mitra->id,
            'status'      => 'accepted',
            'accepted_at' => now(),
        ]);

        broadcast(new OrderStatusUpdated($order->fresh(), 'pending'));
        broadcast(new OrderNoLongerAvailable($order->id, $order->vehicle_type));
    }

    // ─── Update status order oleh mitra ────────────────────────────────────

    public function updateStatus(Order $order, string $newStatus): void
    {
        $allowed = $this->allowedNextStatus($order->status);
        if (!in_array($newStatus, $allowed)) {
            throw new \Exception("Tidak bisa ubah status dari '{$order->status}' ke '{$newStatus}'.");
        }

        // Gate foto per transisi — hanya aktif jika pelanggan mengaktifkan wajib foto
        if ($order->require_photo) {
            $photoGate = [
                'picked_up'   => ['stage' => 'pickup',   'label' => 'tiba di pickup'],
                'on_delivery' => ['stage' => 'packing',  'label' => 'barang dikemas'],
                'delivered'   => ['stage' => 'delivery', 'label' => 'sampai tujuan'],
            ];
            if (isset($photoGate[$newStatus])) {
                $gate = $photoGate[$newStatus];
                if (!$order->photos()->where('stage', $gate['stage'])->exists()) {
                    throw new \Exception("Wajib upload foto {$gate['label']} sebelum melanjutkan.");
                }
            }
        }

        $timestamps = [
            'on_pickup'   => 'on_pickup_at',
            'picked_up'   => 'picked_up_at',
            'on_delivery' => 'on_delivery_at',
            'delivered'   => 'delivered_at',
            'completed'   => 'completed_at',
        ];

        $updateData = ['status' => $newStatus];
        if (!empty($timestamps[$newStatus])) {
            $updateData[$timestamps[$newStatus]] = now();
        }

        $prevStatus = $order->status;
        $order->update($updateData);

        broadcast(new OrderStatusUpdated($order->fresh(), $prevStatus));

        // Kirim notifikasi ke customer berdasarkan status baru
        $customer = $order->customer;
        match ($newStatus) {
            'accepted'    => $this->notifService->orderAccepted($customer, $order->order_number),
            'on_pickup'   => $this->notifService->orderOnPickup($customer, $order->order_number),
            'picked_up'   => $this->notifService->orderPickedUp($customer, $order->order_number),
            'on_delivery' => $this->notifService->orderOnDelivery($customer, $order->order_number),
            'delivered'   => $this->notifService->orderDelivered($customer, $order->order_number),
            'completed'   => $this->notifService->orderCompleted($customer, $order->mitra, $order->order_number),
            default       => null,
        };

        if ($newStatus === 'completed') {
            $this->finalizeOrder($order);
        }
    }

    // ─── Selesaikan order dan transfer saldo ────────────────────────────────

    private function finalizeOrder(Order $order): void
    {
        DB::transaction(function () use ($order) {
            $this->commissionService->applyCommission($order);
            $order->refresh();

            $customer = $order->customer;
            $mitra    = $order->mitra;
            $fee      = (float) $order->shipping_fee;

            if ($order->payment_method === 'wallet') {
                // Kurangi locked balance dan potong saldo customer
                $customer->wallet->decrement('locked_balance', $fee);
                $this->walletService->debit($customer, $fee, 'order_payment',
                    "Pembayaran order #{$order->order_number}", $order);
            }

            // Kredit pendapatan ke mitra
            if ($mitra) {
                $this->walletService->credit($mitra, (float) $order->mitra_income, 'order_income',
                    "Pendapatan order #{$order->order_number}", $order);

                // Update total transaksi dan badge mitra
                $detail = $mitra->mitraDetail;
                if ($detail) {
                    $newTotal = $detail->total_transactions + 1;
                    $badge = match (true) {
                        $newTotal >= 50 => 'master',
                        $newTotal >= 10 => 'trusted',
                        default         => 'starter',
                    };
                    $detail->update(['total_transactions' => $newTotal, 'badge' => $badge]);
                }
            }

            $order->update(['payment_status' => 'paid']);

            // Jika order jastip: cek apakah master order selesai untuk hitung diskon
            if ($order->isJastip() && $order->jastipSession) {
                $this->checkAndApplyMasterDiscount($order->jastipSession);
            }
        });
    }

    // ─── Hitung dan terapkan diskon ke master setelah semua jastip selesai ─

    private function checkAndApplyMasterDiscount(JastipSession $session): void
    {
        $masterOrder = $session->masterOrder;
        if (!$masterOrder || !$masterOrder->is_jastip_enabled) return;

        $discount = $this->commissionService->calculateMasterDiscount($session);
        if ($discount <= 0) return;

        $masterOrder->update(['jastip_discount_applied' => $discount]);
    }

    // ─── Tutup sesi JastipQu ────────────────────────────────────────────────

    public function closeJastipSession(JastipSession $session, string $reason = 'manual'): void
    {
        $session->update([
            'status'        => 'closed',
            'closed_reason' => $reason,
            'closed_at'     => now(),
        ]);

        // Hitung diskon akhir untuk master
        $this->checkAndApplyMasterDiscount($session);
    }

    // ─── Cancel order ───────────────────────────────────────────────────────

    public function cancelOrder(Order $order, string $reason): void
    {
        if (in_array($order->status, ['completed', 'cancelled'])) {
            throw new \Exception('Order tidak bisa dibatalkan.');
        }

        DB::transaction(function () use ($order, $reason) {
            // Kembalikan saldo yang terkunci
            if ($order->payment_method === 'wallet' && $order->payment_status === 'pending') {
                $order->customer->wallet->decrement('locked_balance', (float) $order->shipping_fee);
            }

            // Jika jastip: kurangi count di sesi
            if ($order->isJastip() && $order->jastipSession) {
                $session = $order->jastipSession;
                $session->decrement('jastip_count');
                $session->decrement('total_jastip_fee', (float) $order->shipping_fee);
            }

            $order->update([
                'status'       => 'cancelled',
                'cancelled_at' => now(),
                'cancel_reason'=> $reason,
            ]);
        });
    }

    private function generateOrderNumber(): string
    {
        return 'ZG' . strtoupper(Str::random(8));
    }

    private function allowedNextStatus(string $current): array
    {
        return match ($current) {
            'accepted'    => ['on_pickup', 'cancelled'],
            'on_pickup'   => ['picked_up'],
            'picked_up'   => ['on_delivery'],
            'on_delivery' => ['delivered'],
            'delivered'   => ['completed'],
            default       => [],
        };
    }
}
