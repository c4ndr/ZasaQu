<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('qris_transactions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('top_up_request_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('qris_code', 512); // kode QRIS unik per transaksi
            $table->string('qris_image_url')->nullable();
            $table->decimal('amount', 15, 2);
            $table->timestamp('expired_at');
            $table->enum('status', ['pending', 'paid', 'expired'])->default('pending');
            $table->timestamp('paid_at')->nullable();
            $table->string('payment_reference')->nullable(); // referensi dari payment gateway
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('qris_transactions');
    }
};
