<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Redis;

class HealthController extends Controller
{
    public function __invoke(): JsonResponse
    {
        $checks  = [];
        $healthy = true;

        // ── Database ──────────────────────────────────────────────────────────
        try {
            DB::select('SELECT 1');
            $userCount = DB::table('users')->count();
            $checks['database'] = ['status' => 'ok', 'users' => $userCount];
        } catch (\Throwable $e) {
            Log::error('Health DB check failed', ['error' => $e->getMessage()]);
            $checks['database'] = ['status' => 'error'];
            $healthy = false;
        }

        // ── Redis ─────────────────────────────────────────────────────────────
        try {
            $key = 'health:ping:' . time();
            Redis::setex($key, 5, 'pong');
            $val = Redis::get($key);
            Redis::del($key);
            $checks['redis'] = ['status' => $val === 'pong' ? 'ok' : 'error'];
            if ($val !== 'pong') $healthy = false;
        } catch (\Throwable $e) {
            Log::error('Health Redis check failed', ['error' => $e->getMessage()]);
            $checks['redis'] = ['status' => 'error'];
            $healthy = false;
        }

        // ── Cache (uses Redis) ────────────────────────────────────────────────
        try {
            Cache::put('health:cache', 'ok', 5);
            $v = Cache::get('health:cache');
            $checks['cache'] = ['status' => $v === 'ok' ? 'ok' : 'error'];
        } catch (\Throwable $e) {
            Log::error('Health cache check failed', ['error' => $e->getMessage()]);
            $checks['cache'] = ['status' => 'error'];
        }

        // ── Queue ─────────────────────────────────────────────────────────────
        try {
            $pending = DB::table('jobs')->count();
            $failed  = DB::table('failed_jobs')->count();
            $checks['queue'] = [
                'status'  => 'ok',
                'pending' => $pending,
                'failed'  => $failed,
            ];
            if ($failed > 0) $checks['queue']['warning'] = "{$failed} failed jobs";
        } catch (\Throwable $e) {
            Log::error('Health queue check failed', ['error' => $e->getMessage()]);
            $checks['queue'] = ['status' => 'error'];
        }

        // ── Storage ───────────────────────────────────────────────────────────
        $storageLinkExists = is_link(public_path('storage'));
        $checks['storage'] = ['status' => $storageLinkExists ? 'ok' : 'warning'];
        if (!$storageLinkExists) {
            $checks['storage']['message'] = 'Run: php artisan storage:link';
        }

        // ── Broadcast ─────────────────────────────────────────────────────────
        $broadcastConn = config('broadcasting.default');
        $checks['broadcast'] = ['status' => 'ok'];
        if ($broadcastConn === 'log') {
            $checks['broadcast']['warning'] = 'Using log driver — real-time push disabled';
        }

        // ── FCM / Push ────────────────────────────────────────────────────────
        $fcmConfigured = !empty(config('services.fcm.project_id'))
                      && file_exists(config('services.fcm.service_account_path', ''));
        $checks['push_notifications'] = [
            'status'     => $fcmConfigured ? 'ok' : 'warning',
            'configured' => $fcmConfigured,
        ];
        if (!$fcmConfigured) {
            $checks['push_notifications']['warning'] = 'FCM not configured — push disabled';
        }

        // ── GPS active drivers ────────────────────────────────────────────────
        try {
            $activeGps = Redis::keys('gps:mitra:*');
            $checks['gps'] = ['status' => 'ok', 'active_mitras' => count($activeGps)];
        } catch (\Throwable $e) {
            Log::error('Health GPS check failed', ['error' => $e->getMessage()]);
            $checks['gps'] = ['status' => 'error'];
        }

        // ── App settings ──────────────────────────────────────────────────────
        try {
            $maintenance = \App\Models\AdminSetting::where('key', 'maintenance_mode')->value('value') === '1';
            $checks['app'] = [
                'status'           => 'ok',
                'maintenance_mode' => $maintenance,
            ];
        } catch (\Throwable $e) {
            Log::error('Health app check failed', ['error' => $e->getMessage()]);
            $checks['app'] = ['status' => 'error'];
        }

        $httpStatus = $healthy ? 200 : 503;

        return response()->json([
            'status'    => $healthy ? 'healthy' : 'degraded',
            'timestamp' => now()->toIso8601String(),
            'checks'    => $checks,
        ], $httpStatus);
    }
}
