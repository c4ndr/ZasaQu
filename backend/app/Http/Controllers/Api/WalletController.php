<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AdminSetting;
use App\Services\WalletService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class WalletController extends Controller
{
    public function __construct(private WalletService $walletService) {}

    public function summary(Request $request): JsonResponse
    {
        $user    = $request->user();
        $summary = $this->walletService->getSummary($user);

        // Untuk mitra: sertakan saldo minimum yang diwajibkan
        if (str_starts_with($user->role ?? '', 'mitra')) {
            $summary['min_balance']   = (float) (AdminSetting::where('key', 'wallet_minimum_mitra')->value('value') ?? 0);
            $summary['can_accept']    = $summary['available'] >= $summary['min_balance'];
        }

        return response()->json($summary);
    }

    public function transactions(Request $request): JsonResponse
    {
        $transactions = $this->walletService->getTransactions($request->user());
        return response()->json($transactions);
    }
}
