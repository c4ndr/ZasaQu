<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('mart_reviews', function (Blueprint $table) {
            $table->id();
            $table->foreignId('order_id')->constrained('mart_orders')->cascadeOnDelete();
            $table->foreignId('order_item_id')->constrained('mart_order_items')->cascadeOnDelete();
            $table->foreignId('customer_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('seller_id')->constrained('mart_sellers')->cascadeOnDelete();
            $table->foreignId('product_id')->constrained('mart_products')->cascadeOnDelete();
            $table->tinyInteger('rating');
            $table->text('comment')->nullable();
            $table->timestamps();
            $table->unique('order_item_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('mart_reviews');
    }
};
