<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
return new class extends Migration {
    public function up(): void {
        Schema::create('orders', function (Blueprint $table) {
            $table->id();
            $table->string('order_number', 20)->unique();
            $table->foreignId('customer_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('mitra_id')->nullable()->constrained('users')->nullOnDelete();
            $table->unsignedBigInteger('jastip_session_id')->nullable()->index(); // FK ditambah setelah jastip_sessions dibuat
            $table->foreignId('item_category_id')->nullable()->constrained()->nullOnDelete();
            $table->enum('type', ['master', 'jastip'])->default('master');
            $table->enum('status', ['pending','accepted','on_pickup','picked_up','on_delivery','delivered','completed','cancelled'])->default('pending');
            $table->boolean('is_jastip_enabled')->default(false);
            $table->string('pickup_address');
            $table->decimal('pickup_lat', 10, 7);
            $table->decimal('pickup_lng', 10, 7);
            $table->string('dropoff_address');
            $table->decimal('dropoff_lat', 10, 7);
            $table->decimal('dropoff_lng', 10, 7);
            $table->string('item_description');
            $table->decimal('item_value', 15, 2)->default(0);
            $table->enum('vehicle_type', ['motor', 'mobil']);
            $table->boolean('requires_disclaimer')->default(false);
            $table->decimal('shipping_fee', 15, 2);
            $table->decimal('platform_commission', 15, 2)->default(0);
            $table->decimal('mitra_income', 15, 2)->default(0);
            $table->decimal('jastip_discount_applied', 15, 2)->default(0);
            $table->enum('payment_method', ['wallet', 'cod'])->default('wallet');
            $table->enum('payment_status', ['pending', 'paid', 'refunded'])->default('pending');
            $table->timestamp('cod_confirmed_at')->nullable();
            $table->timestamp('accepted_at')->nullable();
            $table->timestamp('picked_up_at')->nullable();
            $table->timestamp('delivered_at')->nullable();
            $table->timestamp('completed_at')->nullable();
            $table->timestamp('cancelled_at')->nullable();
            $table->string('cancel_reason')->nullable();
            $table->text('notes')->nullable();
            $table->timestamps();
            $table->index(['customer_id', 'status']);
            $table->index(['mitra_id', 'status']);
        });
    }
    public function down(): void { Schema::dropIfExists('orders'); }
};
