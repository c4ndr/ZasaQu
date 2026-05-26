<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('mart_carts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('product_id')->constrained('mart_products')->cascadeOnDelete();
            $table->foreignId('seller_id')->constrained('mart_sellers')->cascadeOnDelete();
            $table->unsignedInteger('quantity')->default(1);
            $table->string('notes', 255)->nullable();
            $table->timestamps();
            $table->unique(['user_id', 'product_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('mart_carts');
    }
};
