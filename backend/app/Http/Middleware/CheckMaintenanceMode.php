<?php

namespace App\Http\Middleware;

use App\Models\AdminSetting;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class CheckMaintenanceMode
{
    // Endpoint yang tetap bisa diakses saat maintenance
    private const ALLOWED_PATHS = [
        'api/app-info',
        'api/login',
        'api/register',
        'api/topup/midtrans/callback',
        'api/topup/ipaymu/callback',
        'api/forgot-password',
    ];

    public function handle(Request $request, Closure $next)
    {
        // Log origin untuk debug Capacitor
        $origin = $request->header('Origin', 'none');
        $ua     = substr($request->header('User-Agent', ''), 0, 80);
        Log::info("[CORS-DEBUG] {$request->method()} {$request->path()} | Origin: {$origin} | UA: {$ua}");

        $isOn = AdminSetting::where('key', 'maintenance_mode')->value('value') === '1';

        if (!$isOn) return $next($request);

        // Cek apakah path ini diizinkan
        foreach (self::ALLOWED_PATHS as $path) {
            if ($request->is($path)) return $next($request);
        }

        // Admin tetap bisa akses semua endpoint
        $user = $request->user();
        if ($user && $user->role === 'admin') return $next($request);

        return response()->json([
            'message'     => 'Aplikasi sedang dalam pemeliharaan. Silakan coba beberapa saat lagi.',
            'maintenance' => true,
        ], 503);
    }
}
