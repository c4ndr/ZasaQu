<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('chat_rooms', function (Blueprint $table) {
            $table->unsignedBigInteger('provider_id')->nullable()->after('order_type');
            $table->unsignedBigInteger('customer_id')->nullable()->after('provider_id');
        });
    }

    public function down(): void
    {
        Schema::table('chat_rooms', function (Blueprint $table) {
            $table->dropColumn(['provider_id', 'customer_id']);
        });
    }
};
