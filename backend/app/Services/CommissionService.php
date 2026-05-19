<?php

namespace App\Services;

use App\Models\AdminSetting;
use App\Models\JastipSession;
use App\Models\Order;

class CommissionService
{
    private function getSetting(string $key, float $default): float
    {
        $setting = AdminSetting::where('key', $key)->first();
        return $setting ? (float) $setting->value : $default;
    }

    /**
     * Hitung komisi untuk order master atau jastip.
     * Gunakan snapshot commission_rate jika ada, fallback ke AdminSetting.
     * Kembalikan [platform_commission, mitra_income].
     */
    public function calculateOrderCommission(Order $order): array
    {
        if ($order->commission_rate !== null) {
            $percent = (float) $order->commission_rate;
        } else {
            $key     = $order->isJastip() ? 'commission_jastip_percent' : 'commission_master_percent';
            $percent = $this->getSetting($key, 10.0);
        }

        $fee        = (float) $order->shipping_fee;
        $commission = round($fee * $percent / 100, 2);
        $income     = round($fee - $commission, 2);

        return [$commission, $income];
    }

    /**
     * Hitung total diskon untuk pelanggan master berdasarkan sesi jastip.
     * Diskon = total ongkir jastip × discount_percent.
     */
    public function calculateMasterDiscount(JastipSession $session): float
    {
        $percent = $this->getSetting('discount_master_percent', 30.0);
        return round((float) $session->total_jastip_fee * $percent / 100, 2);
    }

    /**
     * Terapkan komisi ke order dan simpan ke DB.
     */
    public function applyCommission(Order $order): void
    {
        [$commission, $income] = $this->calculateOrderCommission($order);
        $order->update([
            'platform_commission' => $commission,
            'mitra_income'        => $income,
        ]);
    }
}
