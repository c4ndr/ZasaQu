<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('mart_orders', function (Blueprint $table) {
            $table->id();
            $table->string('order_number', 30)->unique();
            $table->foreignId('customer_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('seller_id')->constrained('mart_sellers');
            $table->foreignId('mitra_id')->nullable()->constrained('users')->nullOnDelete();
            $table->enum('status', [
                'pending', 'confirmed', 'packed',
                'picking_up', 'on_delivery', 'delivered',
                'completed', 'cancelled',
            ])->default('pending');

            // Seller snapshot
            $table->string('seller_name_snapshot');
            $table->text('seller_address_snapshot');
            $table->double('seller_lat')->nullable();
            $table->double('seller_lng')->nullable();

            // Delivery info
            $table->string('delivery_name');
            $table->text('delivery_address');
            $table->double('delivery_lat')->nullable();
            $table->double('delivery_lng')->nullable();
            $table->string('delivery_phone', 20)->nullable();

            $table->text('notes')->nullable();
            $table->text('cancel_reason')->nullable();

            $table->unsignedBigInteger('subtotal');
            $table->unsignedBigInteger('shipping_fee')->default(0);
            $table->unsignedBigInteger('total');

            $table->timestamp('packed_at')->nullable();
            $table->timestamp('picked_up_at')->nullable();
            $table->timestamp('delivered_at')->nullable();
            $table->timestamp('completed_at')->nullable();
            $table->timestamp('cancelled_at')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('mart_orders');
    }
};
