<?php

namespace Tests\Feature;

use App\Models\ServOrder;
use App\Models\ServProvider;
use App\Models\User;
use App\Models\Wallet;
use App\Services\ServOrderService;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Str;
use Tests\TestCase;

class ServWalletSettlementTest extends TestCase
{
    use DatabaseTransactions;

    private function makeCustomer(float $balance): User
    {
        $user = User::factory()->create(['role' => 'pelanggan']);
        Wallet::create(['user_id' => $user->id, 'balance' => $balance, 'locked_balance' => 0]);
        return $user;
    }

    private function makeProvider(): array
    {
        $user = User::factory()->create(['role' => 'serv_provider']);
        Wallet::create(['user_id' => $user->id, 'balance' => 0, 'locked_balance' => 0]);
        $provider = ServProvider::create([
            'user_id'  => $user->id,
            'name'     => 'AC Service Test',
            'slug'     => 'ac-service-test-' . Str::random(6),
            'category' => 'ac',
            'status'   => 'active',
        ]);
        return [$user, $provider];
    }

    private function makeOrder(User $customer, ServProvider $provider, int $totalPrice, int $providerIncome, int $mitraIncome = 0, ?int $mitraId = null): ServOrder
    {
        return ServOrder::create([
            'order_number'        => ServOrder::generateNumber(),
            'customer_id'         => $customer->id,
            'provider_id'         => $provider->id,
            'status'               => 'pending',
            'address'             => 'Jl. Pelanggan',
            'total_price'         => $totalPrice,
            'commission_rate'     => 10,
            'platform_commission' => $totalPrice - $providerIncome - $mitraIncome,
            'provider_income'     => $providerIncome,
            'mitra_income'        => $mitraIncome,
            'mitra_id'            => $mitraId,
        ]);
    }

    public function test_settle_debits_customer_and_credits_provider(): void
    {
        $customer = $this->makeCustomer(200_000);
        [$providerUser, $provider] = $this->makeProvider();
        $order = $this->makeOrder($customer, $provider, totalPrice: 150_000, providerIncome: 135_000);

        app(ServOrderService::class)->settle($order);

        $customer->wallet->refresh();
        $providerUser->wallet->refresh();
        $order->refresh();

        $this->assertSame(50_000.0, (float) $customer->wallet->balance);
        $this->assertSame(135_000.0, (float) $providerUser->wallet->balance);
        $this->assertNotNull($order->settled_at);
    }

    public function test_provider_cannot_be_credited_when_customer_has_no_balance(): void
    {
        $customer = $this->makeCustomer(0);
        [$providerUser, $provider] = $this->makeProvider();
        $order = $this->makeOrder($customer, $provider, totalPrice: 150_000, providerIncome: 135_000);

        try {
            app(ServOrderService::class)->settle($order);
            $this->fail('settle() seharusnya melempar Exception karena saldo pelanggan tidak cukup.');
        } catch (\Exception $e) {
            $this->assertStringContainsString('Saldo tidak mencukupi', $e->getMessage());
        }

        $providerUser->wallet->refresh();
        $order->refresh();

        $this->assertSame(0.0, (float) $providerUser->wallet->balance);
        $this->assertNull($order->settled_at);
    }

    public function test_place_hold_rejects_insufficient_balance(): void
    {
        $customer = $this->makeCustomer(50_000);

        $this->expectException(\Exception::class);
        $this->expectExceptionMessage('Saldo tidak mencukupi');

        app(ServOrderService::class)->placeHold($customer, 150_000);
    }

    public function test_release_hold_returns_locked_balance(): void
    {
        $customer = $this->makeCustomer(200_000);
        [$providerUser, $provider] = $this->makeProvider();

        app(ServOrderService::class)->placeHold($customer, 150_000);
        $order = $this->makeOrder($customer, $provider, totalPrice: 150_000, providerIncome: 135_000);
        $order->update(['status' => 'cancelled']);

        app(ServOrderService::class)->releaseHold($order);

        $customer->wallet->refresh();
        $this->assertSame(0.0, (float) $customer->wallet->locked_balance);
        $this->assertSame(200_000.0, (float) $customer->wallet->balance);
    }

    public function test_settle_is_idempotent(): void
    {
        $customer = $this->makeCustomer(200_000);
        [$providerUser, $provider] = $this->makeProvider();
        $order = $this->makeOrder($customer, $provider, totalPrice: 150_000, providerIncome: 135_000);

        $service = app(ServOrderService::class);
        $service->settle($order->fresh());
        $service->settle($order->fresh());

        $customer->wallet->refresh();
        $providerUser->wallet->refresh();

        $this->assertSame(50_000.0, (float) $customer->wallet->balance);
        $this->assertSame(135_000.0, (float) $providerUser->wallet->balance);
    }

    public function test_settle_pays_mitra_alongside_provider(): void
    {
        $customer = $this->makeCustomer(200_000);
        [$providerUser, $provider] = $this->makeProvider();
        $mitraUser = User::factory()->create(['role' => 'mitra_motor']);
        Wallet::create(['user_id' => $mitraUser->id, 'balance' => 0, 'locked_balance' => 0]);

        $order = $this->makeOrder($customer, $provider, totalPrice: 150_000, providerIncome: 120_000, mitraIncome: 15_000, mitraId: $mitraUser->id);

        app(ServOrderService::class)->settle($order);

        $customer->wallet->refresh();
        $providerUser->wallet->refresh();
        $mitraUser->wallet->refresh();

        $this->assertSame(50_000.0, (float) $customer->wallet->balance);
        $this->assertSame(120_000.0, (float) $providerUser->wallet->balance);
        $this->assertSame(15_000.0, (float) $mitraUser->wallet->balance);
    }
}
