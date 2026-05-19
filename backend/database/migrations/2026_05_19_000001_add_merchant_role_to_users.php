<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::statement("ALTER TABLE users MODIFY COLUMN role ENUM('pelanggan','mitra_motor','mitra_mobil','admin','merchant') NOT NULL DEFAULT 'pelanggan'");
    }

    public function down(): void
    {
        DB::statement("ALTER TABLE users MODIFY COLUMN role ENUM('pelanggan','mitra_motor','mitra_mobil','admin') NOT NULL DEFAULT 'pelanggan'");
    }
};
