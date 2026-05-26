<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('mart_order_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('order_id')->constrained('mart_orders')->cascadeOnDelete();
            $table->foreignId('product_id')->constrained('mart_products')->restrictOnDelete();
            $table->string('product_name');
            $table->string('product_image')->nullable();
            $table->unsignedBigInteger('price');
            $table->unsignedInteger('quantity');
            $table->unsignedBigInteger('subtotal');
            $table->string('notes', 255)->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('mart_order_items');
    }
};
