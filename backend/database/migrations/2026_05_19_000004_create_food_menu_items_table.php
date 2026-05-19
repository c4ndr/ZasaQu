<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('food_menu_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('merchant_id')->constrained('food_merchants')->cascadeOnDelete();
            $table->foreignId('category_id')->nullable()->constrained('food_menu_categories')->nullOnDelete();
            $table->string('name', 150);
            $table->text('description')->nullable();
            $table->unsignedInteger('price');
            $table->string('photo_path')->nullable();
            $table->boolean('is_available')->default(true);
            $table->unsignedInteger('stock')->nullable(); // null = unlimited
            $table->unsignedSmallInteger('sort_order')->default(0);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('food_menu_items');
    }
};
