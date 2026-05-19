<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('withdraw_requests', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete(); // hanya mitra
            $table->decimal('amount', 15, 2);
            $table->enum('destination_type', ['dana', 'ovo', 'gopay', 'bank']);
            $table->string('destination_number', 30); // nomor HP e-wallet atau nomor rekening
            $table->string('destination_name', 100);
            $table->string('bank_name', 50)->nullable(); // diisi jika destination_type = bank
            $table->enum('status', ['pending', 'processing', 'completed', 'rejected'])->default('pending');
            $table->foreignId('processed_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('processed_at')->nullable();
            $table->text('notes')->nullable();
            $table->timestamps();

            $table->index(['user_id', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('withdraw_requests');
    }
};
