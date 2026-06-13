<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Services\AuthService;
use App\Services\OtpService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rules\Password;

class OtpController extends Controller
{
    public function __construct(
        private OtpService $otpService,
        private AuthService $authService,
    ) {}

    public function sendOtp(Request $request): JsonResponse
    {
        $data = $request->validate([
            'phone' => ['nullable', 'string', 'regex:/^08[0-9]{8,11}$/'],
            'email' => ['nullable', 'email'],
            'type'  => ['required', 'in:register,login,reset_password'],
        ]);

        // reset_password boleh pakai email saja (tanpa phone)
        if ($data['type'] === 'reset_password' && empty($data['phone'])) {
            if (empty($data['email'])) {
                return response()->json(['message' => 'Email harus diisi untuk reset password.'], 422);
            }
            $user = User::where('email', $data['email'])->first();
            if (!$user) {
                return response()->json(['message' => 'Email tidak ditemukan.'], 422);
            }
            $data['phone'] = $user->phone;
        }

        if (empty($data['phone'])) {
            return response()->json(['message' => 'Nomor HP harus diisi.'], 422);
        }

        // Rate limiting: max 3 OTP per nomor per jam
        $rateLimitKey = 'otp_rate:' . $data['phone'];
        $attempts     = (int) Cache::get($rateLimitKey, 0);
        if ($attempts >= 3) {
            return response()->json([
                'message' => 'Terlalu banyak permintaan OTP. Coba lagi dalam 1 jam.',
            ], 429);
        }
        Cache::put($rateLimitKey, $attempts + 1, now()->addHour());

        if ($data['type'] === 'register') {
            $exists = User::where('phone', $data['phone'])->exists();
            if ($exists) {
                return response()->json(['message' => 'Nomor HP sudah terdaftar.'], 422);
            }
        }

        // Cari email user untuk OTP
        $email = $data['email'] ?? null;
        if (in_array($data['type'], ['login', 'reset_password'])) {
            $user = User::where('phone', $data['phone'])->first();
            if (!$user) {
                return response()->json(['message' => 'Nomor HP tidak ditemukan.'], 422);
            }
            $email = $user->email;
        }

        $otp = $this->otpService->send($data['phone'], $data['type'], $email);

        if ($otp->plain_code !== null) {
            // OTP sudah di-log di OtpService::send() — jangan expose ke client
            return response()->json([
                'message' => 'Gagal mengirim OTP. Hubungi admin untuk mendapatkan kode.',
            ], 503);
        }

        $via = $email ? "Email ({$email})" : 'WhatsApp';
        return response()->json(['message' => "Kode OTP telah dikirim via {$via}. Berlaku 5 menit."]);
    }

    public function register(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name'          => ['required', 'string', 'max:100'],
            'phone'         => ['required', 'string', 'regex:/^08[0-9]{8,11}$/', 'unique:users,phone'],
            'otp'           => ['required', 'string', 'size:6'],
            'password'      => ['required', 'confirmed', Password::min(8)],
            'role'              => ['sometimes', 'in:pelanggan,mitra_motor,mitra_mobil,merchant,home_provider'],
            'address'           => ['required_if:role,pelanggan', 'nullable', 'string', 'max:255'],
            'vehicle_plate'     => ['required_if:role,mitra_motor', 'required_if:role,mitra_mobil', 'string', 'max:20'],
            'vehicle_brand'     => ['sometimes', 'string', 'max:50'],
            'vehicle_year'      => ['sometimes', 'integer', 'min:2000', 'max:' . date('Y')],
            // Merchant
            'shop_name'         => ['required_if:role,merchant', 'nullable', 'string', 'max:100'],
            'shop_category'     => ['required_if:role,merchant', 'nullable', 'in:makanan_berat,minuman,snack,lainnya'],
            'shop_address'      => ['required_if:role,merchant', 'nullable', 'string', 'max:255'],
            'shop_phone'        => ['nullable', 'string', 'max:20'],
            // Home provider
            'provider_name'     => ['required_if:role,home_provider', 'nullable', 'string', 'max:100'],
            'provider_category' => ['required_if:role,home_provider', 'nullable', 'in:laundry,pijat,cleaning,tukang,lainnya'],
            'provider_address'  => ['required_if:role,home_provider', 'nullable', 'string', 'max:255'],
            'provider_phone'    => ['nullable', 'string', 'max:20'],
        ]);

        $valid = $this->otpService->verify($data['phone'], $data['otp'], 'register');
        if (!$valid) {
            return response()->json(['message' => 'Kode OTP tidak valid atau sudah kedaluwarsa.'], 422);
        }

        $user = $this->authService->registerPhone($data);
        $token = $this->authService->createToken($user);

        return response()->json([
            'message' => 'Registrasi berhasil',
            'user'    => $user->load('wallet', 'mitraDetail'),
            'token'   => $token,
        ], 201);
    }

    public function resetPassword(Request $request): JsonResponse
    {
        $data = $request->validate([
            'phone'    => ['nullable', 'string', 'regex:/^08[0-9]{8,11}$/'],
            'email'    => ['nullable', 'email'],
            'otp'      => ['required', 'string', 'size:6'],
            'password' => ['required', 'confirmed', Password::min(6)],
        ]);

        // Cari user: bisa via email atau phone
        $user = null;
        if (!empty($data['email'])) {
            $user = User::where('email', $data['email'])->first();
        } elseif (!empty($data['phone'])) {
            $user = User::where('phone', $data['phone'])->first();
        }

        if (!$user) {
            return response()->json(['message' => 'Pengguna tidak ditemukan.'], 404);
        }

        $valid = $this->otpService->verify($user->phone, $data['otp'], 'reset_password');
        if (!$valid) {
            return response()->json(['message' => 'Kode OTP tidak valid atau sudah kedaluwarsa.'], 422);
        }

        $user->update(['password' => Hash::make($data['password'])]);
        $user->tokens()->delete();

        return response()->json(['message' => 'Password berhasil direset. Silakan login kembali.']);
    }

    public function login(Request $request): JsonResponse
    {
        $data = $request->validate([
            'phone' => ['required', 'string', 'regex:/^08[0-9]{8,11}$/'],
            'otp'   => ['required', 'string', 'size:6'],
        ]);

        $valid = $this->otpService->verify($data['phone'], $data['otp'], 'login');
        if (!$valid) {
            return response()->json(['message' => 'Kode OTP tidak valid atau sudah kedaluwarsa.'], 422);
        }

        $user = User::where('phone', $data['phone'])->first();

        if (!$user->isActive()) {
            return response()->json([
                'message' => 'Akun Anda ' . $user->status . '. Hubungi admin untuk informasi lebih lanjut.',
            ], 403);
        }

        $user->tokens()->delete();
        $token = $this->authService->createToken($user);

        return response()->json([
            'message' => 'Login berhasil',
            'user'    => $user->load('wallet', 'mitraDetail'),
            'token'   => $token,
        ]);
    }
}
