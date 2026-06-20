<?php

namespace App\Http\Controllers\Api;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;

class TestRunController extends Controller
{
    public function run(Request $request): JsonResponse
    {
        $secret = config('services.monitor.secret');
        if (empty($secret) || $request->header('X-Monitor-Secret') !== $secret) {
            return response()->json(['message' => 'Unauthorized'], 401);
        }

        $modul  = $request->query('modul', 'all');
        $allowed = ['zasago', 'zasaride', 'zasafood', 'zasamart', 'all'];
        if (!in_array($modul, $allowed)) {
            return response()->json(['message' => 'Modul tidak valid. Pilih: ' . implode(', ', $allowed)], 422);
        }

        $artisan = PHP_BINARY . ' ' . base_path('artisan');
        $cmd     = escapeshellcmd($artisan) . ' test:e2e --module=' . escapeshellarg($modul) . ' 2>&1';

        $output   = [];
        $exitCode = 0;
        exec($cmd, $output, $exitCode);
        $raw = implode("\n", $output);

        $result = json_decode($raw, true);
        if (json_last_error() !== JSON_ERROR_NONE) {
            return response()->json([
                'message' => 'Command output tidak valid JSON',
                'raw'     => $raw,
            ], 500);
        }

        return response()->json($result, $exitCode === 0 ? 200 : 207);
    }
}
