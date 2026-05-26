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
        Schema::create('home_order_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('order_id')->constrained('home_orders')->cascadeOnDelete();
            $table->foreignId('service_id')->constrained('home_services')->restrictOnDelete();
            $table->string('service_name');  // snapshot nama saat order
            $table->string('unit', 10);      // snapshot unit
            $table->decimal('quantity', 8, 2);
            $table->unsignedInteger('price');     // snapshot harga per unit
            $table->unsignedInteger('subtotal');
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('home_order_items');
    }
};
