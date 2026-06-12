<?php

namespace App\Services;

use App\Models\OtpCode;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;

class OtpService
{
    const EXPIRY_MINUTES = 5;

    public function send(string $phone, string $type, ?string $email = null): OtpCode
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

        // Fallback: kirim via email jika WA gagal
        if (!$sent && $email) {
            $sent = $this->sendEmail($email, $code, $type);
        }

        if (!$sent) {
            Log::info("OTP [{$type}] untuk {$phone}: {$code}");
        }

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
                ->withHeaders(['Authorization' => $token])
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

    // Fallback: kirim OTP via Email (Gmail SMTP)
    private function sendEmail(string $email, string $code, string $type): bool
    {
        $typeLabel = match ($type) {
            'register'       => 'Registrasi',
            'login'          => 'Login',
            'reset_password' => 'Reset Password',
            default          => 'Verifikasi',
        };

        try {
            Mail::raw(
                "Kode OTP ZasaQu untuk {$typeLabel}: {$code}\n\n"
                . "Berlaku selama " . self::EXPIRY_MINUTES . " menit.\n"
                . "Jangan bagikan kode ini ke siapapun.",
                function ($m) use ($email, $typeLabel, $code) {
                    $m->to($email)
                      ->subject("[ZasaQu] Kode OTP {$typeLabel}: {$code}");
                }
            );
            return true;
        } catch (\Throwable $e) {
            Log::error('Email OTP gagal: ' . $e->getMessage());
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
