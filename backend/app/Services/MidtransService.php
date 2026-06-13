<?php

namespace App\Services;

use App\Models\TopUpRequest;
use App\Models\User;
use Illuminate\Support\Str;
use Midtrans\Config;
use Midtrans\Snap;
use Midtrans\Notification;

class MidtransService
{
    public function __construct()
    {
        Config::$serverKey    = config('services.midtrans.server_key');
        Config::$clientKey    = config('services.midtrans.client_key');
        Config::$isProduction = config('services.midtrans.is_production');
        Config::$isSanitized  = config('services.midtrans.is_sanitized');
        Config::$is3ds        = config('services.midtrans.is_3ds');
    }

    public function createSnapToken(User $user, int $amount): array
    {
        $orderId = 'TOPUP-' . strtoupper(Str::random(10)) . '-' . time();

        $params = [
            'transaction_details' => [
                'order_id'     => $orderId,
                'gross_amount' => $amount,
            ],
            'customer_details' => [
                'first_name' => $user->name,
                'email'      => $user->email ?? '',
                'phone'      => $user->phone ?? '',
            ],
            'item_details' => [[
                'id'       => 'TOPUP',
                'price'    => $amount,
                'quantity' => 1,
                'name'     => 'Top Up ZasaQu',
            ]],
            'callbacks' => [
                'finish' => config('app.url') . '/topup',
            ],
        ];

        $snapToken = Snap::getSnapToken($params);

        return [
            'order_id'   => $orderId,
            'snap_token' => $snapToken,
            'client_key' => Config::$clientKey,
        ];
    }

    public function handleNotification(): array
    {
        $notif = new Notification();

        $orderId           = $notif->order_id;
        $transactionStatus = $notif->transaction_status;
        $fraudStatus       = $notif->fraud_status;
        $grossAmount       = $notif->gross_amount; // tetap string untuk signature
        $statusCode        = $notif->status_code;

        // Verifikasi signature Midtrans: SHA512(order_id + status_code + gross_amount + server_key)
        $expectedSig = hash('sha512', $orderId . $statusCode . $grossAmount . Config::$serverKey);
        if (!hash_equals($expectedSig, (string) ($notif->signature_key ?? ''))) {
            \Illuminate\Support\Facades\Log::warning('Midtrans callback signature invalid', [
                'order_id' => $orderId,
            ]);
            return ['success' => false, 'error' => 'invalid_signature', 'order_id' => $orderId];
        }

        $success = ($transactionStatus === 'capture' && $fraudStatus === 'accept')
                || $transactionStatus === 'settlement';

        return [
            'order_id'     => $orderId,
            'status'       => $transactionStatus,
            'fraud_status' => $fraudStatus,
            'amount'       => (int) $grossAmount,
            'success'      => $success,
        ];
    }
}
