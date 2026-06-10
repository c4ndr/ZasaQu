<?php

namespace App\Services;

/**
 * Agora AccessToken2 — porting resmi dari
 * https://github.com/AgoraIO/Tools/tree/master/DynamicKey/AgoraDynamicKey/php
 * Digabung menjadi satu file agar tidak butuh require_once relatif.
 */
class AgoraToken
{
    const ROLE_PUBLISHER  = 1;
    const ROLE_SUBSCRIBER = 2;

    // ─── Util ────────────────────────────────────────────────────────────────────

    private static function packUint16(int $x): string { return pack('v', $x); }
    private static function packUint32(int $x): string { return pack('V', $x); }

    private static function packString(string $str): string
    {
        return self::packUint16(strlen($str)) . $str;
    }

    private static function packMapUint32(array $arr): string
    {
        ksort($arr);
        $kv = '';
        foreach ($arr as $key => $val) {
            $kv .= self::packUint16($key) . self::packUint32($val);
        }
        return self::packUint16(count($arr)) . $kv;
    }

    // ─── Token builder ───────────────────────────────────────────────────────────

    public static function buildRtcToken(
        string $appId,
        string $appCertificate,
        string $channelName,
        int    $uid,
        int    $role        = self::ROLE_PUBLISHER,
        int    $tokenExpire = 3600,
        int    $privExpire  = 0
    ): string {
        if (strlen($appId) !== 32 || strlen($appCertificate) !== 32) {
            return '';
        }

        $issueTs = time();
        $salt    = rand(1, 99999999);
        $account = $uid !== 0 ? (string) $uid : '';
        $expire  = $privExpire > 0 ? $privExpire : $tokenExpire;

        // Signing key — same as official getSign()
        $hh      = hash_hmac('sha256', $appCertificate, self::packUint32($issueTs), true);
        $signing = hash_hmac('sha256', $hh,             self::packUint32($salt),    true);

        // Privileges
        $privileges = [1 => $expire]; // JOIN_CHANNEL
        if ($role === self::ROLE_PUBLISHER) {
            $privileges[2] = $expire; // PUBLISH_AUDIO
            $privileges[3] = $expire; // PUBLISH_VIDEO
            $privileges[4] = $expire; // PUBLISH_DATA
        }

        // Service RTC pack: type + privileges + channelName + uid  (official order)
        $svc  = self::packUint16(1);                        // service type = 1 (RTC)
        $svc .= self::packMapUint32($privileges);           // count(uint16) + pairs(uint16+uint32)
        $svc .= self::packString($channelName);
        $svc .= self::packString($account);

        // Full message
        $data  = self::packString($appId);
        $data .= self::packUint32($issueTs);
        $data .= self::packUint32($tokenExpire);
        $data .= self::packUint32($salt);
        $data .= self::packUint16(1);                       // services count = 1
        $data .= $svc;

        $signature = hash_hmac('sha256', $data, $signing, true);

        // packString(signature) + data, then raw deflate (ZLIB_ENCODING_DEFLATE)
        $payload    = self::packString($signature) . $data;
        $compressed = zlib_encode($payload, ZLIB_ENCODING_DEFLATE);

        return '007' . base64_encode($compressed);
    }
}
