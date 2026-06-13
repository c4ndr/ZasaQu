<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('serv_order_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('order_id')->constrained('serv_orders')->cascadeOnDelete();
            $table->foreignId('service_id')->constrained('serv_services');
            $table->string('service_name', 100);
            $table->enum('unit', ['item', 'jam', 'sesi', 'titik', 'meter']);
            $table->decimal('quantity', 8, 2);
            $table->unsignedInteger('price');
            $table->unsignedInteger('subtotal');
            $table->text('notes')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('serv_order_items');
    }
};
