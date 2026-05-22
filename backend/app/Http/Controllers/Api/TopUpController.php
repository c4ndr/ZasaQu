<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\BankAccount;
use App\Models\TopUpRequest;
use App\Services\MidtransService;
use App\Services\PaymentService;
use App\Services\WalletService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class TopUpController extends Controller
{
    public function __construct(
        private PaymentService  $paymentService,
        private WalletService   $walletService,
        private MidtransService $midtransService,
    ) {}

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

    // ── Midtrans ──────────────────────────────────────────────────────────────

    public function createMidtrans(Request $request): JsonResponse
    {
        if (empty(config('services.midtrans.server_key'))) {
            return response()->json(['message' => 'Midtrans belum dikonfigurasi.'], 422);
        }

        $data = $request->validate([
            'amount' => ['required', 'integer', 'min:10000', 'max:50000000'],
        ]);

        try {
            $result = $this->midtransService->createSnapToken($request->user(), $data['amount']);

            // Simpan record top up pending
            TopUpRequest::create([
                'user_id'          => $request->user()->id,
                'method'           => 'midtrans',
                'amount'           => $data['amount'],
                'status'           => 'pending',
                'midtrans_order_id'=> $result['order_id'],
            ]);

            return response()->json([
                'snap_token' => $result['snap_token'],
                'client_key' => $result['client_key'],
                'order_id'   => $result['order_id'],
            ]);
        } catch (\Throwable $e) {
            Log::error('Midtrans createSnapToken failed', ['error' => $e->getMessage()]);
            return response()->json(['message' => 'Gagal membuat transaksi Midtrans: ' . $e->getMessage()], 422);
        }
    }

    public function midtransCallback(Request $request): \Illuminate\Http\Response
    {
        try {
            $notif = $this->midtransService->handleNotification();

            if (!$notif['success']) {
                return response('OK', 200);
            }

            DB::transaction(function () use ($notif) {
                $topUp = TopUpRequest::where('midtrans_order_id', $notif['order_id'])
                    ->where('status', 'pending')
                    ->lockForUpdate()
                    ->first();

                if (!$topUp) return;

                $topUp->update(['status' => 'confirmed', 'confirmed_at' => now()]);

                $this->walletService->credit(
                    $topUp->user,
                    $topUp->amount,
                    'topup',
                    'Top up via Midtrans (' . $notif['order_id'] . ')',
                    $topUp
                );
            });
        } catch (\Throwable $e) {
            Log::error('Midtrans callback failed', ['error' => $e->getMessage()]);
        }

        return response('OK', 200);
    }
}
