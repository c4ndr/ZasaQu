<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::statement("ALTER TABLE home_orders MODIFY COLUMN pickup_type ENUM('antar_jemput','mandiri','on_site') NOT NULL DEFAULT 'mandiri'");
    }

    public function down(): void
    {
        DB::statement("ALTER TABLE home_orders MODIFY COLUMN pickup_type ENUM('antar_jemput','mandiri') NOT NULL DEFAULT 'mandiri'");
    }
};
