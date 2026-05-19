<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\BankAccount;
use App\Models\TopUpRequest;
use App\Services\PaymentService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class TopUpController extends Controller
{
    public function __construct(private PaymentService $paymentService) {}

    public function bankAccounts(): JsonResponse
    {
        return response()->json(BankAccount::active()->get());
    }

    public function history(Request $request): JsonResponse
    {
        $history = TopUpRequest::where('user_id', $request->user()->id)
            ->with(['bankAccount', 'virtualAccount', 'qrisTransaction'])
            ->latest()
            ->paginate(20);

        return response()->json($history);
    }

    public function createManual(Request $request): JsonResponse
    {
        $data = $request->validate([
            'amount'          => ['required', 'numeric', 'min:10000', 'max:50000000'],
            'bank_account_id' => ['required', 'exists:bank_accounts,id'],
            'proof_image'     => ['required', 'image', 'max:5120'],
        ]);

        $path = $request->file('proof_image')->store('topup-proofs', 'public');

        $topUp = $this->paymentService->createManualTopUp(
            $request->user(),
            (float) $data['amount'],
            $data['bank_account_id'],
            $path
        );

        return response()->json([
            'message' => 'Bukti transfer berhasil dikirim. Menunggu konfirmasi admin.',
            'data'    => $topUp->load('bankAccount'),
        ], 201);
    }

    public function createVirtualAccount(Request $request): JsonResponse
    {
        $data = $request->validate([
            'amount' => ['required', 'numeric', 'min:10000', 'max:50000000'],
        ]);

        $topUp = $this->paymentService->createVirtualAccount($request->user(), (float) $data['amount']);

        return response()->json([
            'message' => 'Virtual account berhasil dibuat. Lakukan pembayaran sebelum 24 jam.',
            'data'    => $topUp,
        ], 201);
    }

    public function createQris(Request $request): JsonResponse
    {
        $data = $request->validate([
            'amount' => ['required', 'numeric', 'min:10000', 'max:10000000'],
        ]);

        $topUp = $this->paymentService->createQris($request->user(), (float) $data['amount']);

        return response()->json([
            'message' => 'QRIS berhasil dibuat. Scan dan bayar dalam 15 menit.',
            'data'    => $topUp,
        ], 201);
    }

    // Simulasi callback QRIS (di production diganti webhook dari payment gateway)
    public function simulateQrisCallback(Request $request, int $topUpId): JsonResponse
    {
        $topUp = TopUpRequest::where('id', $topUpId)
            ->where('user_id', $request->user()->id)
            ->where('method', 'qris')
            ->where('status', 'pending')
            ->firstOrFail();

        $qris = $topUp->qrisTransaction;

        if ($qris->expired_at->isPast()) {
            return response()->json(['message' => 'QRIS sudah kedaluwarsa.'], 422);
        }

        $this->paymentService->confirmQrisPayment($qris);

        return response()->json(['message' => 'Pembayaran QRIS berhasil dikonfirmasi.']);
    }

    // Simulasi callback VA (di production diganti webhook dari bank)
    public function simulateVaCallback(Request $request, int $topUpId): JsonResponse
    {
        $topUp = TopUpRequest::where('id', $topUpId)
            ->where('user_id', $request->user()->id)
            ->where('method', 'virtual_account')
            ->where('status', 'pending')
            ->firstOrFail();

        $va = $topUp->virtualAccount;

        if ($va->expired_at->isPast()) {
            return response()->json(['message' => 'Virtual account sudah kedaluwarsa.'], 422);
        }

        $this->paymentService->confirmVirtualAccountPayment($va);

        return response()->json(['message' => 'Pembayaran virtual account berhasil dikonfirmasi.']);
    }
}
