<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('home_orders', function (Blueprint $table) {
            $table->foreignId('mitra_id')->nullable()->after('provider_id')
                ->constrained('users')->nullOnDelete();
            $table->timestamp('accepted_at')->nullable()->after('completed_at');
        });

        Schema::table('serv_orders', function (Blueprint $table) {
            $table->foreignId('mitra_id')->nullable()->after('provider_id')
                ->constrained('users')->nullOnDelete();
            $table->timestamp('accepted_at')->nullable()->after('completed_at');
        });
    }

    public function down(): void
    {
        Schema::table('home_orders', function (Blueprint $table) {
            $table->dropForeign(['mitra_id']);
            $table->dropColumn(['mitra_id', 'accepted_at']);
        });

        Schema::table('serv_orders', function (Blueprint $table) {
            $table->dropForeign(['mitra_id']);
            $table->dropColumn(['mitra_id', 'accepted_at']);
        });
    }
};
