<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AdminSetting;
use App\Models\BankAccount;
use App\Models\TopUpRequest;
use App\Models\User;
use App\Services\IpaymuService;
use App\Services\MidtransService;
use App\Services\NotificationService;
use App\Services\PaymentService;
use App\Services\WalletService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class TopUpController extends Controller
{
    public function __construct(
        private PaymentService      $paymentService,
        private WalletService       $walletService,
        private MidtransService     $midtransService,
        private IpaymuService       $ipaymuService,
        private NotificationService $notifService,
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
        if (!AdminSetting::walletEnabled() && $request->user()->role === 'pelanggan') {
            return response()->json(['message' => 'Fitur wallet sedang tidak aktif.'], 422);
        }

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

        // Notifikasi ke semua admin
        User::where('role', 'admin')->get()->each(function ($admin) use ($topUp, $request) {
            try {
                $this->notifService->topUpRequestCreated($admin, $request->user(), (int) $topUp->amount, $topUp->id);
            } catch (\Throwable) {}
        });

        return response()->json([
            'message' => 'Bukti transfer berhasil dikirim. Menunggu konfirmasi admin.',
            'data'    => $topUp->load('bankAccount'),
        ], 201);
    }

    public function createVirtualAccount(Request $request): JsonResponse
    {
        if (!AdminSetting::walletEnabled() && $request->user()->role === 'pelanggan') {
            return response()->json(['message' => 'Fitur wallet sedang tidak aktif.'], 422);
        }

        $data = $request->validate([
            'amount' => ['required', 'numeric', 'min:10000', 'max:50000000'],
        ]);

        $topUp = $this->paymentService->createVirtualAccount($request->user(), (float) $data['amount']);

        return response()->json([
            'message' => 'Virtual account berhasil dibuat. Lakukan pembayaran sebelum 24 jam.',
            'data'    => $topUp,
        ], 201);
    }

    // QRIS simulasi dinonaktifkan — gunakan POST /topup/ipaymu/qris
    public function createQris(Request $request): JsonResponse
    {
        return response()->json([
            'message' => 'Top up QRIS sekarang menggunakan iPaymu. Gunakan endpoint /topup/ipaymu/qris.',
            'redirect' => '/topup/ipaymu/qris',
        ], 410);
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

    // ── iPaymu ────────────────────────────────────────────────────────────────

    public function createIpaymuVA(Request $request): JsonResponse
    {
        if (!AdminSetting::walletEnabled() && $request->user()->role === 'pelanggan') {
            return response()->json(['message' => 'Fitur wallet sedang tidak aktif.'], 422);
        }

        if (!$this->ipaymuService->isConfigured()) {
            return response()->json(['message' => 'iPaymu belum dikonfigurasi.'], 422);
        }

        $data = $request->validate([
            'amount'  => ['required', 'integer', 'min:10000', 'max:50000000'],
            'channel' => ['sometimes', 'in:bni,bca,bri,mandiri,cimb'],
        ]);

        $channel     = $data['channel'] ?? 'bni';
        $referenceId = 'IPAYMU-' . strtoupper(\Illuminate\Support\Str::random(8)) . '-' . time();

        $result = $this->ipaymuService->createVA($request->user(), (float) $data['amount'], $referenceId, $channel);

        if (($result['Status'] ?? null) !== 200) {
            Log::warning('iPaymu VA failed', $result);
            return response()->json(['message' => 'Gagal membuat Virtual Account: ' . ($result['Message'] ?? 'Unknown error')], 422);
        }

        $topUp = TopUpRequest::create([
            'user_id'              => $request->user()->id,
            'method'               => 'ipaymu_va',
            'amount'               => $data['amount'],
            'status'               => 'pending',
            'ipaymu_session_id'    => $result['Data']['SessionId'] ?? null,
            'ipaymu_trx_id'        => $result['Data']['TransactionId'] ?? null,
            'ipaymu_reference_id'  => $referenceId,
            'ipaymu_channel'       => $channel,
            'ipaymu_va_number'     => $result['Data']['PaymentNo'] ?? null,
            'ipaymu_expired_at'    => now()->addHours(24),
        ]);

        return response()->json([
            'message'    => 'Virtual Account berhasil dibuat. Bayar dalam 24 jam.',
            'data' => [
                'id'         => $topUp->id,
                'amount'     => $topUp->amount,
                'channel'    => strtoupper($channel),
                'va_number'  => $topUp->ipaymu_va_number,
                'expired_at' => $topUp->ipaymu_expired_at,
                'how_to_pay' => 'Transfer ke nomor VA ' . strtoupper($channel) . ': ' . ($topUp->ipaymu_va_number ?? '-'),
            ],
        ], 201);
    }

    public function createIpaymuQRIS(Request $request): JsonResponse
    {
        if (!$this->ipaymuService->isConfigured()) {
            return response()->json(['message' => 'iPaymu belum dikonfigurasi.'], 422);
        }

        $data = $request->validate([
            'amount' => ['required', 'integer', 'min:10000', 'max:10000000'],
        ]);

        $referenceId = 'QRIS-' . strtoupper(\Illuminate\Support\Str::random(8)) . '-' . time();

        $result = $this->ipaymuService->createQRIS($request->user(), (float) $data['amount'], $referenceId);

        if (($result['Status'] ?? null) !== 200) {
            Log::warning('iPaymu QRIS failed', $result);
            return response()->json(['message' => 'Gagal membuat QRIS: ' . ($result['Message'] ?? 'Unknown error')], 422);
        }

        $topUp = TopUpRequest::create([
            'user_id'             => $request->user()->id,
            'method'              => 'ipaymu_qris',
            'amount'              => $data['amount'],
            'status'              => 'pending',
            'ipaymu_session_id'   => $result['Data']['SessionId'] ?? null,
            'ipaymu_trx_id'       => $result['Data']['TransactionId'] ?? null,
            'ipaymu_reference_id' => $referenceId,
            'ipaymu_channel'      => 'qris',
            'ipaymu_va_number'    => $result['Data']['PaymentNo'] ?? null,
            'ipaymu_expired_at'   => now()->addHour(),
        ]);

        return response()->json([
            'message' => 'QRIS berhasil dibuat. Scan dalam 1 jam.',
            'data' => [
                'id'         => $topUp->id,
                'amount'     => $topUp->amount,
                'qris_url'   => $result['Data']['QrImage'] ?? ($result['Data']['PaymentUrl'] ?? null),
                'qris_string'=> $result['Data']['PaymentNo'] ?? null,
                'expired_at' => $topUp->ipaymu_expired_at,
            ],
        ], 201);
    }

    // Callback / webhook dari iPaymu (tidak butuh auth)
    // iPaymu mengirim field: trxId, referenceId, status, via, price, buyerName, buyerEmail, buyerPhone
    public function ipaymuCallback(Request $request): \Illuminate\Http\Response
    {
        try {
            if (!$this->ipaymuService->verifyCallback($request)) {
                Log::warning('iPaymu callback signature invalid', ['ip' => $request->ip()]);
                return response('Invalid signature', 401);
            }

            Log::info('iPaymu callback', $request->all());

            // Support application/json dan application/x-www-form-urlencoded
            $status      = $request->input('status', '');
            $trxId       = $request->input('trxId', $request->input('trx_id', ''));
            $referenceId = $request->input('referenceId', $request->input('reference_id', ''));
            $sessionId   = $request->input('sessionId', $request->input('session_id', ''));

            // iPaymu status: "berhasil" = sukses
            if (strtolower($status) !== 'berhasil') {
                return response('OK', 200);
            }

            DB::transaction(function () use ($sessionId, $referenceId, $trxId) {
                $topUp = TopUpRequest::where(function ($q) use ($sessionId, $referenceId, $trxId) {
                        $q->when($sessionId,   fn($q) => $q->orWhere('ipaymu_session_id',   $sessionId))
                          ->when($referenceId, fn($q) => $q->orWhere('ipaymu_reference_id', $referenceId))
                          ->when($trxId,       fn($q) => $q->orWhere('ipaymu_trx_id',       $trxId));
                    })
                    ->where('status', 'pending')
                    ->whereIn('method', ['ipaymu_va', 'ipaymu_qris'])
                    ->lockForUpdate()
                    ->first();

                if (!$topUp) return;

                $topUp->update([
                    'status'       => 'confirmed',
                    'confirmed_at' => now(),
                    'ipaymu_trx_id' => $trxId ?: $topUp->ipaymu_trx_id,
                ]);

                $this->walletService->credit(
                    $topUp->user,
                    (float) $topUp->amount,
                    'topup',
                    'Top up via iPaymu (' . strtoupper($topUp->ipaymu_channel) . ')',
                    $topUp
                );
            });
        } catch (\Throwable $e) {
            Log::error('iPaymu callback error', ['error' => $e->getMessage()]);
        }

        return response('OK', 200);
    }

    // Cek status pembayaran iPaymu (polling dari frontend)
    public function checkIpaymuStatus(Request $request, int $topUpId): JsonResponse
    {
        $topUp = TopUpRequest::where('id', $topUpId)
            ->where('user_id', $request->user()->id)
            ->whereIn('method', ['ipaymu_va', 'ipaymu_qris'])
            ->firstOrFail();

        if ($topUp->status === 'confirmed') {
            return response()->json(['status' => 'confirmed', 'message' => 'Pembayaran berhasil.']);
        }

        if ($topUp->ipaymu_expired_at && $topUp->ipaymu_expired_at->isPast()) {
            return response()->json(['status' => 'expired', 'message' => 'Transaksi sudah kedaluwarsa.']);
        }

        // Cek ke iPaymu jika punya session ID
        if ($topUp->ipaymu_session_id) {
            $result = $this->ipaymuService->checkStatus($topUp->ipaymu_session_id);
            $data   = is_array($result['Data'] ?? null) ? $result['Data'] : [];
            $status = strtolower($data['Status'] ?? '');

            if ($status === 'berhasil' || $status === 'sukses') {
                $credited = false;
                DB::transaction(function () use ($topUpId, &$credited) {
                    // Re-fetch dengan lock agar tidak double-credit jika ada request concurrent
                    $locked = TopUpRequest::lockForUpdate()->findOrFail($topUpId);
                    if ($locked->status !== 'pending') return; // sudah diproses
                    $locked->update(['status' => 'confirmed', 'confirmed_at' => now()]);
                    $this->walletService->credit(
                        $locked->user,
                        (float) $locked->amount,
                        'topup',
                        'Top up via iPaymu (' . strtoupper($locked->ipaymu_channel) . ')',
                        $locked
                    );
                    $credited = true;
                });
                if ($credited) {
                    return response()->json(['status' => 'confirmed', 'message' => 'Pembayaran berhasil.']);
                }
            }
        }

        return response()->json([
            'status'     => 'pending',
            'message'    => 'Menunggu pembayaran.',
            'expired_at' => $topUp->ipaymu_expired_at,
        ]);
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
