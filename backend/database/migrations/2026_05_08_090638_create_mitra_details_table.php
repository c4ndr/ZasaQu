<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('mitra_details', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('vehicle_plate', 20);
            $table->string('vehicle_brand', 50)->nullable();
            $table->year('vehicle_year')->nullable();
            $table->enum('mode', ['reguler', 'jastip', 'hybrid'])->default('reguler');
            $table->enum('badge', ['starter', 'trusted', 'master'])->default('starter');
            $table->unsignedInteger('total_transactions')->default(0);
            $table->decimal('average_rating', 3, 2)->default(0.00);
            $table->boolean('is_online')->default(false);
            $table->timestamp('last_seen_at')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('mitra_details');
    }
};
