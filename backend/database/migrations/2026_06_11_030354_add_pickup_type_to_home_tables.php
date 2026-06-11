<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('home_providers', function (Blueprint $table) {
            $table->boolean('offers_pickup')->default(false)->after('is_open');
            $table->unsignedInteger('pickup_fee')->nullable()->after('offers_pickup');
        });

        Schema::table('home_orders', function (Blueprint $table) {
            // antar_jemput = provider pick up & deliver, mandiri = customer drop off & pick up
            $table->enum('pickup_type', ['antar_jemput', 'mandiri'])->default('mandiri')->after('pickup_address');
            $table->unsignedInteger('pickup_fee')->default(0)->after('pickup_type');
        });
    }

    public function down(): void
    {
        Schema::table('home_providers', function (Blueprint $table) {
            $table->dropColumn(['offers_pickup', 'pickup_fee']);
        });

        Schema::table('home_orders', function (Blueprint $table) {
            $table->dropColumn(['pickup_type', 'pickup_fee']);
        });
    }
};
