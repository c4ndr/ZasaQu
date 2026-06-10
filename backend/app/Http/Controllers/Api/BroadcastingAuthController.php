<?php

namespace App\Http\Controllers\Api;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Broadcast;

class BroadcastingAuthController extends \App\Http\Controllers\Controller
{
    public function authenticate(Request $request)
    {
        // BroadcastController default menggunakan $request->user() (web guard).
        // Di sini kita pastikan user dari Sanctum Bearer token di-set ke default guard
        // agar PusherBroadcaster::retrieveUser() bisa menemukannya.
        $user = $request->user('sanctum');
        if (! $user) {
            abort(403);
        }

        // Inject user ke request user resolver sehingga $request->user() mengembalikan user Sanctum
        $request->setUserResolver(fn() => $user);

        // Verifikasi channel authorization manual sebelum panggil Broadcast::auth
        $channelName = ltrim(preg_replace('/^(private|presence)-/', '', $request->channel_name), '-');

        return Broadcast::auth($request);
    }
}
