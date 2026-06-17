<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->string('promo_code')->nullable()->after('payment_method');
            $table->unsignedInteger('discount_amount')->default(0)->after('promo_code');
        });

        Schema::table('ride_orders', function (Blueprint $table) {
            $table->string('promo_code')->nullable()->after('payment_method');
            $table->unsignedInteger('discount_amount')->default(0)->after('promo_code');
        });
    }

    public function down(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->dropColumn(['promo_code', 'discount_amount']);
        });
        Schema::table('ride_orders', function (Blueprint $table) {
            $table->dropColumn(['promo_code', 'discount_amount']);
        });
    }
};
