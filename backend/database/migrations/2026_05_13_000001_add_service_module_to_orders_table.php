<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->string('service_module', 20)->default('zasago')->after('id');
            $table->index('service_module');
        });

        Schema::table('wallet_transactions', function (Blueprint $table) {
            $table->string('service_module', 20)->default('zasago')->after('id');
        });

        Schema::table('chat_rooms', function (Blueprint $table) {
            $table->string('service_module', 20)->default('zasago')->after('id');
        });
    }

    public function down(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->dropIndex(['service_module']);
            $table->dropColumn('service_module');
        });

        Schema::table('wallet_transactions', function (Blueprint $table) {
            $table->dropColumn('service_module');
        });

        Schema::table('chat_rooms', function (Blueprint $table) {
            $table->dropColumn('service_module');
        });
    }
};
