<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::statement("ALTER TABLE home_orders MODIFY COLUMN status ENUM(
            'pending','confirmed','picked_up','processing','ready','delivering',
            'traveling','in_progress',
            'completed','cancelled'
        ) NOT NULL DEFAULT 'pending'");
    }

    public function down(): void
    {
        DB::statement("ALTER TABLE home_orders MODIFY COLUMN status ENUM(
            'pending','confirmed','picked_up','processing','ready','delivering',
            'completed','cancelled'
        ) NOT NULL DEFAULT 'pending'");
    }
};
