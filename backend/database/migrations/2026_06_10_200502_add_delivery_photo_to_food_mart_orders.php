<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('food_orders', function (Blueprint $table) {
            $table->string('delivery_photo')->nullable()->after('notes');
        });
        Schema::table('mart_orders', function (Blueprint $table) {
            $table->string('delivery_photo')->nullable()->after('notes');
        });
    }

    public function down(): void
    {
        Schema::table('food_orders', function (Blueprint $table) {
            $table->dropColumn('delivery_photo');
        });
        Schema::table('mart_orders', function (Blueprint $table) {
            $table->dropColumn('delivery_photo');
        });
    }
};
