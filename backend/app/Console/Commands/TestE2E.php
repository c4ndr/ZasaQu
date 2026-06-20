<?php

namespace App\Console\Commands;

use App\Models\FoodMerchant;
use App\Models\FoodOrder;
use App\Models\MartOrder;
use App\Models\Order;
use App\Models\RideOrder;
use App\Models\User;
use App\Services\FoodOrderService;
use App\Services\OrderService;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

class TestE2E extends Command
{
    protected $signature   = 'test:e2e {--module=all : Modul yang ditest: zasago|zasaride|zasafood|zasamart|all}';
    protected $description = 'E2E test flow order dari pelanggan hingga selesai (semua modul atau spesifik)';

    private array $log = [];

    public function __construct(
        private OrderService     $orderService,
        private FoodOrderService $foodOrderService,
    ) {
        parent::__construct();
    }

    public function handle(): int
    {
        $module  = $this->option('module');
        $modules = $module === 'all'
            ? ['zasago', 'zasaride', 'zasafood', 'zasamart']
            : [$module];

        $pelanggan = User::where('email', 'test.pelanggan@zasaqu.id')->firstOrFail();
        $mitra     = User::where('email', 'test.mitra@zasaqu.id')->firstOrFail();
        $merchant  = User::where('email', 'test.merchant@zasaqu.id')->firstOrFail();
        $seller    = User::where('email', 'test.seller@zasaqu.id')->firstOrFail();

        $results = [];
        foreach ($modules as $m) {
            $this->log = [];
            $results[$m] = match($m) {
                'zasago'   => $this->testZasaGo($pelanggan, $mitra),
                'zasaride' => $this->testZasaRide($pelanggan, $mitra),
                'zasafood' => $this->testZasaFood($pelanggan, $merchant, $mitra),
                'zasamart' => $this->testZasaMart($pelanggan, $seller, $mitra),
                default    => ['status' => 'skip', 'error' => 'Modul tidak dikenal', 'steps' => []],
            };
        }

        $passCount = count(array_filter($results, fn($r) => $r['status'] === 'pass'));
        $output = [
            'summary'   => "{$passCount}/" . count($modules) . " modul PASS",
            'module'    => $module,
            'results'   => $results,
            'tested_at' => now()->toIso8601String(),
        ];

        $this->line(json_encode($output, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT));

        return $passCount === count($modules) ? self::SUCCESS : self::FAILURE;
    }

    // ─── ZasaGo ──────────────────────────────────────────────────────────────

    private function testZasaGo(User $pelanggan, User $mitra): array
    {
        try {
            $order = $this->orderService->createMasterOrder($pelanggan, [
                'pickup_address'   => 'Jl. Test Pickup ZasaGo',
                'pickup_lat'       => -6.200000,
                'pickup_lng'       => 106.816666,
                'dropoff_address'  => 'Jl. Test Dropoff ZasaGo',
                'dropoff_lat'      => -6.210000,
                'dropoff_lng'      => 106.820000,
                'item_description' => '[E2E TEST] Paket dokumen',
                'vehicle_type'     => 'motor',
                'shipping_fee'     => 15000,
                'payment_method'   => 'wallet',
            ]);
            $this->step("Buat order #{$order->order_number}");

            $this->orderService->acceptOrder($order, $mitra);
            $this->step('Mitra accept');

            foreach (['on_pickup', 'picked_up', 'on_delivery', 'delivered'] as $status) {
                $order->refresh();
                $this->orderService->updateStatus($order, $status);
                $this->step("Status → {$status}");
            }

            return ['status' => 'pass', 'order_id' => $order->id, 'steps' => $this->log];
        } catch (\Throwable $e) {
            return ['status' => 'fail', 'error' => $e->getMessage(), 'steps' => $this->log];
        }
    }

    // ─── ZasaRide ────────────────────────────────────────────────────────────

    private function testZasaRide(User $pelanggan, User $mitra): array
    {
        try {
            $order = DB::transaction(function () use ($pelanggan) {
                return RideOrder::create([
                    'order_number'        => 'TEST-RIDE-' . strtoupper(substr(md5(microtime()), 0, 8)),
                    'customer_id'         => $pelanggan->id,
                    'vehicle_type'        => 'motor',
                    'ride_type'           => 'regular',
                    'pickup_address'      => 'Jl. Test Pickup ZasaRide',
                    'pickup_lat'          => -6.200000,
                    'pickup_lng'          => 106.816666,
                    'destination_address' => 'Jl. Test Destination ZasaRide',
                    'destination_lat'     => -6.210000,
                    'destination_lng'     => 106.820000,
                    'distance_km'         => 1.5,
                    'fare'                => 15000,
                    'payment_method'      => 'wallet',
                    'payment_status'      => 'unpaid',
                    'status'              => 'pending',
                ]);
            });
            $this->step("Buat order #{$order->order_number}");

            DB::transaction(function () use ($order, $mitra) {
                $locked = RideOrder::where('status', 'pending')->lockForUpdate()->findOrFail($order->id);
                $locked->update(['mitra_id' => $mitra->id, 'status' => 'accepted', 'accepted_at' => now()]);
            });
            $this->step('Mitra accept');

            $allowedFlow = [
                'accepted'  => 'on_pickup',
                'on_pickup' => 'on_ride',
                'on_ride'   => 'completed',
            ];
            foreach ($allowedFlow as $from => $to) {
                DB::transaction(function () use ($order, $mitra, $to) {
                    $locked = RideOrder::where('mitra_id', $mitra->id)
                        ->lockForUpdate()->findOrFail($order->id);
                    $ts = ['on_pickup' => ['on_pickup_at' => now()], 'on_ride' => ['on_ride_at' => now()], 'completed' => ['completed_at' => now(), 'payment_status' => 'paid']];
                    $locked->update(array_merge(['status' => $to], $ts[$to] ?? []));
                });
                $this->step("Status → {$to}");
            }

            return ['status' => 'pass', 'order_id' => $order->id, 'steps' => $this->log];
        } catch (\Throwable $e) {
            return ['status' => 'fail', 'error' => $e->getMessage(), 'steps' => $this->log];
        }
    }

    // ─── ZasaFood ────────────────────────────────────────────────────────────

    private function testZasaFood(User $pelanggan, User $merchant, User $mitra): array
    {
        try {
            // Pakai merchant pertama yang active — test merchant mungkin belum punya record merchant
            $merchantRecord = FoodMerchant::where('status', 'active')->firstOrFail();
            $merchantUser   = User::findOrFail($merchantRecord->user_id);
            $menuItem = $merchantRecord->menuItems()->where('is_available', true)->firstOrFail();

            $order = $this->foodOrderService->createOrder($pelanggan, [
                'merchant_id'      => $merchantRecord->id,
                'items'            => [['menu_item_id' => $menuItem->id, 'quantity' => 1]],
                'delivery_address' => 'Jl. Test Delivery ZasaFood',
                'delivery_lat'     => -6.210000,
                'delivery_lng'     => 106.820000,
                'delivery_fee'     => 10000,
                'payment_method'   => 'wallet',
            ]);
            $this->step("Buat order #{$order->order_number}");

            $this->foodOrderService->merchantAccept($order, 15);
            $this->step('Merchant accept');

            $this->foodOrderService->merchantPreparing($order->refresh());
            $this->step('Status → preparing');

            $this->foodOrderService->merchantReady($order->refresh());
            $this->step('Status → ready_for_pickup');

            $this->foodOrderService->mitraAccept($order->refresh(), $mitra);
            $this->step('Mitra accept');

            foreach (['picked_up', 'on_delivery', 'delivered'] as $status) {
                $order->refresh();
                $this->foodOrderService->mitraUpdateStatus($order, $status);
                $this->step("Status → {$status}");
            }

            return ['status' => 'pass', 'order_id' => $order->id, 'steps' => $this->log];
        } catch (\Throwable $e) {
            return ['status' => 'fail', 'error' => $e->getMessage(), 'steps' => $this->log];
        }
    }

    // ─── ZasaMart ────────────────────────────────────────────────────────────

    private function testZasaMart(User $pelanggan, User $seller, User $mitra): array
    {
        try {
            // Pakai seller pertama — test seller mungkin belum punya record seller
            $sellerRecord = \App\Models\MartSeller::first();
            if (!$sellerRecord) throw new \Exception('Tidak ada MartSeller aktif di database.');
            $product = $sellerRecord->products()->where('is_active', true)->firstOrFail();

            // Buat order langsung di DB (bypass cart untuk simplisitas test)
            $order = DB::transaction(function () use ($pelanggan, $sellerRecord, $product) {
                $subtotal = (int) $product->price;
                $o = MartOrder::create([
                    'order_number'             => 'TEST-MART-' . strtoupper(substr(md5(microtime()), 0, 8)),
                    'customer_id'              => $pelanggan->id,
                    'seller_id'                => $sellerRecord->id,
                    'seller_name_snapshot'     => $sellerRecord->name,
                    'seller_address_snapshot'  => $sellerRecord->address ?? 'Alamat Test',
                    'delivery_name'            => $pelanggan->name,
                    'delivery_address'         => 'Jl. Test Delivery ZasaShop',
                    'delivery_lat'             => -6.210000,
                    'delivery_lng'             => 106.820000,
                    'subtotal'                 => $subtotal,
                    'shipping_fee'             => 10000,
                    'total'                    => $subtotal + 10000,
                    'payment_method'           => 'wallet',
                    'status'                   => 'pending',
                ]);
                $o->items()->create([
                    'product_id'   => $product->id,
                    'product_name' => $product->name,
                    'price'        => $product->price,
                    'quantity'     => 1,
                    'subtotal'     => $product->price,
                ]);
                return $o;
            });
            $this->step("Buat order #{$order->order_number}");

            // Seller flow
            foreach (['confirmed', 'packed'] as $status) {
                $order->refresh()->update(['status' => $status]);
                $this->step("Seller → {$status}");
            }

            // Mitra pickup
            $order->refresh()->update(['mitra_id' => $mitra->id, 'status' => 'picking_up', 'accepted_at' => now()]);
            $this->step('Mitra accept');

            foreach (['on_delivery', 'delivered'] as $status) {
                $order->refresh()->update(['status' => $status]);
                $this->step("Status → {$status}");
            }

            return ['status' => 'pass', 'order_id' => $order->id, 'steps' => $this->log];
        } catch (\Throwable $e) {
            return ['status' => 'fail', 'error' => $e->getMessage(), 'steps' => $this->log];
        }
    }

    private function step(string $msg): void
    {
        $this->log[] = $msg;
    }
}
