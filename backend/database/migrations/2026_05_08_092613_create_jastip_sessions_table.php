<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
return new class extends Migration {
    public function up(): void {
        Schema::create('jastip_sessions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('mitra_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('master_order_id')->nullable()->constrained('orders')->nullOnDelete();
            $table->enum('status', ['active', 'closed'])->default('active');
            $table->enum('vehicle_type', ['motor', 'mobil']);
            $table->decimal('origin_lat', 10, 7);
            $table->decimal('origin_lng', 10, 7);
            $table->decimal('destination_lat', 10, 7);
            $table->decimal('destination_lng', 10, 7);
            $table->json('route_polyline')->nullable();
            $table->integer('corridor_width')->default(500);
            $table->integer('max_jastip')->default(3);
            $table->integer('jastip_count')->default(0);
            $table->decimal('total_jastip_fee', 15, 2)->default(0);
            $table->enum('closed_reason', ['completed', 'gps_lost', 'manual'])->nullable();
            $table->timestamp('closed_at')->nullable();
            $table->timestamps();
            $table->index(['mitra_id', 'status']);
        });
    }
    public function down(): void { Schema::dropIfExists('jastip_sessions'); }
};
