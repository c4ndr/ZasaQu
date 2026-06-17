<?php

namespace App\Services;

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

class IpaymuService
{
    private string $va;
    private string $apiKey;
    private string $baseUrl;

    public function __construct()
    {
        $this->va      = config('services.ipaymu.va', '');
        $this->apiKey  = config('services.ipaymu.api_key', '');
        $this->baseUrl = config('services.ipaymu.is_production', true)
            ? 'https://my.ipaymu.com/api/v2'
            : 'https://sandbox.ipaymu.com/api/v2';
    }

    public function isConfigured(): bool
    {
        return !empty($this->va) && !empty($this->apiKey);
    }

    // Buat VA iPaymu — pilihan channel: bni, bca, bri, mandiri, cimb
    public function createVA(User $user, float $amount, string $referenceId, string $channel = 'bni'): array
    {
        $body = [
            'name'           => $user->name,
            'phone'          => $user->phone ?? '081234567890',
            'email'          => $user->email,
            'amount'         => (int) $amount,
            'notifyUrl'      => rtrim(config('app.url'), '/') . '/api/topup/ipaymu/callback',
            'expired'        => 24,
            'paymentMethod'  => 'va',
            'paymentChannel' => $channel,
            'referenceId'    => $referenceId,
            'comments'       => 'Top up ZasaQu #' . $referenceId,
        ];

        return $this->post('/payment/direct', $body);
    }

    // Buat QRIS iPaymu
    public function createQRIS(User $user, float $amount, string $referenceId): array
    {
        $body = [
            'name'           => $user->name,
            'phone'          => $user->phone ?? '081234567890',
            'email'          => $user->email,
            'amount'         => (int) $amount,
            'notifyUrl'      => rtrim(config('app.url'), '/') . '/api/topup/ipaymu/callback',
            'expired'        => 1,
            'paymentMethod'  => 'qris',
            'paymentChannel' => 'qris',
            'referenceId'    => $referenceId,
            'comments'       => 'Top up ZasaQu #' . $referenceId,
        ];

        return $this->post('/payment/direct', $body);
    }

    // Verifikasi callback dari iPaymu
    public function verifyCallback(Request $request): bool
    {
        // iPaymu kirim data sebagai POST body
        // Verifikasi dengan cek signature header jika ada, atau cek via status API
        $signature = $request->header('signature', '');
        if (empty($signature)) return false; // tolak callback tanpa signature — bisa dieksploitasi

        $bodyStr    = $request->getContent();
        $bodySha256 = strtolower(hash('sha256', $bodyStr));
        $stringSign = 'POST:' . $this->va . ':' . $bodySha256 . ':' . $this->apiKey;
        $expected   = strtolower(hash_hmac('sha256', $stringSign, $this->apiKey));

        return hash_equals($expected, strtolower($signature));
    }

    // Cek status transaksi via API iPaymu
    public function checkStatus(string $sessionId): array
    {
        $body = ['id' => $sessionId];
        return $this->post('/check-status', $body);
    }

    private function post(string $endpoint, array $body): array
    {
        try {
            $timestamp  = now()->format('YmdHis');
            $bodyStr    = json_encode($body, JSON_UNESCAPED_SLASHES);
            $bodySha256 = strtolower(hash('sha256', $bodyStr));
            $stringSign = 'POST:' . $this->va . ':' . $bodySha256 . ':' . $this->apiKey;
            $signature  = strtolower(hash_hmac('sha256', $stringSign, $this->apiKey));

            $response = Http::timeout(15)
                ->withHeaders([
                    'Content-Type' => 'application/json',
                    'va'           => $this->va,
                    'signature'    => $signature,
                    'timestamp'    => $timestamp,
                ])
                ->post($this->baseUrl . $endpoint, $body);

            $result = $response->json() ?? [];

            if (!$response->successful() || ($result['Status'] ?? null) !== 200) {
                Log::warning('iPaymu API error', [
                    'endpoint' => $endpoint,
                    'status'   => $response->status(),
                    'body'     => $result,
                ]);
            }

            return $result;
        } catch (\Throwable $e) {
            Log::error('iPaymu exception: ' . $e->getMessage());
            return ['Status' => 500, 'Message' => $e->getMessage()];
        }
    }
}
