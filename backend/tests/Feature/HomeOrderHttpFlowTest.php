<?php

namespace Tests\Feature;

use App\Models\HomeOrder;
use App\Models\HomeProvider;
use App\Models\HomeService;
use App\Models\User;
use App\Models\Wallet;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Str;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class HomeOrderHttpFlowTest extends TestCase
{
    use DatabaseTransactions;

    private function makeCustomer(float $balance): User
    {
        $user = User::factory()->create(['role' => 'pelanggan']);
        Wallet::create(['user_id' => $user->id, 'balance' => $balance, 'locked_balance' => 0]);
        return $user;
    }

    private function makeProviderWithService(int $price): array
    {
        $user = User::factory()->create(['role' => 'home_provider']);
        Wallet::create(['user_id' => $user->id, 'balance' => 0, 'locked_balance' => 0]);
        $provider = HomeProvider::create([
            'user_id' => $user->id,
            'name'    => 'Laundry Test',
            'slug'    => 'laundry-http-' . Str::random(6),
            'category'=> 'laundry',
            'address' => 'Jl. Test',
            'status'  => 'active',
        ]);
        $service = HomeService::create([
            'provider_id' => $provider->id,
            'name'        => 'Cuci Setrika',
            'unit'        => 'kg',
            'price'       => $price,
            'is_active'   => true,
        ]);
        return [$user, $provider, $service];
    }

    public function test_place_order_rejects_when_wallet_balance_is_insufficient(): void
    {
        $customer = $this->makeCustomer(10_000);
        [, $provider, $service] = $this->makeProviderWithService(50_000);
        Sanctum::actingAs($customer);

        $response = $this->postJson('/api/home/orders', [
            'provider_id'    => $provider->id,
            'pickup_address' => 'Jl. Rumah Saya',
            'items'          => [['service_id' => $service->id, 'quantity' => 1]],
        ]);

        $response->assertStatus(422);
        $this->assertDatabaseMissing('home_orders', ['customer_id' => $customer->id]);
    }

    public function test_full_lifecycle_via_http_settles_wallet_correctly(): void
    {
        $customer = $this->makeCustomer(100_000);
        [$providerUser, $provider, $service] = $this->makeProviderWithService(50_000);

        // 1) Pelanggan buat order (2kg @ 50.000 = 100.000)
        Sanctum::actingAs($customer);
        $create = $this->postJson('/api/home/orders', [
            'provider_id'    => $provider->id,
            'pickup_address' => 'Jl. Rumah Saya',
            'items'          => [['service_id' => $service->id, 'quantity' => 2]],
        ]);
        $create->assertStatus(201);
        $orderId = $create->json('data.id');

        $customer->wallet->refresh();
        $this->assertSame(100_000.0, (float) $customer->wallet->locked_balance, 'saldo harus ditahan sebesar total order');

        // 2) Provider proses sampai completed (laundry -> alur non on-site: confirmed -> picked_up -> processing -> ready -> completed)
        Sanctum::actingAs($providerUser);
        foreach (['confirmed', 'picked_up', 'processing', 'ready', 'completed'] as $next) {
            $resp = $this->patchJson("/api/home/provider/orders/{$orderId}/status", ['status' => $next]);
            $resp->assertStatus(200);
        }

        $order = HomeOrder::find($orderId);
        $this->assertNotNull($order->settled_at);

        $customer->wallet->refresh();
        $providerUser->wallet->refresh();

        $this->assertSame(0.0, (float) $customer->wallet->locked_balance, 'hold harus dilepas setelah settle');
        $this->assertSame(0.0, (float) $customer->wallet->balance, '100.000 - 100.000 (order) = 0');
        $this->assertSame(90_000.0, (float) $providerUser->wallet->balance, 'provider dapat 90% (komisi default 10%)');
    }

    public function test_customer_cancel_releases_hold_via_http(): void
    {
        $customer = $this->makeCustomer(100_000);
        [, $provider, $service] = $this->makeProviderWithService(50_000);

        Sanctum::actingAs($customer);
        $create = $this->postJson('/api/home/orders', [
            'provider_id'    => $provider->id,
            'pickup_address' => 'Jl. Rumah Saya',
            'items'          => [['service_id' => $service->id, 'quantity' => 1]],
        ]);
        $orderId = $create->json('data.id');

        $customer->wallet->refresh();
        $this->assertSame(50_000.0, (float) $customer->wallet->locked_balance);

        $cancel = $this->postJson("/api/home/orders/{$orderId}/cancel", []);
        $cancel->assertStatus(200);

        $customer->wallet->refresh();
        $this->assertSame(0.0, (float) $customer->wallet->locked_balance, 'hold harus dilepas saat dibatalkan');
        $this->assertSame(100_000.0, (float) $customer->wallet->balance, 'saldo tidak berkurang karena order dibatalkan');
    }
}
