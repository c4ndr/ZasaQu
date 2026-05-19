<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            // Snapshot tarif saat order dibuat — tidak berubah walau admin edit setting
            $table->decimal('rate_base_fee', 10, 2)->nullable()->after('shipping_fee');
            $table->decimal('rate_per_km', 10, 2)->nullable()->after('rate_base_fee');
            $table->decimal('commission_rate', 5, 2)->nullable()->after('rate_per_km'); // persentase
        });
    }

    public function down(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->dropColumn(['rate_base_fee', 'rate_per_km', 'commission_rate']);
        });
    }
};
