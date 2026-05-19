<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('otp_codes', function (Blueprint $table) {
            $table->id();
            $table->string('phone', 20);
            $table->string('code', 6);
            $table->enum('type', ['register', 'login']);
            $table->timestamp('expired_at');
            $table->timestamp('used_at')->nullable();
            $table->timestamps();

            $table->index(['phone', 'type']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('otp_codes');
    }
};
