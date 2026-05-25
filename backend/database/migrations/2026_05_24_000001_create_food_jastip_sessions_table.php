<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('food_jastip_sessions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('mitra_id')->constrained('users')->cascadeOnDelete();
            $table->enum('status', ['active', 'closed'])->default('active');
            $table->enum('vehicle_type', ['motor', 'mobil']);

            // Rute
            $table->decimal('origin_lat', 10, 7);
            $table->decimal('origin_lng', 10, 7);
            $table->string('origin_address')->nullable();
            $table->decimal('destination_lat', 10, 7);
            $table->decimal('destination_lng', 10, 7);
            $table->string('destination_address')->nullable();
            $table->json('route_polyline')->nullable();

            // Kapasitas & statistik
            $table->unsignedSmallInteger('corridor_width')->default(1000); // meter
            $table->unsignedTinyInteger('max_orders')->default(5);
            $table->unsignedTinyInteger('orders_count')->default(0);
            $table->unsignedInteger('total_delivery_fee')->default(0);

            // Penutupan
            $table->enum('closed_reason', ['completed', 'gps_lost', 'manual'])->nullable();
            $table->timestamp('closed_at')->nullable();

            $table->timestamps();

            $table->index(['status', 'vehicle_type']);
            $table->index(['mitra_id', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('food_jastip_sessions');
    }
};
