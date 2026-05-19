<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class AdminSettingsSeeder extends Seeder
{
    public function run(): void
    {
        $settings = [
            [
                'key'         => 'commission_master_percent',
                'value'       => '10',
                'type'        => 'decimal',
                'label'       => 'Komisi Platform dari Ongkir Master (%)',
                'description' => 'Persentase komisi yang diambil platform dari ongkir order master',
            ],
            [
                'key'         => 'commission_jastip_percent',
                'value'       => '10',
                'type'        => 'decimal',
                'label'       => 'Komisi Platform dari Ongkir Jastip (%)',
                'description' => 'Persentase komisi yang diambil platform dari ongkir jastip',
            ],
            [
                'key'         => 'discount_master_percent',
                'value'       => '30',
                'type'        => 'decimal',
                'label'       => 'Diskon Pelanggan Master (%)',
                'description' => 'Persentase diskon dari total ongkir jastip untuk pelanggan master',
            ],
            [
                'key'         => 'wallet_minimum_mitra',
                'value'       => '10000',
                'type'        => 'integer',
                'label'       => 'Saldo Minimum Mitra (Rp)',
                'description' => 'Saldo minimum yang harus dimiliki mitra',
            ],
            [
                'key'         => 'corridor_default_meters',
                'value'       => '500',
                'type'        => 'integer',
                'label'       => 'Lebar Koridor Default (meter)',
                'description' => 'Lebar koridor kanan-kiri rute untuk pencarian jastip',
            ],
            [
                'key'         => 'corridor_max_meters',
                'value'       => '2000',
                'type'        => 'integer',
                'label'       => 'Lebar Koridor Maksimal (meter)',
                'description' => 'Batas maksimal lebar koridor yang bisa diatur',
            ],
            [
                'key'         => 'max_jastip_motor',
                'value'       => '3',
                'type'        => 'integer',
                'label'       => 'Maks Titipan Motor',
                'description' => 'Jumlah maksimal titipan yang bisa diterima mitra motor',
            ],
            [
                'key'         => 'max_jastip_mobil',
                'value'       => '8',
                'type'        => 'integer',
                'label'       => 'Maks Titipan Mobil',
                'description' => 'Jumlah maksimal titipan yang bisa diterima mitra mobil',
            ],
            [
                'key'         => 'insurance_max_value',
                'value'       => '200000',
                'type'        => 'integer',
                'label'       => 'Batas Nilai Asuransi (Rp)',
                'description' => 'Nilai barang maksimal yang bisa diasuransikan',
            ],
            [
                'key'         => 'cod_confirm_timeout_minutes',
                'value'       => '60',
                'type'        => 'integer',
                'label'       => 'Batas Waktu Konfirmasi COD (menit)',
                'description' => 'Waktu maksimal pelanggan untuk konfirmasi penerimaan COD',
            ],
            [
                'key'         => 'auto_confirm_minutes',
                'value'       => '120',
                'type'        => 'integer',
                'label'       => 'Auto-Confirm Penerimaan (menit)',
                'description' => 'Waktu sebelum penerimaan otomatis dikonfirmasi jika pelanggan tidak respons',
            ],
            [
                'key'         => 'shipping_motor_base',
                'value'       => '5000',
                'type'        => 'integer',
                'label'       => 'Tarif Dasar Ongkir Motor (Rp)',
                'description' => 'Biaya dasar pengiriman menggunakan motor',
            ],
            [
                'key'         => 'shipping_motor_per_km',
                'value'       => '3000',
                'type'        => 'integer',
                'label'       => 'Tarif per KM Motor (Rp)',
                'description' => 'Biaya tambahan per kilometer untuk motor',
            ],
            [
                'key'         => 'shipping_mobil_base',
                'value'       => '8000',
                'type'        => 'integer',
                'label'       => 'Tarif Dasar Ongkir Mobil (Rp)',
                'description' => 'Biaya dasar pengiriman menggunakan mobil',
            ],
            [
                'key'         => 'shipping_mobil_per_km',
                'value'       => '5000',
                'type'        => 'integer',
                'label'       => 'Tarif per KM Mobil (Rp)',
                'description' => 'Biaya tambahan per kilometer untuk mobil',
            ],

            // ── ZasaFood ─────────────────────────────────────────────────────
            [
                'key'         => 'food_commission_percent',
                'value'       => '15',
                'type'        => 'decimal',
                'label'       => 'Komisi ZasaFood dari Subtotal Makanan (%)',
                'description' => 'Persentase komisi platform dari total harga makanan',
            ],
            [
                'key'         => 'food_commission_delivery_percent',
                'value'       => '10',
                'type'        => 'decimal',
                'label'       => 'Komisi ZasaFood dari Ongkir (%)',
                'description' => 'Persentase komisi platform dari ongkir delivery makanan',
            ],
            [
                'key'         => 'food_auto_confirm_minutes',
                'value'       => '120',
                'type'        => 'integer',
                'label'       => 'Auto-Confirm ZasaFood (menit)',
                'description' => 'Menit sebelum order delivered dikonfirmasi otomatis jika pelanggan tidak respons',
            ],
            [
                'key'         => 'food_merchant_timeout_minutes',
                'value'       => '5',
                'type'        => 'integer',
                'label'       => 'Batas Waktu Merchant Terima Order (menit)',
                'description' => 'Batas waktu merchant harus menerima order sebelum auto-cancel',
            ],
            [
                'key'         => 'food_mitra_assign_radius_km',
                'value'       => '5',
                'type'        => 'decimal',
                'label'       => 'Radius Broadcast Mitra ZasaFood (km)',
                'description' => 'Radius notifikasi ke mitra saat pesanan siap diambil',
            ],
        ];

        foreach ($settings as $setting) {
            DB::table('admin_settings')->updateOrInsert(
                ['key' => $setting['key']],
                array_merge($setting, [
                    'created_at' => now(),
                    'updated_at' => now(),
                ])
            );
        }
    }
}
