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
            'phone' => ['required', 'string', 'regex:/^08[0-9]{8,11}$/'],
            'type'  => ['required', 'in:register,login,reset_password'],
        ]);

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

        if (in_array($data['type'], ['login', 'reset_password'])) {
            $exists = User::where('phone', $data['phone'])->exists();
            if (!$exists) {
                return response()->json(['message' => 'Nomor HP tidak ditemukan.'], 422);
            }
        }

        $otp = $this->otpService->send($data['phone'], $data['type']);

        $response = ['message' => 'Kode OTP telah dikirim. Berlaku 5 menit.'];

        // Mode demo: tampilkan OTP langsung di response (hanya saat local/tidak ada SMS gateway)
        // Tampilkan kode hanya jika OTP tidak terkirim via WA (mode demo/dev)
        if (app()->environment('local') && $otp->plain_code !== null) {
            $response['demo_otp'] = $otp->plain_code;
            $response['demo_note'] = 'Kode ini hanya muncul saat Fonnte belum dikonfigurasi';
        }

        return response()->json($response);
    }

    public function register(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name'          => ['required', 'string', 'max:100'],
            'phone'         => ['required', 'string', 'regex:/^08[0-9]{8,11}$/', 'unique:users,phone'],
            'otp'           => ['required', 'string', 'size:6'],
            'password'      => ['required', 'confirmed', Password::min(8)],
            'role'          => ['sometimes', 'in:pelanggan,mitra_motor,mitra_mobil'],
            'vehicle_plate' => ['required_if:role,mitra_motor', 'required_if:role,mitra_mobil', 'string', 'max:20'],
            'vehicle_brand' => ['sometimes', 'string', 'max:50'],
            'vehicle_year'  => ['sometimes', 'integer', 'min:2000', 'max:' . date('Y')],
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
            'phone'    => ['required', 'string', 'regex:/^08[0-9]{8,11}$/'],
            'otp'      => ['required', 'string', 'size:6'],
            'password' => ['required', 'confirmed', Password::min(6)],
        ]);

        $valid = $this->otpService->verify($data['phone'], $data['otp'], 'reset_password');
        if (!$valid) {
            return response()->json(['message' => 'Kode OTP tidak valid atau sudah kedaluwarsa.'], 422);
        }

        $user = User::where('phone', $data['phone'])->first();
        if (!$user) {
            return response()->json(['message' => 'Pengguna tidak ditemukan.'], 404);
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
