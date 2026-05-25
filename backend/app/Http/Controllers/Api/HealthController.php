<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Redis;
use Illuminate\Support\Facades\Storage;

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
            $checks['database'] = ['status' => 'error', 'message' => $e->getMessage()];
            $healthy = false;
        }

        // ── Redis ─────────────────────────────────────────────────────────────
        try {
            $key = 'health:ping:' . time();
            Redis::setex($key, 5, 'pong');
            $val = Redis::get($key);
            Redis::del($key);
            $checks['redis'] = $val === 'pong'
                ? ['status' => 'ok', 'client' => config('database.redis.client', 'predis')]
                : ['status' => 'error', 'message' => 'read-back mismatch'];
            if ($val !== 'pong') $healthy = false;
        } catch (\Throwable $e) {
            $checks['redis'] = ['status' => 'error', 'message' => $e->getMessage()];
            $healthy = false;
        }

        // ── Cache (uses Redis) ────────────────────────────────────────────────
        try {
            Cache::put('health:cache', 'ok', 5);
            $v = Cache::get('health:cache');
            $checks['cache'] = ['status' => $v === 'ok' ? 'ok' : 'error', 'driver' => config('cache.default')];
        } catch (\Throwable $e) {
            $checks['cache'] = ['status' => 'error', 'message' => $e->getMessage()];
        }

        // ── Queue ─────────────────────────────────────────────────────────────
        try {
            $pending = DB::table('jobs')->count();
            $failed  = DB::table('failed_jobs')->count();
            $checks['queue'] = [
                'status'      => 'ok',
                'connection'  => config('queue.default'),
                'pending'     => $pending,
                'failed'      => $failed,
            ];
            if ($failed > 0) $checks['queue']['warning'] = "{$failed} failed jobs";
        } catch (\Throwable $e) {
            $checks['queue'] = ['status' => 'error', 'message' => $e->getMessage()];
        }

        // ── Storage ───────────────────────────────────────────────────────────
        $storageLinkExists = is_link(public_path('storage'));
        $checks['storage'] = [
            'status'      => $storageLinkExists ? 'ok' : 'warning',
            'public_link' => $storageLinkExists,
            'disk'        => config('filesystems.default'),
        ];
        if (!$storageLinkExists) {
            $checks['storage']['message'] = 'Run: php artisan storage:link';
        }

        // ── Broadcast ─────────────────────────────────────────────────────────
        $broadcastConn = config('broadcasting.default');
        $checks['broadcast'] = [
            'status'     => 'ok',
            'connection' => $broadcastConn,
        ];
        if ($broadcastConn === 'log') {
            $checks['broadcast']['warning'] = 'Using log driver — real-time push disabled';
        }

        // ── FCM / Push ────────────────────────────────────────────────────────
        $fcmConfigured = !empty(config('services.firebase.credentials_path'))
                      || !empty(config('services.firebase.server_key'));
        $checks['push_notifications'] = [
            'status'      => $fcmConfigured ? 'ok' : 'warning',
            'configured'  => $fcmConfigured,
        ];
        if (!$fcmConfigured) {
            $checks['push_notifications']['warning'] = 'FCM not configured — push disabled';
        }

        // ── GPS active drivers ────────────────────────────────────────────────
        try {
            $activeGps = Redis::keys('gps:mitra:*');
            $checks['gps'] = ['status' => 'ok', 'active_mitras' => count($activeGps)];
        } catch (\Throwable $e) {
            $checks['gps'] = ['status' => 'error', 'message' => $e->getMessage()];
        }

        // ── App settings ──────────────────────────────────────────────────────
        try {
            $maintenance = \App\Models\AdminSetting::where('key', 'maintenance_mode')->value('value') === '1';
            $checks['app'] = [
                'status'           => 'ok',
                'maintenance_mode' => $maintenance,
                'env'              => app()->environment(),
                'debug'            => config('app.debug'),
            ];
        } catch (\Throwable $e) {
            $checks['app'] = ['status' => 'error', 'message' => $e->getMessage()];
        }

        $httpStatus = $healthy ? 200 : 503;

        return response()->json([
            'status'    => $healthy ? 'healthy' : 'degraded',
            'timestamp' => now()->toIso8601String(),
            'checks'    => $checks,
        ], $httpStatus);
    }
}
