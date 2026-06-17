<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Promo;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PromoValidateController extends Controller
{
    public function validate(Request $request): JsonResponse
    {
        $data = $request->validate([
            'code'         => ['required', 'string'],
            'order_amount' => ['required', 'integer', 'min:0'],
            'module'       => ['required', 'string'],
        ]);

        $promo = Promo::where('code', strtoupper($data['code']))
            ->where('is_active', true)
            ->first();

        if (!$promo || !$promo->isVoucher()) {
            return response()->json(['message' => 'Kode promo tidak ditemukan.'], 422);
        }

        if ($promo->expires_at && $promo->expires_at->isPast()) {
            return response()->json(['message' => 'Kode promo sudah kedaluwarsa.'], 422);
        }

        if ($promo->max_uses !== null && $promo->used_count >= $promo->max_uses) {
            return response()->json(['message' => 'Kode promo sudah habis digunakan.'], 422);
        }

        if (!$promo->isValidForModule($data['module'])) {
            return response()->json(['message' => 'Kode promo tidak berlaku untuk layanan ini.'], 422);
        }

        $discount = $promo->calculateDiscount((int) $data['order_amount']);

        if ($discount === 0) {
            return response()->json([
                'message' => 'Minimum order Rp ' . number_format($promo->min_order_amount, 0, ',', '.') . ' untuk menggunakan promo ini.',
            ], 422);
        }

        return response()->json([
            'valid'          => true,
            'promo_id'       => $promo->id,
            'title'          => $promo->title,
            'discount_type'  => $promo->discount_type,
            'discount_value' => $promo->discount_value,
            'discount_amount' => $discount,
        ]);
    }
}
