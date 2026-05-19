<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
return new class extends Migration {
    public function up(): void {
        Schema::create('item_categories', function (Blueprint $table) {
            $table->id();
            $table->string('name', 100);
            $table->string('slug', 100)->unique();
            $table->enum('allowed_vehicle', ['all', 'mobil_only'])->default('all');
            $table->boolean('requires_special_permit')->default(false);
            $table->boolean('is_allowed')->default(true);
            $table->boolean('requires_disclaimer')->default(false);
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });
    }
    public function down(): void { Schema::dropIfExists('item_categories'); }
};
