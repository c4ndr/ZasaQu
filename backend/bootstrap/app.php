<?php

use App\Http\Middleware\CheckMaintenanceMode;
use App\Http\Middleware\EnsureUserActive;
use App\Http\Middleware\RoleMiddleware;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        channels: __DIR__.'/../routes/channels.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        // Trust all proxies (Cloudflare tunnel)
        $middleware->trustProxies(at: '*');

        $middleware->alias([
            'role'        => RoleMiddleware::class,
            'active'      => EnsureUserActive::class,
            'maintenance' => CheckMaintenanceMode::class,
        ]);
        $middleware->appendToGroup('api', CheckMaintenanceMode::class);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        // Tangkap QueryException/PDOException — jangan bocorkan detail DB ke client
        $exceptions->render(function (\Illuminate\Database\QueryException $e, $request) {
            if ($request->is('api/*') || $request->expectsJson()) {
                \Illuminate\Support\Facades\Log::error('DB QueryException', [
                    'message' => $e->getMessage(),
                    'url'     => $request->fullUrl(),
                ]);
                return response()->json(['message' => 'Terjadi kesalahan sistem. Silakan coba lagi.'], 500);
            }
        });
    })->create();
