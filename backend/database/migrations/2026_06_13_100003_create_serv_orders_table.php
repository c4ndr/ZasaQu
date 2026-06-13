<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('serv_orders', function (Blueprint $table) {
            $table->id();
            $table->string('order_number', 30)->unique();
            $table->foreignId('customer_id')->constrained('users');
            $table->foreignId('provider_id')->constrained('serv_providers');
            $table->enum('status', ['pending', 'confirmed', 'traveling', 'in_progress', 'completed', 'cancelled'])
                  ->default('pending');
            $table->string('address', 255);
            $table->decimal('lat', 10, 7)->nullable();
            $table->decimal('lng', 10, 7)->nullable();
            $table->text('notes')->nullable();
            $table->timestamp('scheduled_at')->nullable();
            $table->unsignedInteger('total_price')->default(0);
            $table->decimal('commission_rate', 5, 2)->default(10);
            $table->unsignedInteger('platform_commission')->default(0);
            $table->unsignedInteger('provider_income')->default(0);
            $table->string('cancel_reason', 255)->nullable();
            $table->timestamp('confirmed_at')->nullable();
            $table->timestamp('traveling_at')->nullable();
            $table->timestamp('in_progress_at')->nullable();
            $table->timestamp('completed_at')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('serv_orders');
    }
};
