<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('chat_rooms', function (Blueprint $table) {
            $table->unsignedInteger('violation_count')->default(0)->after('order_id');
            $table->boolean('is_suspended')->default(false)->after('violation_count');
            $table->timestamp('suspended_at')->nullable()->after('is_suspended');
        });
    }

    public function down(): void
    {
        Schema::table('chat_rooms', function (Blueprint $table) {
            $table->dropColumn(['violation_count', 'is_suspended', 'suspended_at']);
        });
    }
};
