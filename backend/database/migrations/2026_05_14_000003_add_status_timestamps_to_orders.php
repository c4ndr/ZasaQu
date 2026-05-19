<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->timestamp('on_pickup_at')->nullable()->after('accepted_at');
            $table->timestamp('on_delivery_at')->nullable()->after('picked_up_at');
        });
    }

    public function down(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->dropColumn(['on_pickup_at', 'on_delivery_at']);
        });
    }
};
