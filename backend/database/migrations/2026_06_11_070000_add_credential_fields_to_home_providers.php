<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('home_providers', function (Blueprint $table) {
            $table->string('skill_level', 30)->nullable()->after('specializations');
            $table->unsignedTinyInteger('experience_years')->nullable()->after('skill_level');
            $table->json('certificates')->nullable()->after('experience_years');
        });
    }

    public function down(): void
    {
        Schema::table('home_providers', function (Blueprint $table) {
            $table->dropColumn(['skill_level', 'experience_years', 'certificates']);
        });
    }
};
