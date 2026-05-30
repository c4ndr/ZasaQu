<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        // Tambah mart_payment dan mart_refund ke ENUM type
        DB::statement("ALTER TABLE wallet_transactions MODIFY COLUMN `type` ENUM(
            'topup',
            'withdraw',
            'order_payment',
            'order_income',
            'commission',
            'refund',
            'jastip_discount',
            'mart_payment',
            'mart_refund'
        ) NOT NULL");
    }

    public function down(): void
    {
        DB::statement("ALTER TABLE wallet_transactions MODIFY COLUMN `type` ENUM(
            'topup',
            'withdraw',
            'order_payment',
            'order_income',
            'commission',
            'refund',
            'jastip_discount'
        ) NOT NULL");
    }
};
