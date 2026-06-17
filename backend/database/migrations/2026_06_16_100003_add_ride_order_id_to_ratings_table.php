<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('ratings', function (Blueprint $table) {
            $table->foreignId('ride_order_id')->nullable()->after('food_order_id')
                ->constrained('ride_orders')->cascadeOnDelete();
            $table->unique(['ride_order_id', 'rater_id', 'rater_role'], 'ratings_zasaride_unique');
        });
    }

    public function down(): void
    {
        Schema::table('ratings', function (Blueprint $table) {
            $table->dropUnique('ratings_zasaride_unique');
            $table->dropForeign(['ride_order_id']);
            $table->dropColumn('ride_order_id');
        });
    }
};
