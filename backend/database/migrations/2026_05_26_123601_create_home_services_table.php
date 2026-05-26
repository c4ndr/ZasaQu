<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('home_services', function (Blueprint $table) {
            $table->id();
            $table->foreignId('provider_id')->constrained('home_providers')->cascadeOnDelete();
            $table->string('name');                           // Cuci + Setrika, Setrika Saja, dll
            $table->text('description')->nullable();
            $table->enum('unit', ['kg', 'item', 'jam', 'sesi'])->default('kg');
            $table->unsignedInteger('price');                 // Rp per unit
            $table->decimal('min_order', 8, 2)->default(1);  // minimal order
            $table->unsignedSmallInteger('estimated_hours')->default(24); // estimasi selesai
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('home_services');
    }
};
