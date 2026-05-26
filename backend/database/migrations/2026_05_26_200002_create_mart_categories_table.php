<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('mart_categories', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('slug')->unique();
            $table->string('icon', 10)->default('📦');
            $table->tinyInteger('sort_order')->default(0);
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });

        DB::table('mart_categories')->insert([
            ['name' => 'Makanan & Minuman',    'slug' => 'makanan-minuman',   'icon' => '🍱', 'sort_order' => 1],
            ['name' => 'Fashion & Pakaian',     'slug' => 'fashion-pakaian',   'icon' => '👗', 'sort_order' => 2],
            ['name' => 'Kerajinan & Seni',      'slug' => 'kerajinan-seni',    'icon' => '🎨', 'sort_order' => 3],
            ['name' => 'Pertanian & Hasil Bumi','slug' => 'pertanian',         'icon' => '🌾', 'sort_order' => 4],
            ['name' => 'Perawatan & Kecantikan','slug' => 'perawatan-kecantikan','icon'=> '💄', 'sort_order' => 5],
            ['name' => 'Lainnya',               'slug' => 'lainnya',           'icon' => '📦', 'sort_order' => 6],
        ]);
    }

    public function down(): void
    {
        Schema::dropIfExists('mart_categories');
    }
};
