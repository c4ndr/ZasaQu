<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('ride_fares', function (Blueprint $table) {
            $table->id();
            $table->enum('vehicle_type', ['motor', 'mobil'])->unique();
            $table->decimal('base_fare', 10, 2)->default(5000);
            $table->decimal('per_km_fare', 10, 2)->default(2000);
            $table->decimal('minimum_fare', 10, 2)->default(8000);
            $table->decimal('commission_rate', 5, 2)->default(10);
            $table->decimal('road_factor', 4, 2)->default(1.30)->comment('Multiplier jarak lurus → jarak jalan');
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });

        // Seed default tarif
        DB::table('ride_fares')->insert([
            ['vehicle_type' => 'motor', 'base_fare' => 5000, 'per_km_fare' => 2000, 'minimum_fare' => 8000,  'commission_rate' => 10, 'road_factor' => 1.30, 'is_active' => true,  'created_at' => now(), 'updated_at' => now()],
            ['vehicle_type' => 'mobil', 'base_fare' => 8000, 'per_km_fare' => 3500, 'minimum_fare' => 15000, 'commission_rate' => 10, 'road_factor' => 1.30, 'is_active' => true,  'created_at' => now(), 'updated_at' => now()],
        ]);
    }

    public function down(): void
    {
        Schema::dropIfExists('ride_fares');
    }
};
