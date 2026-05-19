<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('food_order_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('food_order_id')->constrained()->cascadeOnDelete();
            $table->foreignId('menu_item_id')->constrained('food_menu_items')->cascadeOnDelete();
            $table->string('item_name', 150);        // snapshot nama saat order
            $table->unsignedInteger('item_price');   // snapshot harga saat order
            $table->unsignedSmallInteger('quantity');
            $table->unsignedInteger('subtotal');
            $table->string('notes', 255)->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('food_order_items');
    }
};
