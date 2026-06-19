<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::table('admin_settings')->insertOrIgnore([
            ['key' => 'serv_commission_percent',    'value' => '10',  'type' => 'decimal', 'label' => 'Komisi ZasaServis (%)',             'description' => 'Persentase komisi platform dari setiap order ZasaServis',    'created_at' => now(), 'updated_at' => now()],
            ['key' => 'serv_consultation_enabled',  'value' => '1',   'type' => 'boolean', 'label' => 'Tombol Konsultasi ZasaServis',      'description' => 'Tampilkan tombol WhatsApp konsultasi sebelum pelanggan order', 'created_at' => now(), 'updated_at' => now()],
        ]);
    }

    public function down(): void
    {
        DB::table('admin_settings')->whereIn('key', ['serv_commission_percent', 'serv_consultation_enabled'])->delete();
    }
};
