<?php

namespace App\Services;

use App\Models\BankAccount;
use App\Models\QrisTransaction;
use App\Models\TopUpRequest;
use App\Models\User;
use App\Models\VirtualAccount;
use App\Models\WalletTransaction;
use App\Models\WithdrawRequest;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;

class PaymentService
{
    public function __construct(private WalletService $walletService) {}

    // ─── TOP UP MANUAL ───────────────────────────────────────────────

    public function createManualTopUp(User $user, float $amount, int $bankAccountId, ?string $proofImagePath = null): TopUpRequest
    {
        return TopUpRequest::create([
            'user_id'         => $user->id,
            'amount'          => $amount,
            'method'          => 'bank_manual',
            'status'          => 'pending',
            'bank_account_id' => $bankAccountId,
            'proof_image'     => $proofImagePath,
        ]);
    }

    public function confirmManualTopUp(TopUpRequest $request, User $admin): void
    {
        DB::transaction(function () use ($request, $admin) {
            // Lock baris agar tidak bisa dikonfirmasi dua kali bersamaan
            $locked = TopUpRequest::lockForUpdate()->findOrFail($request->id);

            if ($locked->status !== 'pending') {
                throw new \Exception('Top up ini sudah diproses sebelumnya.');
            }

            $locked->update([
                'status'       => 'confirmed',
                'confirmed_by' => $admin->id,
                'confirmed_at' => now(),
            ]);

            $this->walletService->credit(
                $locked->user,
                (float) $locked->amount,
                'topup',
                'Top up via transfer bank manual',
                $locked
            );
        });
    }

    public function rejectManualTopUp(TopUpRequest $request, User $admin, string $notes): void
    {
        $request->update([
            'status'       => 'rejected',
            'confirmed_by' => $admin->id,
            'confirmed_at' => now(),
            'notes'        => $notes,
        ]);
    }

    // ─── VIRTUAL ACCOUNT ─────────────────────────────────────────────

    public function createVirtualAccount(User $user, float $amount): TopUpRequest
    {
        return DB::transaction(function () use ($user, $amount) {
            $topUp = TopUpRequest::create([
                'user_id' => $user->id,
                'amount'  => $amount,
                'method'  => 'virtual_account',
                'status'  => 'pending',
            ]);

            VirtualAccount::create([
                'top_up_request_id' => $topUp->id,
                'user_id'           => $user->id,
                'va_number'         => $this->generateVaNumber($user->id),
                'bank_name'         => 'BCA',
                'amount'            => $amount,
                'expired_at'        => now()->addHours(24),
                'status'            => 'pending',
            ]);

            return $topUp->load('virtualAccount');
        });
    }

    // Dipanggil oleh callback payment gateway (simulasi)
    public function confirmVirtualAccountPayment(VirtualAccount $va): void
    {
        DB::transaction(function () use ($va) {
            $locked = VirtualAccount::lockForUpdate()->findOrFail($va->id);

            if ($locked->status !== 'pending') {
                throw new \Exception('Virtual account ini sudah dibayar sebelumnya.');
            }

            $locked->update(['status' => 'paid', 'paid_at' => now()]);
            $locked->topUpRequest->update(['status' => 'confirmed', 'confirmed_at' => now()]);

            $this->walletService->credit(
                $locked->user,
                (float) $locked->amount,
                'topup',
                'Top up via virtual account ' . $locked->va_number,
                $locked->topUpRequest
            );
        });
    }

    // ─── QRIS DINAMIS ────────────────────────────────────────────────

    public function createQris(User $user, float $amount): TopUpRequest
    {
        return DB::transaction(function () use ($user, $amount) {
            $topUp = TopUpRequest::create([
                'user_id' => $user->id,
                'amount'  => $amount,
                'method'  => 'qris',
                'status'  => 'pending',
            ]);

            $reference = 'ZG-' . strtoupper(uniqid());

            QrisTransaction::create([
                'top_up_request_id' => $topUp->id,
                'user_id'           => $user->id,
                'qris_code'         => $this->generateQrisCode($amount, $reference),
                'amount'            => $amount,
                'expired_at'        => now()->addMinutes(15),
                'status'            => 'pending',
                'payment_reference' => $reference,
            ]);

            return $topUp->load('qrisTransaction');
        });
    }

    // Dipanggil oleh callback payment gateway (simulasi)
    public function confirmQrisPayment(QrisTransaction $qris): void
    {
        DB::transaction(function () use ($qris) {
            $locked = QrisTransaction::lockForUpdate()->findOrFail($qris->id);

            if ($locked->status !== 'pending') {
                throw new \Exception('QRIS ini sudah dibayar sebelumnya.');
            }

            $locked->update(['status' => 'paid', 'paid_at' => now()]);
            $locked->topUpRequest->update(['status' => 'confirmed', 'confirmed_at' => now()]);

            $this->walletService->credit(
                $locked->user,
                (float) $locked->amount,
                'topup',
                'Top up via QRIS',
                $locked->topUpRequest
            );
        });
    }

    // ─── WITHDRAW ────────────────────────────────────────────────────

    public function createWithdraw(User $user, array $data): WithdrawRequest
    {
        $minBalance = (float) config('zasaqu.min_mitra_balance', 10000);

        return DB::transaction(function () use ($user, $data, $minBalance) {
            // Lock baris wallet agar cek saldo dan increment berjalan atomik
            // — mencegah double-withdraw yang melebihi saldo tersedia
            $wallet    = \App\Models\Wallet::lockForUpdate()->where('user_id', $user->id)->firstOrFail();
            $remaining = $wallet->availableBalance() - $data['amount'];

            if ($remaining < $minBalance) {
                throw new \Exception("Saldo setelah withdraw harus minimal Rp " . number_format($minBalance, 0, ',', '.'));
            }

            $wallet->increment('locked_balance', $data['amount']);

            return WithdrawRequest::create([
                'user_id'            => $user->id,
                'amount'             => $data['amount'],
                'destination_type'   => $data['destination_type'],
                'destination_number' => $data['destination_number'],
                'destination_name'   => $data['destination_name'],
                'bank_name'          => $data['bank_name'] ?? null,
                'status'             => 'pending',
            ]);
        });
    }

    public function processWithdraw(WithdrawRequest $request, User $admin, string $status, ?string $notes = null): void
    {
        DB::transaction(function () use ($request, $admin, $status, $notes) {
            // Lock baris agar tidak bisa diproses dua kali bersamaan
            $locked = WithdrawRequest::lockForUpdate()->findOrFail($request->id);

            if (!in_array($locked->status, ['pending', 'processing'])) {
                throw new \Exception('Withdraw ini sudah diproses sebelumnya.');
            }

            // lockForUpdate agar lepas-kunci locked_balance berjalan atomik
            $wallet = \App\Models\Wallet::lockForUpdate()->where('user_id', $locked->user_id)->firstOrFail();

            if ($status === 'completed') {
                // Lepas kunci dulu agar availableBalance cukup, baru debit
                $wallet->decrement('locked_balance', $locked->amount);
                $this->walletService->debit(
                    $locked->user,
                    (float) $locked->amount,
                    'withdraw',
                    'Withdraw ke ' . $locked->destination_type . ' ' . $locked->destination_number,
                    $locked
                );
            } elseif ($status === 'rejected') {
                // Lepas kunci saldo — uang tidak pernah didebit, hanya dikunci
                $currentBalance = (float) $wallet->balance;
                $wallet->decrement('locked_balance', $locked->amount);

                \App\Models\WalletTransaction::create([
                    'wallet_id'      => $wallet->id,
                    'type'           => 'refund',
                    'amount'         => (float) $locked->amount,
                    'balance_before' => $currentBalance,
                    'balance_after'  => $currentBalance,
                    'description'    => 'Withdraw dibatalkan — saldo dikembalikan' . ($notes ? ': ' . $notes : ''),
                    'reference_type' => WithdrawRequest::class,
                    'reference_id'   => $locked->id,
                    'status'         => 'completed',
                ]);
            }

            $locked->update([
                'status'       => $status,
                'processed_by' => $admin->id,
                'processed_at' => now(),
                'notes'        => $notes,
            ]);
        });
    }

    // ─── Helpers ─────────────────────────────────────────────────────

    private function generateVaNumber(int $userId): string
    {
        // Format: 88888 + user_id (padded) + random 3 digit
        return '88888' . str_pad($userId, 6, '0', STR_PAD_LEFT) . random_int(100, 999);
    }

    // ─── QRIS EMV Generator ───────────────────────────────────────────
    // Menghasilkan QRIS Dinamis sesuai standar EMVCo + PADG BI 21/18/PADG/2019
    // Format: TLV (Tag-Length-Value), CRC-16/CCITT-FALSE

    private function generateQrisCode(float $amount, string $reference): string
    {
        $nmid     = config('zasaqu.qris_nmid',              'ID1020001483564');
        $name     = substr(config('zasaqu.qris_merchant_name', 'ZasaQu'), 0, 25);
        $city     = substr(config('zasaqu.qris_merchant_city', 'Jakarta'), 0, 15);
        $mcc      = config('zasaqu.qris_merchant_category', '5999');
        $amountStr = (string)(int) $amount;   // IDR = bilangan bulat, tanpa desimal
        $ref       = substr($reference, 0, 25);

        // Tag 26 — Merchant Account Information (QRIS)
        $tag26 = $this->tlv('00', 'ID.CO.QRIS.WWW')   // GUID QRIS nasional
               . $this->tlv('01', $nmid)               // NMID merchant
               . $this->tlv('02', '0');                // Kriteria: 0=UMI

        // Tag 62 — Additional Data Field (nomor referensi transaksi)
        $tag62 = $this->tlv('05', $ref);

        // Susun seluruh field kecuali CRC
        $payload = $this->tlv('00', '01')          // Payload Format Indicator
                 . $this->tlv('01', '12')           // Point of Initiation: 12 = Dinamis
                 . $this->tlv('26', $tag26)         // Merchant Account Info
                 . $this->tlv('52', $mcc)           // MCC
                 . $this->tlv('53', '360')          // Currency: 360 = IDR
                 . $this->tlv('54', $amountStr)     // Nominal (wajib untuk dinamis)
                 . $this->tlv('58', 'ID')           // Country Code
                 . $this->tlv('59', $name)          // Merchant Name
                 . $this->tlv('60', $city)          // Merchant City
                 . $this->tlv('62', $tag62)         // Additional Data
                 . '6304';                          // Tag CRC + panjang 4

        // Hitung CRC-16/CCITT-FALSE dan tambahkan ke akhir
        return $payload . strtoupper(sprintf('%04X', $this->crc16($payload)));
    }

    // TLV encoder: tag (2 char) + panjang (2 digit) + value
    private function tlv(string $tag, string $value): string
    {
        return $tag . str_pad(strlen($value), 2, '0', STR_PAD_LEFT) . $value;
    }

    // CRC-16/CCITT-FALSE — polinomial 0x1021, nilai awal 0xFFFF
    private function crc16(string $data): int
    {
        $crc = 0xFFFF;
        $len = strlen($data);
        for ($i = 0; $i < $len; $i++) {
            $crc ^= (ord($data[$i]) << 8);
            for ($j = 0; $j < 8; $j++) {
                $crc = ($crc & 0x8000)
                    ? (($crc << 1) ^ 0x1021) & 0xFFFF
                    : ($crc << 1) & 0xFFFF;
            }
        }
        return $crc;
    }
}
