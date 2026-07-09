<?php

namespace Tests\Feature;

use App\Models\HomeOrder;
use App\Models\HomeProvider;
use App\Models\HomeService;
use App\Models\User;
use App\Models\Wallet;
use App\Services\HomeOrderService;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Str;
use Tests\TestCase;

class HomeWalletSettlementTest extends TestCase
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
        $user = User::factory()->create(['role' => 'home_provider']);
        Wallet::create(['user_id' => $user->id, 'balance' => 0, 'locked_balance' => 0]);
        $provider = HomeProvider::create([
            'user_id' => $user->id,
            'name'    => 'Laundry Test',
            'slug'    => 'laundry-test-' . Str::random(6),
            'category'=> 'laundry',
            'address' => 'Jl. Test',
            'status'  => 'active',
        ]);
        return [$user, $provider];
    }

    private function makeOrder(User $customer, HomeProvider $provider, int $totalPrice, int $providerIncome, int $mitraIncome = 0, ?int $mitraId = null): HomeOrder
    {
        return HomeOrder::create([
            'order_number'        => HomeOrder::generateNumber(),
            'customer_id'         => $customer->id,
            'provider_id'         => $provider->id,
            'status'               => 'pending',
            'pickup_address'      => 'Jl. Pelanggan',
            'pickup_type'         => 'mandiri',
            'pickup_fee'          => 0,
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
        $customer = $this->makeCustomer(100_000);
        [$providerUser, $provider] = $this->makeProvider();
        $order = $this->makeOrder($customer, $provider, totalPrice: 90_000, providerIncome: 81_000);

        app(HomeOrderService::class)->settle($order);

        $customer->wallet->refresh();
        $providerUser->wallet->refresh();
        $order->refresh();

        $this->assertSame(10_000.0, (float) $customer->wallet->balance, 'Saldo pelanggan harus berkurang 90.000');
        $this->assertSame(81_000.0, (float) $providerUser->wallet->balance, 'Saldo provider harus bertambah 81.000');
        $this->assertNotNull($order->settled_at);

        $this->assertDatabaseHas('wallet_transactions', [
            'wallet_id' => $customer->wallet->id,
            'type'      => 'order_payment',
            'amount'    => 90000,
        ]);
        $this->assertDatabaseHas('wallet_transactions', [
            'wallet_id' => $providerUser->wallet->id,
            'type'      => 'order_income',
            'amount'    => 81000,
        ]);
    }

    public function test_provider_cannot_be_credited_when_customer_has_no_balance(): void
    {
        // Ini persis skenario eksploitasi lama: order dibuat tanpa hold/pembayaran apapun
        // (mensimulasikan customer yang wallet-nya sudah kosong sebelum settle terjadi).
        $customer = $this->makeCustomer(0);
        [$providerUser, $provider] = $this->makeProvider();
        $order = $this->makeOrder($customer, $provider, totalPrice: 90_000, providerIncome: 81_000);

        try {
            app(HomeOrderService::class)->settle($order);
            $this->fail('settle() seharusnya melempar Exception karena saldo pelanggan tidak cukup.');
        } catch (\Exception $e) {
            $this->assertStringContainsString('Saldo tidak mencukupi', $e->getMessage());
        }

        $providerUser->wallet->refresh();
        $order->refresh();

        // Titik krusial dari perbaikan: provider TIDAK dikredit sepeser pun,
        // dan settle() tidak ditandai selesai (settled_at tetap null) karena
        // seluruh transaksi di-rollback oleh Exception.
        $this->assertSame(0.0, (float) $providerUser->wallet->balance, 'Provider tidak boleh dapat saldo tanpa pembayaran nyata');
        $this->assertNull($order->settled_at);
        $this->assertDatabaseMissing('wallet_transactions', [
            'wallet_id' => $providerUser->wallet->id,
        ]);
    }

    public function test_place_hold_rejects_insufficient_balance(): void
    {
        $customer = $this->makeCustomer(50_000);

        $this->expectException(\Exception::class);
        $this->expectExceptionMessage('Saldo tidak mencukupi');

        app(HomeOrderService::class)->placeHold($customer, 90_000);
    }

    public function test_place_hold_locks_balance_without_deducting_it(): void
    {
        $customer = $this->makeCustomer(100_000);

        app(HomeOrderService::class)->placeHold($customer, 90_000);

        $customer->wallet->refresh();
        $this->assertSame(100_000.0, (float) $customer->wallet->balance, 'balance belum berkurang saat hold');
        $this->assertSame(90_000.0, (float) $customer->wallet->locked_balance);
        $this->assertSame(10_000.0, $customer->wallet->availableBalance());
    }

    public function test_release_hold_returns_locked_balance(): void
    {
        $customer = $this->makeCustomer(100_000);
        [$providerUser, $provider] = $this->makeProvider();

        app(HomeOrderService::class)->placeHold($customer, 90_000);
        $order = $this->makeOrder($customer, $provider, totalPrice: 90_000, providerIncome: 81_000);
        $order->update(['status' => 'cancelled']);

        app(HomeOrderService::class)->releaseHold($order);

        $customer->wallet->refresh();
        $this->assertSame(0.0, (float) $customer->wallet->locked_balance);
        $this->assertSame(100_000.0, (float) $customer->wallet->balance);
    }

    public function test_settle_is_idempotent(): void
    {
        $customer = $this->makeCustomer(100_000);
        [$providerUser, $provider] = $this->makeProvider();
        $order = $this->makeOrder($customer, $provider, totalPrice: 90_000, providerIncome: 81_000);

        $service = app(HomeOrderService::class);
        $service->settle($order->fresh());
        $service->settle($order->fresh()); // panggilan kedua — mis. mitra & provider sama-sama klik selesai

        $customer->wallet->refresh();
        $providerUser->wallet->refresh();

        $this->assertSame(10_000.0, (float) $customer->wallet->balance, 'debit tidak boleh terjadi dua kali');
        $this->assertSame(81_000.0, (float) $providerUser->wallet->balance, 'kredit tidak boleh terjadi dua kali');
    }

    public function test_settle_pays_mitra_pickup_fee_alongside_provider(): void
    {
        $customer = $this->makeCustomer(100_000);
        [$providerUser, $provider] = $this->makeProvider();
        $mitraUser = User::factory()->create(['role' => 'mitra_motor']);
        Wallet::create(['user_id' => $mitraUser->id, 'balance' => 0, 'locked_balance' => 0]);

        // total 90.000 = 81.000 jasa (provider) + 9.000 ongkir (mitra)
        $order = $this->makeOrder($customer, $provider, totalPrice: 90_000, providerIncome: 81_000, mitraIncome: 9_000, mitraId: $mitraUser->id);

        app(HomeOrderService::class)->settle($order);

        $customer->wallet->refresh();
        $providerUser->wallet->refresh();
        $mitraUser->wallet->refresh();

        $this->assertSame(10_000.0, (float) $customer->wallet->balance);
        $this->assertSame(81_000.0, (float) $providerUser->wallet->balance);
        $this->assertSame(9_000.0, (float) $mitraUser->wallet->balance);
    }
}
