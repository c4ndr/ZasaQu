<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        // ENUM sudah dimodifikasi di langkah sebelumnya saat migrasi gagal sebagian.
        // service_module sudah ada. Migration ini hanya placeholder.
    }

    public function down(): void {}
};
