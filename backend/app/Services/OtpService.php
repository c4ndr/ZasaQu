<?php

namespace App\Services;

use App\Models\OtpCode;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class OtpService
{
    const EXPIRY_MINUTES = 5;

    public function send(string $phone, string $type): OtpCode
    {
        // Batalkan OTP lama yang belum dipakai
        OtpCode::where('phone', $phone)
            ->where('type', $type)
            ->whereNull('used_at')
            ->delete();

        $code = str_pad(random_int(0, 999999), 6, '0', STR_PAD_LEFT);

        $otp = OtpCode::create([
            'phone'      => $phone,
            'code'       => $code,
            'type'       => $type,
            'expired_at' => now()->addMinutes(self::EXPIRY_MINUTES),
        ]);

        $sent = $this->sendWhatsapp($phone, $code, $type);

        if (!$sent) {
            // Fallback: log agar developer bisa lihat kode
            Log::info("OTP [{$type}] untuk {$phone}: {$code}");
        }

        // Simpan plain code agar controller bisa tampilkan di mode demo
        $otp->plain_code = $sent ? null : $code;

        return $otp;
    }

    // Kirim OTP via WhatsApp (Fonnte). Return true jika berhasil.
    private function sendWhatsapp(string $phone, string $code, string $type): bool
    {
        $token = config('services.fonnte.token');
        if (empty($token)) {
            return false;
        }

        $typeLabel = match ($type) {
            'register'       => 'Registrasi',
            'login'          => 'Login',
            'reset_password' => 'Reset Password',
            default          => 'Verifikasi',
        };

        $message = "Kode OTP ZasaQu untuk {$typeLabel}:\n\n"
                 . "*{$code}*\n\n"
                 . "Berlaku selama " . self::EXPIRY_MINUTES . " menit.\n"
                 . "Jangan bagikan kode ini ke siapapun.";

        try {
            $response = Http::timeout(10)
                ->withToken($token)
                ->post('https://api.fonnte.com/send', [
                    'target'  => $this->toInternational($phone),
                    'message' => $message,
                ]);

            if ($response->successful() && ($response->json('status') === true || $response->json('status') === 'true')) {
                return true;
            }

            Log::warning('Fonnte gagal kirim OTP', [
                'phone'    => $phone,
                'status'   => $response->status(),
                'response' => $response->json(),
            ]);

            return false;
        } catch (\Throwable $e) {
            Log::error('Fonnte exception: ' . $e->getMessage());
            return false;
        }
    }

    // Konversi 08xxx → 628xxx (format internasional Indonesia)
    private function toInternational(string $phone): string
    {
        if (str_starts_with($phone, '0')) {
            return '62' . substr($phone, 1);
        }
        return $phone;
    }

    public function verify(string $phone, string $code, string $type): bool
    {
        $otp = OtpCode::where('phone', $phone)
            ->where('code', $code)
            ->where('type', $type)
            ->whereNull('used_at')
            ->where('expired_at', '>', now())
            ->first();

        if (!$otp) {
            return false;
        }

        $otp->update(['used_at' => now()]);

        return true;
    }

    public function hasValidOtp(string $phone, string $type): bool
    {
        return OtpCode::where('phone', $phone)
            ->where('type', $type)
            ->whereNull('used_at')
            ->where('expired_at', '>', now())
            ->exists();
    }
}
