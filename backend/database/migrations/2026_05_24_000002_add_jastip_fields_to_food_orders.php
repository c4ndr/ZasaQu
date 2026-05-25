<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('food_orders', function (Blueprint $table) {
            $table->foreignId('food_jastip_session_id')
                ->nullable()
                ->after('mitra_id')
                ->constrained('food_jastip_sessions')
                ->nullOnDelete();
            $table->boolean('is_jastip')->default(false)->after('food_jastip_session_id');
            $table->unsignedTinyInteger('jastip_pickup_sequence')->nullable()->after('is_jastip');
            $table->timestamp('mitra_picked_up_from_merchant_at')->nullable()->after('mitra_on_pickup_at');

            $table->index(['food_jastip_session_id', 'status']);
        });
    }

    public function down(): void
    {
        Schema::table('food_orders', function (Blueprint $table) {
            $table->dropForeign(['food_jastip_session_id']);
            $table->dropColumn(['food_jastip_session_id', 'is_jastip', 'jastip_pickup_sequence', 'mitra_picked_up_from_merchant_at']);
        });
    }
};
