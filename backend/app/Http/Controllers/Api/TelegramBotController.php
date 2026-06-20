<?php

namespace App\Http\Controllers\Api;

use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Routing\Controller;
use Illuminate\Support\Facades\Http;

class TelegramBotController extends Controller
{
    private string $botToken;
    private string $botSecret;

    public function __construct()
    {
        $this->botToken  = config('services.telegram_bot.token');
        $this->botSecret = config('services.telegram_bot.webhook_secret');
    }

    public function webhook(Request $request): Response
    {
        $receivedSecret = $request->header('X-Telegram-Bot-Api-Secret-Token');

        if ($this->botSecret && $receivedSecret !== $this->botSecret) {
            return response('Unauthorized', 401);
        }

        $body    = $request->json()->all();
        $message = $body['message'] ?? $body['callback_query']['message'] ?? null;

        if (!$message) {
            return response('ok', 200);
        }

        $chatId = $message['chat']['id'] ?? null;
        $text   = trim(strtolower($message['text'] ?? ''));

        if (!$chatId) {
            return response('ok', 200);
        }

        $moduleMap = [
            'test zasago'   => 'zasago',
            'test zasaride' => 'zasaride',
            'test zasafood' => 'zasafood',
            'test zasamart' => 'zasamart',
            'test all'      => 'all',
        ];

        if (!isset($moduleMap[$text])) {
            return response('ok', 200);
        }

        $module = $moduleMap[$text];

        Http::timeout(10)->post("https://api.telegram.org/bot{$this->botToken}/sendMessage", [
            'chat_id' => $chatId,
            'text'    => "⏳ Menjalankan test {$module}... Mohon tunggu.",
        ]);

        $artisan  = PHP_BINARY . ' ' . base_path('artisan');
        $cmd      = escapeshellcmd($artisan) . ' test:e2e --module=' . escapeshellarg($module) . ' 2>&1';
        $output   = [];
        $exitCode = 0;
        exec($cmd, $output, $exitCode);
        $raw    = implode("\n", $output);
        $result = json_decode($raw, true);

        if (json_last_error() !== JSON_ERROR_NONE) {
            Http::timeout(10)->post("https://api.telegram.org/bot{$this->botToken}/sendMessage", [
                'chat_id' => $chatId,
                'text'    => "❌ Error: output tidak valid.\n" . substr($raw, 0, 300),
            ]);
            return response('ok', 200);
        }

        Http::timeout(10)->post("https://api.telegram.org/bot{$this->botToken}/sendMessage", [
            'chat_id'    => $chatId,
            'text'       => $this->formatResult($result),
            'parse_mode' => 'HTML',
        ]);

        return response('ok', 200);
    }

    public function register(Request $request): \Illuminate\Http\JsonResponse
    {
        $secret = config('services.monitor.secret');
        if (empty($secret) || $request->header('X-Monitor-Secret') !== $secret) {
            return response()->json(['message' => 'Unauthorized'], 401);
        }

        $webhookUrl = config('app.url') . '/api/telegram/webhook';
        $res = Http::post("https://api.telegram.org/bot{$this->botToken}/setWebhook", [
            'url'             => $webhookUrl,
            'secret_token'    => $this->botSecret,
            'allowed_updates' => ['message'],
        ]);

        return response()->json([
            'webhook_url' => $webhookUrl,
            'telegram'    => $res->json(),
        ]);
    }

    public function info(Request $request): \Illuminate\Http\JsonResponse
    {
        $secret = config('services.monitor.secret');
        if (empty($secret) || $request->header('X-Monitor-Secret') !== $secret) {
            return response()->json(['message' => 'Unauthorized'], 401);
        }

        $res = Http::get("https://api.telegram.org/bot{$this->botToken}/getWebhookInfo");
        return response()->json($res->json());
    }

    private function formatResult(array $result): string
    {
        $mods    = array_keys($result['results'] ?? []);
        $allPass = !empty($mods) && collect($mods)->every(fn($m) => ($result['results'][$m]['status'] ?? '') === 'pass');
        $icon    = $allPass ? '✅' : '⚠️';

        $msg = "{$icon} <b>E2E Test ZasaQu</b>\n<b>Hasil:</b> " . htmlspecialchars($result['summary'] ?? '?') . "\n\n";

        foreach ($result['results'] ?? [] as $mod => $res) {
            $modIcon = $res['status'] === 'pass' ? '✅' : '❌';
            $msg    .= "{$modIcon} <b>" . strtoupper($mod) . "</b>";
            if (!empty($res['order_id'])) {
                $msg .= " (Order #" . htmlspecialchars((string) $res['order_id']) . ")";
            }
            if (!empty($res['error'])) {
                $msg .= "\n   └ " . htmlspecialchars(substr($res['error'], 0, 150));
            }
            if (!empty($res['steps'])) {
                $msg .= "\n   └ " . htmlspecialchars(implode(' → ', $res['steps']));
            }
            $msg .= "\n";
        }

        $msg .= "\n⏱ " . htmlspecialchars($result['tested_at'] ?? '');
        return $msg;
    }
}
