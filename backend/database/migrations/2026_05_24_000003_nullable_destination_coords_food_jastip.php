<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('food_jastip_sessions', function (Blueprint $table) {
            $table->decimal('destination_lat', 10, 7)->nullable()->change();
            $table->decimal('destination_lng', 10, 7)->nullable()->change();
        });
    }

    public function down(): void
    {
        Schema::table('food_jastip_sessions', function (Blueprint $table) {
            $table->decimal('destination_lat', 10, 7)->nullable(false)->change();
            $table->decimal('destination_lng', 10, 7)->nullable(false)->change();
        });
    }
};
