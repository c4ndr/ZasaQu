<?php

namespace App\Services;

use App\Models\Promo;
use Illuminate\Support\Facades\DB;

class PromoService
{
    /**
     * Validate promo code for given module and order amount.
     * Returns ['promo' => Promo, 'discount' => int] on success.
     * Throws \Exception on failure.
     *
     * Validasi ini dilakukan di luar transaksi order (untuk early-return yang cepat).
     * Increment used_count yang sesungguhnya harus dilakukan via use() di dalam transaksi order.
     */
    public function validate(string $code, string $module, int $orderAmount): array
    {
        $promo = Promo::where('code', strtoupper($code))
            ->where('is_active', true)
            ->first();

        if (!$promo || !$promo->isVoucher()) {
            throw new \Exception('Kode promo tidak ditemukan.');
        }
        if ($promo->expires_at && $promo->expires_at->isPast()) {
            throw new \Exception('Kode promo sudah kedaluwarsa.');
        }
        if ($promo->max_uses !== null && $promo->used_count >= $promo->max_uses) {
            throw new \Exception('Kode promo sudah habis digunakan.');
        }
        if (!$promo->isValidForModule($module)) {
            throw new \Exception('Kode promo tidak berlaku untuk layanan ini.');
        }

        $discount = $promo->calculateDiscount($orderAmount);
        if ($discount === 0 && $promo->min_order_amount > 0) {
            throw new \Exception(
                'Minimum order Rp ' . number_format($promo->min_order_amount, 0, ',', '.') . ' untuk promo ini.'
            );
        }

        return ['promo' => $promo, 'discount' => $discount];
    }

    /**
     * Increment used_count secara atomic dengan lockForUpdate.
     * Harus dipanggil di dalam DB::transaction aktif untuk mencegah over-redeem.
     * Re-check max_uses setelah lock untuk memastikan belum habis.
     */
    public function use(Promo $promo): void
    {
        DB::transaction(function () use ($promo) {
            $locked = Promo::lockForUpdate()->findOrFail($promo->id);

            if ($locked->max_uses !== null && $locked->used_count >= $locked->max_uses) {
                throw new \Exception('Kode promo sudah habis digunakan.');
            }

            $locked->increment('used_count');
        });
    }
}
