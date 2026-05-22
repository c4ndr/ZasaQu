<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\WithdrawRequest;
use App\Services\PaymentService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class WithdrawController extends Controller
{
    public function __construct(private PaymentService $paymentService) {}

    public function history(Request $request): JsonResponse
    {
        $history = WithdrawRequest::where('user_id', $request->user()->id)
            ->latest()
            ->paginate(20);

        return response()->json($history);
    }

    public function create(Request $request): JsonResponse
    {
        if (!$request->user()->isMitra()) {
            return response()->json(['message' => 'Hanya mitra yang bisa melakukan withdraw.'], 403);
        }

        $data = $request->validate([
            'amount'             => ['required', 'numeric', 'min:10000'],
            'destination_type'   => ['required', 'in:dana,ovo,gopay,bank'],
            'destination_number' => ['required', 'string', 'max:30'],
            'destination_name'   => ['required', 'string', 'max:100'],
            'bank_name'          => ['required_if:destination_type,bank', 'string', 'max:50'],
        ]);

        try {
            $withdraw = $this->paymentService->createWithdraw($request->user(), $data);
        } catch (\Exception $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }

        return response()->json([
            'message' => 'Permintaan withdraw berhasil dikirim. Diproses dalam 1x24 jam.',
            'data'    => $withdraw,
        ], 201);
    }
}
