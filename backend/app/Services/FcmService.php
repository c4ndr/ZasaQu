<?php

namespace App\Services;

use App\Models\User;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class FcmService
{
    private string $projectId;
    private string $serviceAccountPath;

    public function __construct()
    {
        $this->projectId          = config('services.fcm.project_id', '');
        $this->serviceAccountPath = config('services.fcm.service_account_path', '');
    }

    public function sendToUser(User $user, string $title, string $body, array $data = []): bool
    {
        if (empty($user->fcm_token) || empty($this->projectId)) {
            return false;
        }

        return $this->send($user->fcm_token, $title, $body, $data);
    }

    public function send(string $token, string $title, string $body, array $data = []): bool
    {
        if (empty($this->projectId) || empty($this->serviceAccountPath)) {
            return false;
        }

        try {
            $accessToken = $this->getAccessToken();
            if (!$accessToken) return false;

            $payload = [
                'message' => [
                    'token'        => $token,
                    'notification' => ['title' => $title, 'body' => $body],
                    'data'         => array_map('strval', $data),
                    'android'      => ['priority' => 'high'],
                    'apns'         => ['headers' => ['apns-priority' => '10']],
                ],
            ];

            $response = Http::withToken($accessToken)
                ->timeout(10)
                ->post("https://fcm.googleapis.com/v1/projects/{$this->projectId}/messages:send", $payload);

            if (!$response->successful()) {
                Log::warning('FCM send failed', ['status' => $response->status(), 'body' => $response->body()]);
                return false;
            }

            return true;
        } catch (\Throwable $e) {
            Log::error('FCM exception', ['error' => $e->getMessage()]);
            return false;
        }
    }

    private function getAccessToken(): ?string
    {
        if (!file_exists($this->serviceAccountPath)) {
            return null;
        }

        try {
            $serviceAccount = json_decode(file_get_contents($this->serviceAccountPath), true);

            $now    = time();
            $header = base64_encode(json_encode(['alg' => 'RS256', 'typ' => 'JWT']));
            $claim  = base64_encode(json_encode([
                'iss'   => $serviceAccount['client_email'],
                'scope' => 'https://www.googleapis.com/auth/firebase.messaging',
                'aud'   => 'https://oauth2.googleapis.com/token',
                'iat'   => $now,
                'exp'   => $now + 3600,
            ]));

            $sig = '';
            openssl_sign(
                "{$header}.{$claim}",
                $sig,
                $serviceAccount['private_key'],
                'SHA256'
            );

            $jwt = "{$header}.{$claim}." . base64_encode($sig);

            $response = Http::asForm()->post('https://oauth2.googleapis.com/token', [
                'grant_type' => 'urn:ietf:params:oauth:grant-type:jwt-bearer',
                'assertion'  => $jwt,
            ]);

            return $response->json('access_token');
        } catch (\Throwable $e) {
            Log::error('FCM getAccessToken failed', ['error' => $e->getMessage()]);
            return null;
        }
    }
}
