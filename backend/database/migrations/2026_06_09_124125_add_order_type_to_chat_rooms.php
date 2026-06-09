<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('chat_rooms', function (Blueprint $table) {
            // Hapus FK + unique lama (hanya untuk zasago)
            $table->dropForeign(['order_id']);
            $table->dropUnique(['order_id']);

            // Kolom tipe modul
            $table->string('order_type', 20)->default('zasago')->after('order_id');

            // Unique per (order_id, order_type) — satu room per order per modul
            $table->unique(['order_id', 'order_type']);
        });
    }

    public function down(): void
    {
        Schema::table('chat_rooms', function (Blueprint $table) {
            $table->dropUnique(['order_id', 'order_type']);
            $table->dropColumn('order_type');
            $table->foreignId('order_id')->unique()->constrained()->cascadeOnDelete();
        });
    }
};
