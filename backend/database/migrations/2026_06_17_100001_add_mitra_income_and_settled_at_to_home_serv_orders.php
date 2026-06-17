<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('home_orders', function (Blueprint $table) {
            // mitra_income: ongkos antar-jemput yang dibayar ke mitra kurir
            $table->decimal('mitra_income', 15, 2)->default(0)->after('provider_income');
            // settled_at: guard idempoten — null = belum dibayar, isi = sudah
            $table->timestamp('settled_at')->nullable()->after('completed_at');
        });

        Schema::table('serv_orders', function (Blueprint $table) {
            $table->decimal('mitra_income', 15, 2)->default(0)->after('provider_income');
            $table->timestamp('settled_at')->nullable()->after('completed_at');
        });
    }

    public function down(): void
    {
        Schema::table('home_orders', function (Blueprint $table) {
            $table->dropColumn(['mitra_income', 'settled_at']);
        });

        Schema::table('serv_orders', function (Blueprint $table) {
            $table->dropColumn(['mitra_income', 'settled_at']);
        });
    }
};
