<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('food_orders', function (Blueprint $table) {
            $table->id();
            $table->string('order_number', 30)->unique();
            $table->foreignId('customer_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('merchant_id')->constrained('food_merchants')->cascadeOnDelete();
            $table->foreignId('mitra_id')->nullable()->constrained('users')->nullOnDelete();

            $table->enum('status', [
                'pending',
                'merchant_accepted',
                'preparing',
                'ready_for_pickup',
                'mitra_on_pickup',
                'picked_up',
                'on_delivery',
                'delivered',
                'completed',
                'cancelled',
                'rejected',
            ])->default('pending');

            // Keuangan
            $table->unsignedInteger('subtotal');
            $table->unsignedInteger('delivery_fee');
            $table->unsignedInteger('total_amount');
            $table->decimal('commission_rate_food', 5, 2);       // snapshot %
            $table->decimal('commission_rate_delivery', 5, 2);   // snapshot %
            $table->unsignedInteger('platform_commission_food')->default(0);
            $table->unsignedInteger('platform_commission_delivery')->default(0);
            $table->unsignedInteger('merchant_income')->default(0);
            $table->unsignedInteger('mitra_income')->default(0);

            // Lokasi pengiriman
            $table->string('delivery_address');
            $table->decimal('delivery_lat', 10, 7);
            $table->decimal('delivery_lng', 10, 7);

            // Pembayaran
            $table->enum('payment_method', ['wallet', 'cod'])->default('wallet');
            $table->enum('payment_status', ['pending', 'paid', 'refunded'])->default('pending');

            // Estimasi
            $table->unsignedSmallInteger('estimated_prep_minutes')->nullable();
            $table->unsignedSmallInteger('estimated_delivery_minutes')->nullable();

            $table->text('notes')->nullable();

            // Timestamps transisi status
            $table->timestamp('merchant_accepted_at')->nullable();
            $table->timestamp('preparing_at')->nullable();
            $table->timestamp('ready_at')->nullable();
            $table->timestamp('mitra_assigned_at')->nullable();
            $table->timestamp('mitra_on_pickup_at')->nullable();
            $table->timestamp('picked_up_at')->nullable();
            $table->timestamp('on_delivery_at')->nullable();
            $table->timestamp('delivered_at')->nullable();
            $table->timestamp('completed_at')->nullable();
            $table->timestamp('cancelled_at')->nullable();
            $table->string('cancellation_reason')->nullable();
            $table->enum('cancelled_by', ['customer', 'merchant', 'system'])->nullable();
            $table->timestamp('rejected_at')->nullable();
            $table->string('rejection_reason')->nullable();
            $table->timestamp('cod_confirmed_at')->nullable();

            $table->timestamps();

            $table->index(['customer_id', 'status']);
            $table->index(['merchant_id', 'status']);
            $table->index(['mitra_id', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('food_orders');
    }
};
