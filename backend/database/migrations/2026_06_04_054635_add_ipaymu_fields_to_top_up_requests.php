<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('top_up_requests', function (Blueprint $table) {
            $table->string('ipaymu_session_id')->nullable()->after('midtrans_order_id');
            $table->string('ipaymu_trx_id')->nullable()->after('ipaymu_session_id');
            $table->string('ipaymu_reference_id')->nullable()->after('ipaymu_trx_id');
            $table->string('ipaymu_channel')->nullable()->after('ipaymu_reference_id');
            $table->string('ipaymu_va_number')->nullable()->after('ipaymu_channel');
            $table->timestamp('ipaymu_expired_at')->nullable()->after('ipaymu_va_number');
        });
    }

    public function down(): void
    {
        Schema::table('top_up_requests', function (Blueprint $table) {
            $table->dropColumn([
                'ipaymu_session_id', 'ipaymu_trx_id', 'ipaymu_reference_id',
                'ipaymu_channel', 'ipaymu_va_number', 'ipaymu_expired_at',
            ]);
        });
    }
};
