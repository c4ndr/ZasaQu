<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('serv_orders', function (Blueprint $table) {
            $table->unsignedTinyInteger('provider_score')->nullable()->after('cancel_reason');
            $table->string('provider_comment', 500)->nullable()->after('provider_score');
            $table->timestamp('rated_at')->nullable()->after('provider_comment');
        });
    }

    public function down(): void
    {
        Schema::table('serv_orders', function (Blueprint $table) {
            $table->dropColumn(['provider_score', 'provider_comment', 'rated_at']);
        });
    }
};
