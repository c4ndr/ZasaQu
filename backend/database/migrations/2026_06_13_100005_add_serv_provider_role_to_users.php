<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        // Ubah kolom role agar support nilai 'serv_provider'
        // MySQL/MariaDB: ubah ENUM dengan definisi baru
        DB::statement("
            ALTER TABLE users MODIFY COLUMN role ENUM(
                'pelanggan','mitra_motor','mitra_mobil','merchant','seller','home_provider','serv_provider','admin'
            ) NOT NULL DEFAULT 'pelanggan'
        ");
    }

    public function down(): void
    {
        DB::statement("
            ALTER TABLE users MODIFY COLUMN role ENUM(
                'pelanggan','mitra_motor','mitra_mobil','merchant','seller','home_provider','admin'
            ) NOT NULL DEFAULT 'pelanggan'
        ");
    }
};
