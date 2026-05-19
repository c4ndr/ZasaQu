<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('ratings', function (Blueprint $table) {
            $table->id();
            $table->foreignId('order_id')->constrained()->cascadeOnDelete();
            $table->foreignId('rater_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('ratee_id')->constrained('users')->cascadeOnDelete();
            $table->string('rater_role'); // customer | mitra
            $table->tinyInteger('score'); // 1-5
            $table->text('comment')->nullable();
            $table->timestamps();

            $table->unique(['order_id', 'rater_id']); // satu rating per orang per order
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('ratings');
    }
};
