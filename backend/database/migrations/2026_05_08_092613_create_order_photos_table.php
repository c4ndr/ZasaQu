<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
return new class extends Migration {
    public function up(): void {
        Schema::create('order_photos', function (Blueprint $table) {
            $table->id();
            $table->foreignId('order_id')->constrained()->cascadeOnDelete();
            $table->enum('stage', ['pickup', 'packing', 'delivery']);
            $table->string('image_path');
            $table->timestamp('taken_at');
            $table->timestamps();
            $table->unique(['order_id', 'stage']);
        });
    }
    public function down(): void { Schema::dropIfExists('order_photos'); }
};
