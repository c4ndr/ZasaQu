<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('mart_products', function (Blueprint $table) {
            $table->id();
            $table->foreignId('seller_id')->constrained('mart_sellers')->cascadeOnDelete();
            $table->foreignId('category_id')->nullable()->constrained('mart_categories')->nullOnDelete();
            $table->string('name');
            $table->string('slug');
            $table->text('description')->nullable();
            $table->unsignedBigInteger('price');
            $table->unsignedBigInteger('compare_price')->nullable();
            $table->integer('stock')->default(0);
            $table->unsignedInteger('weight')->default(0);
            $table->json('images')->nullable();
            $table->boolean('is_active')->default(true);
            $table->unsignedInteger('total_sold')->default(0);
            $table->decimal('average_rating', 3, 2)->default(0);
            $table->unsignedInteger('total_ratings')->default(0);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('mart_products');
    }
};
