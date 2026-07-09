<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('order_complaints', function (Blueprint $table) {
            $table->id();
            // order_type: 'zasago'|'zasafood'|'zasamart'|'zasahome'|'zasaserv'|'zasaride' —
            // polymorphic manual (bukan FK asli) karena tiap modul punya tabel order sendiri,
            // pola sama seperti ChatRoom.order_type.
            $table->string('order_type');
            $table->unsignedBigInteger('order_id');
            $table->foreignId('customer_id')->constrained('users')->cascadeOnDelete();
            $table->string('reason');
            $table->text('description')->nullable();
            $table->string('photo_path')->nullable();
            $table->enum('status', ['pending', 'reviewing', 'resolved', 'rejected'])->default('pending');
            $table->text('resolution_note')->nullable();
            $table->decimal('refund_amount', 15, 2)->nullable();
            $table->foreignId('resolved_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('resolved_at')->nullable();
            $table->timestamps();

            $table->index(['order_type', 'order_id']);
            $table->index(['status']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('order_complaints');
    }
};
