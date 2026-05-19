<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('wallet_transactions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('wallet_id')->constrained()->cascadeOnDelete();
            $table->enum('type', [
                'topup',
                'withdraw',
                'order_payment',
                'order_income',
                'commission',
                'refund',
                'jastip_discount',
            ]);
            $table->decimal('amount', 15, 2);
            $table->decimal('balance_before', 15, 2);
            $table->decimal('balance_after', 15, 2);
            $table->string('description')->nullable();
            $table->nullableMorphs('reference'); // reference_type + reference_id
            $table->enum('status', ['pending', 'completed', 'failed', 'cancelled'])->default('completed');
            $table->timestamps();

            $table->index(['wallet_id', 'type']);
            $table->index('created_at');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('wallet_transactions');
    }
};
