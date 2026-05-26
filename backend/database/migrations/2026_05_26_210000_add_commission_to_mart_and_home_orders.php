<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        if (!Schema::hasColumn('mart_orders', 'commission_rate')) {
            Schema::table('mart_orders', function (Blueprint $table) {
                $table->decimal('commission_rate', 5, 2)->default(0)->after('total');
                $table->unsignedBigInteger('platform_commission')->default(0)->after('commission_rate');
                $table->unsignedBigInteger('seller_income')->default(0)->after('platform_commission');
            });
        }

        if (!Schema::hasColumn('home_orders', 'commission_rate')) {
            Schema::table('home_orders', function (Blueprint $table) {
                $table->decimal('commission_rate', 5, 2)->default(0)->after('total_price');
                $table->unsignedBigInteger('platform_commission')->default(0)->after('commission_rate');
                $table->unsignedBigInteger('provider_income')->default(0)->after('platform_commission');
            });
        }

        // Seed default commission settings
        $now = now();
        \DB::table('admin_settings')->insert([
            ['key' => 'mart_commission_percent',  'value' => '5',  'type' => 'decimal', 'label' => 'Komisi ZasaMart (%)',   'description' => 'Persentase komisi platform dari total order ZasaMart', 'created_at' => $now, 'updated_at' => $now],
            ['key' => 'home_commission_percent',  'value' => '10', 'type' => 'decimal', 'label' => 'Komisi ZasaHome (%)',   'description' => 'Persentase komisi platform dari total order ZasaHome', 'created_at' => $now, 'updated_at' => $now],
        ]);
    }

    public function down(): void
    {
        Schema::table('mart_orders', function (Blueprint $table) {
            $table->dropColumn(['commission_rate', 'platform_commission', 'seller_income']);
        });
        Schema::table('home_orders', function (Blueprint $table) {
            $table->dropColumn(['commission_rate', 'platform_commission', 'provider_income']);
        });
        \DB::table('admin_settings')->whereIn('key', ['mart_commission_percent', 'home_commission_percent'])->delete();
    }
};
