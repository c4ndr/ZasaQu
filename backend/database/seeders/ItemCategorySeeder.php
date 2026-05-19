<?php
namespace Database\Seeders;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
class ItemCategorySeeder extends Seeder
{
    public function run(): void
    {
        $cats = [
            ['name'=>'Dokumen','slug'=>'dokumen','allowed_vehicle'=>'all','is_allowed'=>true,'requires_special_permit'=>false,'requires_disclaimer'=>false],
            ['name'=>'Makanan & Minuman','slug'=>'makanan','allowed_vehicle'=>'all','is_allowed'=>true,'requires_special_permit'=>false,'requires_disclaimer'=>false],
            ['name'=>'Paket Kecil','slug'=>'paket-kecil','allowed_vehicle'=>'all','is_allowed'=>true,'requires_special_permit'=>false,'requires_disclaimer'=>false],
            ['name'=>'Obat-obatan','slug'=>'obat','allowed_vehicle'=>'all','is_allowed'=>true,'requires_special_permit'=>false,'requires_disclaimer'=>false],
            ['name'=>'Paket Besar / Elektronik','slug'=>'paket-besar','allowed_vehicle'=>'mobil_only','is_allowed'=>true,'requires_special_permit'=>false,'requires_disclaimer'=>false],
            ['name'=>'Barang Pecah Belah','slug'=>'pecah-belah','allowed_vehicle'=>'all','is_allowed'=>true,'requires_special_permit'=>true,'requires_disclaimer'=>true],
            ['name'=>'Barang Berharga (Perhiasan/Uang)','slug'=>'barang-berharga','allowed_vehicle'=>'all','is_allowed'=>false,'requires_special_permit'=>false,'requires_disclaimer'=>false],
            ['name'=>'Barang Berbahaya','slug'=>'barang-berbahaya','allowed_vehicle'=>'all','is_allowed'=>false,'requires_special_permit'=>false,'requires_disclaimer'=>false],
        ];
        foreach ($cats as $cat) {
            DB::table('item_categories')->updateOrInsert(['slug'=>$cat['slug']],array_merge($cat,['is_active'=>true,'created_at'=>now(),'updated_at'=>now()]));
        }
    }
}
