<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureUserActive
{
    // Endpoint yang boleh diakses mitra pending_review
    private const PENDING_ALLOWED = [
        'api/auth/me', 'api/auth/logout', 'api/auth/profile', 'api/auth/change-password',
        'api/mitra/onboarding',
        'api/notifications',
        'api/wallet/summary',
    ];

    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();
        if (!$user) return $next($request);

        if (in_array($user->status, ['suspended', 'banned'])) {
            return response()->json(['message' => "Akun Anda {$user->status}."], 403);
        }

        if ($user->status === 'pending_review') {
            $path = $request->path();
            $allowed = collect(self::PENDING_ALLOWED)
                ->some(fn($prefix) => str_starts_with($path, $prefix));

            if (!$allowed) {
                return response()->json([
                    'message' => 'Akun Anda sedang dalam proses verifikasi. Lengkapi dokumen di halaman onboarding.',
                    'status'  => 'pending_review',
                ], 403);
            }
        }

        return $next($request);
    }
}
