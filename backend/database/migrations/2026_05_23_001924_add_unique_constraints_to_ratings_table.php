<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('ratings', function (Blueprint $table) {
            // Satu rater hanya bisa beri satu rating per order per role
            // NULL tidak melanggar unique di MySQL, jadi safe untuk kedua modul
            $table->unique(['order_id',      'rater_id', 'rater_role'], 'ratings_zasago_unique');
            $table->unique(['food_order_id', 'rater_id', 'rater_role'], 'ratings_zasafood_unique');
        });
    }

    public function down(): void
    {
        Schema::table('ratings', function (Blueprint $table) {
            $table->dropUnique('ratings_zasago_unique');
            $table->dropUnique('ratings_zasafood_unique');
        });
    }
};
