<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('top_up_requests', function (Blueprint $table) {
            $table->string('midtrans_order_id')->nullable()->unique()->after('id');
        });

        // Tambah 'midtrans' ke enum method
        DB::statement("ALTER TABLE top_up_requests MODIFY COLUMN method ENUM('bank_manual','virtual_account','qris','midtrans') NOT NULL");
    }

    public function down(): void
    {
        Schema::table('top_up_requests', function (Blueprint $table) {
            $table->dropColumn('midtrans_order_id');
        });
        DB::statement("ALTER TABLE top_up_requests MODIFY COLUMN method ENUM('bank_manual','virtual_account','qris') NOT NULL");
    }
};
