<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::statement("ALTER TABLE home_providers MODIFY COLUMN category ENUM('laundry','pijat','cleaning','tukang','cukur','lainnya') NOT NULL DEFAULT 'laundry'");
    }

    public function down(): void
    {
        DB::statement("ALTER TABLE home_providers MODIFY COLUMN category ENUM('laundry','pijat','cleaning','tukang','lainnya') NOT NULL DEFAULT 'laundry'");
    }
};
