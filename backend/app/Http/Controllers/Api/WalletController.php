<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\WalletService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class WalletController extends Controller
{
    public function __construct(private WalletService $walletService) {}

    public function summary(Request $request): JsonResponse
    {
        return response()->json($this->walletService->getSummary($request->user()));
    }

    public function transactions(Request $request): JsonResponse
    {
        $transactions = $this->walletService->getTransactions($request->user());
        return response()->json($transactions);
    }
}
