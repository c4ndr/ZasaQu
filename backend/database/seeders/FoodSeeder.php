<?php

namespace Database\Seeders;

use App\Models\FoodMenuCategory;
use App\Models\FoodMenuItem;
use App\Models\FoodMerchant;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class FoodSeeder extends Seeder
{
    public function run(): void
    {
        // Merchant 1 — Warung Makan Bu Sari
        $merchant1User = User::firstOrCreate(
            ['email' => 'busari@zasaqu.id'],
            [
                'name'               => 'Bu Sari',
                'password'           => Hash::make('merchant123'),
                'role'               => 'merchant',
                'status'             => 'active',
                'email_verified_at'  => now(),
            ]
        );

        $merchant1 = FoodMerchant::firstOrCreate(
            ['user_id' => $merchant1User->id],
            [
                'name'                 => 'Warung Makan Bu Sari',
                'slug'                 => 'warung-makan-bu-sari',
                'description'          => 'Masakan rumahan, nasi campur, lauk pauk segar setiap hari.',
                'category'             => 'makanan_berat',
                'address'              => 'Jl. Melati No. 12, Jakarta Selatan',
                'lat'                  => -6.2615,
                'lng'                  => 106.8106,
                'phone'                => '08111234567',
                'is_open'              => true,
                'open_time'            => '07:00:00',
                'close_time'           => '21:00:00',
                'avg_prep_time_minutes'=> 15,
                'status'               => 'active',
            ]
        );

        $catNasi = FoodMenuCategory::firstOrCreate(
            ['merchant_id' => $merchant1->id, 'name' => 'Nasi & Lauk'],
            ['sort_order' => 1, 'is_active' => true]
        );
        $catMinuman = FoodMenuCategory::firstOrCreate(
            ['merchant_id' => $merchant1->id, 'name' => 'Minuman'],
            ['sort_order' => 2, 'is_active' => true]
        );

        $items1 = [
            ['category_id' => $catNasi->id,    'name' => 'Nasi Campur',       'price' => 18000, 'description' => 'Nasi putih + 3 lauk pilihan + sayur'],
            ['category_id' => $catNasi->id,    'name' => 'Nasi Ayam Goreng',  'price' => 20000, 'description' => 'Nasi putih + ayam goreng crispy + sambal'],
            ['category_id' => $catNasi->id,    'name' => 'Nasi Telur Dadar',  'price' => 14000, 'description' => 'Nasi putih + telur dadar + tempe'],
            ['category_id' => $catMinuman->id, 'name' => 'Es Teh Manis',      'price' => 5000,  'description' => 'Teh manis dingin segar'],
            ['category_id' => $catMinuman->id, 'name' => 'Es Jeruk',          'price' => 7000,  'description' => 'Jeruk peras segar + es'],
        ];

        foreach ($items1 as $item) {
            FoodMenuItem::firstOrCreate(
                ['merchant_id' => $merchant1->id, 'name' => $item['name']],
                array_merge($item, ['merchant_id' => $merchant1->id, 'is_available' => true, 'sort_order' => 0])
            );
        }

        // Merchant 2 — Kopi & Snack Mas Budi
        $merchant2User = User::firstOrCreate(
            ['email' => 'masbudi@zasaqu.id'],
            [
                'name'               => 'Mas Budi',
                'password'           => Hash::make('merchant123'),
                'role'               => 'merchant',
                'status'             => 'active',
                'email_verified_at'  => now(),
            ]
        );

        $merchant2 = FoodMerchant::firstOrCreate(
            ['user_id' => $merchant2User->id],
            [
                'name'                 => 'Kopi & Snack Mas Budi',
                'slug'                 => 'kopi-snack-mas-budi',
                'description'          => 'Kopi manual brew, minuman kekinian, dan camilan ringan.',
                'category'             => 'minuman',
                'address'              => 'Jl. Sudirman No. 45, Jakarta Pusat',
                'lat'                  => -6.2088,
                'lng'                  => 106.8456,
                'phone'                => '08122345678',
                'is_open'              => true,
                'open_time'            => '08:00:00',
                'close_time'           => '22:00:00',
                'avg_prep_time_minutes'=> 10,
                'status'               => 'active',
            ]
        );

        $catKopi = FoodMenuCategory::firstOrCreate(
            ['merchant_id' => $merchant2->id, 'name' => 'Kopi'],
            ['sort_order' => 1, 'is_active' => true]
        );
        $catSnack = FoodMenuCategory::firstOrCreate(
            ['merchant_id' => $merchant2->id, 'name' => 'Snack'],
            ['sort_order' => 2, 'is_active' => true]
        );

        $items2 = [
            ['category_id' => $catKopi->id,  'name' => 'Kopi Hitam',       'price' => 10000, 'description' => 'Single origin, manual brew'],
            ['category_id' => $catKopi->id,  'name' => 'Kopi Susu',        'price' => 15000, 'description' => 'Espresso + susu segar'],
            ['category_id' => $catKopi->id,  'name' => 'Matcha Latte',     'price' => 18000, 'description' => 'Matcha premium + oat milk'],
            ['category_id' => $catSnack->id, 'name' => 'Roti Bakar Coklat','price' => 12000, 'description' => 'Roti bakar dengan selai coklat'],
            ['category_id' => $catSnack->id, 'name' => 'Pisang Goreng',    'price' => 8000,  'description' => 'Pisang goreng crispy 3 pcs'],
        ];

        foreach ($items2 as $item) {
            FoodMenuItem::firstOrCreate(
                ['merchant_id' => $merchant2->id, 'name' => $item['name']],
                array_merge($item, ['merchant_id' => $merchant2->id, 'is_available' => true, 'sort_order' => 0])
            );
        }

        $this->command->info('FoodSeeder: 2 merchant dan ' . (count($items1) + count($items2)) . ' menu item berhasil dibuat.');
    }
}
