<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Promo extends Model
{
    protected $fillable = [
        'title', 'subtitle', 'description',
        'image_path', 'gradient', 'emoji', 'link_url',
        'sort_order', 'is_active',
        'code', 'discount_type', 'discount_value', 'min_order_amount',
        'max_discount', 'max_uses', 'used_count', 'expires_at', 'applicable_modules',
    ];

    protected function casts(): array
    {
        return [
            'is_active'           => 'boolean',
            'sort_order'          => 'integer',
            'discount_value'      => 'integer',
            'min_order_amount'    => 'integer',
            'max_discount'        => 'integer',
            'max_uses'            => 'integer',
            'used_count'          => 'integer',
            'expires_at'          => 'datetime',
            'applicable_modules'  => 'array',
        ];
    }

    public function isVoucher(): bool
    {
        return !empty($this->code) && $this->discount_type !== null;
    }

    public function calculateDiscount(int $orderAmount): int
    {
        if (!$this->isVoucher()) return 0;
        if ($orderAmount < $this->min_order_amount) return 0;

        if ($this->discount_type === 'percent') {
            $disc = (int) round($orderAmount * $this->discount_value / 100);
            return $this->max_discount ? min($disc, $this->max_discount) : $disc;
        }

        return min((int) $this->discount_value, $orderAmount);
    }

    public function isValidForModule(string $module): bool
    {
        if (empty($this->applicable_modules)) return true;
        return in_array($module, $this->applicable_modules);
    }
}
