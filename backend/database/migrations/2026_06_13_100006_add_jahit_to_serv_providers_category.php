<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::statement("ALTER TABLE serv_providers MODIFY COLUMN category ENUM(
            'ac','elektronik','listrik','air','bangunan','jahit','lainnya'
        ) NOT NULL");
    }

    public function down(): void
    {
        DB::statement("ALTER TABLE serv_providers MODIFY COLUMN category ENUM(
            'ac','elektronik','listrik','air','bangunan','lainnya'
        ) NOT NULL");
    }
};
