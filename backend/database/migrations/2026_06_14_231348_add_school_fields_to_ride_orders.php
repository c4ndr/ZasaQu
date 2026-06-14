<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('ride_orders', function (Blueprint $table) {
            $table->enum('ride_type', ['regular', 'school'])->default('regular')->after('vehicle_type');
            $table->string('passenger_name')->nullable()->after('ride_type');
            $table->string('school_name')->nullable()->after('passenger_name');
            $table->string('proof_photo_path')->nullable()->after('cancel_reason');
        });
    }

    public function down(): void
    {
        Schema::table('ride_orders', function (Blueprint $table) {
            $table->dropColumn(['ride_type', 'passenger_name', 'school_name', 'proof_photo_path']);
        });
    }
};
