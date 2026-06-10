<?php

namespace App\Http\Controllers\Api;

use App\Services\AgoraToken;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;

class AgoraController extends Controller
{
    public function token(Request $request)
    {
        $request->validate([
            'channel_name' => 'required|string|max:64',
            'uid'          => 'required|integer|min:0',
        ]);

        $token = AgoraToken::buildRtcToken(
            config('services.agora.app_id'),
            config('services.agora.app_certificate'),
            $request->channel_name,
            (int) $request->uid,
            AgoraToken::ROLE_PUBLISHER,
            3600,  // token valid 1 jam
            3600   // privilege valid 1 jam
        );

        return response()->json(['token' => $token]);
    }
}
