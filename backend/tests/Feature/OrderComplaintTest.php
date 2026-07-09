<?php

namespace Tests\Feature;

use App\Models\HomeOrder;
use App\Models\HomeProvider;
use App\Models\OrderComplaint;
use App\Models\User;
use App\Models\Wallet;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Str;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class OrderComplaintTest extends TestCase
{
    use DatabaseTransactions;

    private function makeCustomer(): User
    {
        $user = User::factory()->create(['role' => 'pelanggan']);
        Wallet::create(['user_id' => $user->id, 'balance' => 0, 'locked_balance' => 0]);
        return $user;
    }

    private function makeAdmin(): User
    {
        return User::factory()->create(['role' => 'admin']);
    }

    private function makeCompletedOrder(User $customer, ?\Carbon\Carbon $completedAt = null): HomeOrder
    {
        $providerUser = User::factory()->create(['role' => 'home_provider']);
        Wallet::create(['user_id' => $providerUser->id, 'balance' => 0, 'locked_balance' => 0]);
        $provider = HomeProvider::create([
            'user_id' => $providerUser->id,
            'name'    => 'Laundry Test',
            'slug'    => 'laundry-test-' . Str::random(6),
            'category'=> 'laundry',
            'address' => 'Jl. Test',
            'status'  => 'active',
        ]);

        return HomeOrder::create([
            'order_number'        => HomeOrder::generateNumber(),
            'customer_id'         => $customer->id,
            'provider_id'         => $provider->id,
            'status'              => 'completed',
            'pickup_address'      => 'Jl. Pelanggan',
            'pickup_type'         => 'mandiri',
            'pickup_fee'          => 0,
            'total_price'         => 90_000,
            'commission_rate'     => 10,
            'platform_commission' => 9_000,
            'provider_income'     => 81_000,
            'mitra_income'        => 0,
            'completed_at'        => $completedAt ?? now(),
        ]);
    }

    public function test_customer_can_report_completed_order_within_window(): void
    {
        $customer = $this->makeCustomer();
        $order    = $this->makeCompletedOrder($customer);
        Sanctum::actingAs($customer);

        $response = $this->postJson('/api/complaints', [
            'order_type'  => 'zasahome',
            'order_id'    => $order->id,
            'reason'      => 'servis_tidak_sesuai',
            'description' => 'Laundry belum kering saat diambil.',
        ]);

        $response->assertStatus(201);
        $this->assertDatabaseHas('order_complaints', [
            'order_type'  => 'zasahome',
            'order_id'    => $order->id,
            'customer_id' => $customer->id,
            'status'      => 'pending',
        ]);
    }

    public function test_cannot_report_order_belonging_to_another_customer(): void
    {
        $owner   = $this->makeCustomer();
        $stranger = $this->makeCustomer();
        $order   = $this->makeCompletedOrder($owner);
        Sanctum::actingAs($stranger);

        $response = $this->postJson('/api/complaints', [
            'order_type' => 'zasahome',
            'order_id'   => $order->id,
            'reason'     => 'lainnya',
        ]);

        $response->assertStatus(404);
        $this->assertDatabaseMissing('order_complaints', ['order_id' => $order->id]);
    }

    public function test_cannot_report_order_that_is_not_completed(): void
    {
        $customer = $this->makeCustomer();
        $order    = $this->makeCompletedOrder($customer);
        $order->update(['status' => 'confirmed']);
        Sanctum::actingAs($customer);

        $response = $this->postJson('/api/complaints', [
            'order_type' => 'zasahome',
            'order_id'   => $order->id,
            'reason'     => 'lainnya',
        ]);

        $response->assertStatus(422);
    }

    public function test_cannot_report_after_time_window_expires(): void
    {
        $customer = $this->makeCustomer();
        $order    = $this->makeCompletedOrder($customer, now()->subHours(25));
        Sanctum::actingAs($customer);

        $response = $this->postJson('/api/complaints', [
            'order_type' => 'zasahome',
            'order_id'   => $order->id,
            'reason'     => 'lainnya',
        ]);

        $response->assertStatus(422);
        $response->assertJsonFragment(['message' => 'Batas waktu pelaporan (24 jam setelah selesai) sudah lewat.']);
    }

    public function test_cannot_report_same_order_twice(): void
    {
        $customer = $this->makeCustomer();
        $order    = $this->makeCompletedOrder($customer);
        Sanctum::actingAs($customer);

        $this->postJson('/api/complaints', [
            'order_type' => 'zasahome',
            'order_id'   => $order->id,
            'reason'     => 'lainnya',
        ])->assertStatus(201);

        $response = $this->postJson('/api/complaints', [
            'order_type' => 'zasahome',
            'order_id'   => $order->id,
            'reason'     => 'lainnya',
        ]);

        $response->assertStatus(422);
    }

    public function test_admin_resolve_with_refund_credits_customer_wallet(): void
    {
        $customer = $this->makeCustomer();
        $order    = $this->makeCompletedOrder($customer);
        $admin    = $this->makeAdmin();

        $complaint = OrderComplaint::create([
            'order_type'  => 'zasahome',
            'order_id'    => $order->id,
            'customer_id' => $customer->id,
            'reason'      => 'servis_tidak_sesuai',
            'status'      => 'pending',
        ]);

        Sanctum::actingAs($admin);

        $response = $this->postJson("/api/admin/complaints/{$complaint->id}/resolve", [
            'resolution_note' => 'Terbukti, refund penuh diberikan.',
            'refund_amount'   => 90_000,
        ]);

        $response->assertStatus(200);

        $customer->wallet->refresh();
        $complaint->refresh();

        $this->assertSame(90_000.0, (float) $customer->wallet->balance);
        $this->assertSame('resolved', $complaint->status);
        $this->assertSame($admin->id, $complaint->resolved_by);
        $this->assertDatabaseHas('wallet_transactions', [
            'wallet_id' => $customer->wallet->id,
            'type'      => 'refund',
            'amount'    => 90000,
        ]);
    }

    public function test_admin_reject_does_not_credit_wallet(): void
    {
        $customer = $this->makeCustomer();
        $order    = $this->makeCompletedOrder($customer);
        $admin    = $this->makeAdmin();

        $complaint = OrderComplaint::create([
            'order_type'  => 'zasahome',
            'order_id'    => $order->id,
            'customer_id' => $customer->id,
            'reason'      => 'lainnya',
            'status'      => 'pending',
        ]);

        Sanctum::actingAs($admin);

        $response = $this->postJson("/api/admin/complaints/{$complaint->id}/reject", [
            'resolution_note' => 'Tidak terbukti, sudah dicek dengan provider.',
        ]);

        $response->assertStatus(200);

        $customer->wallet->refresh();
        $complaint->refresh();

        $this->assertSame(0.0, (float) $customer->wallet->balance);
        $this->assertSame('rejected', $complaint->status);
    }

    public function test_already_resolved_complaint_cannot_be_resolved_again(): void
    {
        $customer = $this->makeCustomer();
        $order    = $this->makeCompletedOrder($customer);
        $admin    = $this->makeAdmin();

        $complaint = OrderComplaint::create([
            'order_type'  => 'zasahome',
            'order_id'    => $order->id,
            'customer_id' => $customer->id,
            'reason'      => 'lainnya',
            'status'      => 'resolved',
            'resolved_at' => now(),
        ]);

        Sanctum::actingAs($admin);

        $response = $this->postJson("/api/admin/complaints/{$complaint->id}/resolve", [
            'resolution_note' => 'Coba resolve lagi.',
            'refund_amount'   => 50_000,
        ]);

        $response->assertStatus(404);

        $customer->wallet->refresh();
        $this->assertSame(0.0, (float) $customer->wallet->balance, 'tidak boleh double-refund lewat resolve dua kali');
    }
}
