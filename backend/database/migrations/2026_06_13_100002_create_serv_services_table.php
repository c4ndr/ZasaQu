<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('serv_services', function (Blueprint $table) {
            $table->id();
            $table->foreignId('provider_id')->constrained('serv_providers')->cascadeOnDelete();
            $table->string('name', 100);
            $table->text('description')->nullable();
            $table->enum('unit', ['item', 'jam', 'sesi', 'titik', 'meter']);
            $table->unsignedInteger('price');
            $table->decimal('min_order', 8, 2)->default(1);
            $table->unsignedTinyInteger('estimated_hours')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('serv_services');
    }
};
