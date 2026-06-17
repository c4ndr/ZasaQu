<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->index(['status', 'vehicle_type'], 'orders_status_vehicle_type_index');
        });

        Schema::table('ride_orders', function (Blueprint $table) {
            $table->index(['status', 'vehicle_type'], 'ride_orders_status_vehicle_type_index');
        });
    }

    public function down(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->dropIndex('orders_status_vehicle_type_index');
        });

        Schema::table('ride_orders', function (Blueprint $table) {
            $table->dropIndex('ride_orders_status_vehicle_type_index');
        });
    }
};
