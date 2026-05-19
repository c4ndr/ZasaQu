<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use App\Models\User;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        // Buat akun admin default
        User::firstOrCreate(
            ['email' => 'admin@zasaqu.id'],
            [
                'name'     => 'Admin ZasaQu',
                'password' => Hash::make('admin123'),
                'role'     => 'admin',
                'status'   => 'active',
                'email_verified_at' => now(),
            ]
        );

        $this->call([
            AdminSettingsSeeder::class,
            BankAccountSeeder::class,
            ItemCategorySeeder::class,
            FoodSeeder::class,
        ]);
    }
}
