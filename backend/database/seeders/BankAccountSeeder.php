<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class BankAccountSeeder extends Seeder
{
    public function run(): void
    {
        $accounts = [
            ['bank_name' => 'BCA', 'account_number' => '1234567890', 'account_name' => 'ZasaQu Indonesia'],
            ['bank_name' => 'BRI', 'account_number' => '0987654321', 'account_name' => 'ZasaQu Indonesia'],
            ['bank_name' => 'Mandiri', 'account_number' => '1122334455', 'account_name' => 'ZasaQu Indonesia'],
        ];

        foreach ($accounts as $acc) {
            DB::table('bank_accounts')->updateOrInsert(
                ['bank_name' => $acc['bank_name']],
                array_merge($acc, ['is_active' => true, 'created_at' => now(), 'updated_at' => now()])
            );
        }
    }
}
