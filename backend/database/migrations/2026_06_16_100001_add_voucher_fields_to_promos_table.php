<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('promos', function (Blueprint $table) {
            $table->string('code')->nullable()->unique()->after('link_url');
            $table->enum('discount_type', ['percent', 'fixed'])->nullable()->after('code');
            $table->unsignedInteger('discount_value')->nullable()->after('discount_type');
            $table->unsignedInteger('min_order_amount')->default(0)->after('discount_value');
            $table->unsignedInteger('max_discount')->nullable()->after('min_order_amount'); // cap untuk percent
            $table->unsignedInteger('max_uses')->nullable()->after('max_discount');
            $table->unsignedInteger('used_count')->default(0)->after('max_uses');
            $table->timestamp('expires_at')->nullable()->after('used_count');
            // modul yang boleh pakai: null = semua, atau json array ['zasago','zasaride',...]
            $table->json('applicable_modules')->nullable()->after('expires_at');
        });
    }

    public function down(): void
    {
        Schema::table('promos', function (Blueprint $table) {
            $table->dropColumn([
                'code', 'discount_type', 'discount_value', 'min_order_amount',
                'max_discount', 'max_uses', 'used_count', 'expires_at', 'applicable_modules',
            ]);
        });
    }
};
