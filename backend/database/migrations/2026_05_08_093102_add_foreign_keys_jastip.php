<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

// Setelah orders dan jastip_sessions keduanya sudah ada, baru tambah FK circular
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->foreign('jastip_session_id')
                  ->references('id')->on('jastip_sessions')
                  ->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->dropForeign(['jastip_session_id']);
        });
    }
};
