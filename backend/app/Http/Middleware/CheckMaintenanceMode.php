<?php

namespace App\Http\Middleware;

use App\Models\AdminSetting;
use Closure;
use Illuminate\Http\Request;

class CheckMaintenanceMode
{
    // Endpoint yang tetap bisa diakses saat maintenance
    private const ALLOWED_PATHS = [
        'api/app-info',
        'api/login',
        'api/register',
        'api/topup/midtrans/callback',
        'api/forgot-password',
    ];

    public function handle(Request $request, Closure $next)
    {
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
