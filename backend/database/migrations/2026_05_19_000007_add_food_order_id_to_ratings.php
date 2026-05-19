<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('ratings', function (Blueprint $table) {
            // Buat order_id nullable agar bisa dipakai lintas modul
            $table->dropForeign(['order_id']);
            $table->dropUnique(['order_id', 'rater_id']);
            $table->foreignId('order_id')->nullable()->change();
            $table->foreign('order_id')->references('id')->on('orders')->cascadeOnDelete();

            $table->foreignId('food_order_id')->nullable()->after('order_id')
                ->constrained('food_orders')->cascadeOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('ratings', function (Blueprint $table) {
            $table->dropForeign(['food_order_id']);
            $table->dropColumn('food_order_id');
            $table->dropForeign(['order_id']);
            $table->foreignId('order_id')->nullable(false)->change();
            $table->foreign('order_id')->references('id')->on('orders')->cascadeOnDelete();
            $table->unique(['order_id', 'rater_id']);
        });
    }
};
