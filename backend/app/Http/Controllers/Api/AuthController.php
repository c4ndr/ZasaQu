<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Services\AuthService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rules\Password;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    public function __construct(private AuthService $authService) {}

    public function register(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name'          => ['required', 'string', 'max:100'],
            'email'         => ['required', 'email', 'unique:users,email'],
            'password'      => ['required', 'confirmed', Password::min(8)],
            'role'          => ['sometimes', 'in:pelanggan,mitra_motor,mitra_mobil'],
            'vehicle_plate' => ['nullable', 'required_if:role,mitra_motor', 'required_if:role,mitra_mobil', 'string', 'max:20'],
            'vehicle_brand' => ['nullable', 'sometimes', 'string', 'max:50'],
            'vehicle_year'  => ['nullable', 'sometimes', 'integer', 'min:2000', 'max:' . date('Y')],
        ]);

        $user = $this->authService->registerEmail($data);
        $token = $this->authService->createToken($user);

        return response()->json([
            'message' => 'Registrasi berhasil',
            'user'    => $user->load('wallet', 'mitraDetail'),
            'token'   => $token,
        ], 201);
    }

    public function login(Request $request): JsonResponse
    {
        $data = $request->validate([
            'email'    => ['required', 'email'],
            'password' => ['required'],
        ]);

        $user = User::where('email', $data['email'])->first();

        if (!$user || !Hash::check($data['password'], $user->password)) {
            throw ValidationException::withMessages([
                'email' => ['Email atau password salah.'],
            ]);
        }

        if (!$user->isActive()) {
            return response()->json([
                'message' => 'Akun Anda ' . $user->status . '. Hubungi admin untuk informasi lebih lanjut.',
            ], 403);
        }

        $user->tokens()->delete(); // hapus token lama
        $token = $this->authService->createToken($user);

        return response()->json([
            'message' => 'Login berhasil',
            'user'    => $user->load('wallet', 'mitraDetail'),
            'token'   => $token,
        ]);
    }

    public function logout(Request $request): JsonResponse
    {
        $request->user()->currentAccessToken()->delete();

        return response()->json(['message' => 'Logout berhasil']);
    }

    public function me(Request $request): JsonResponse
    {
        return response()->json([
            'user' => $request->user()->load('wallet', 'mitraDetail'),
        ]);
    }

    public function updateProfile(Request $request): JsonResponse
    {
        $user = $request->user();

        $data = $request->validate([
            'name'    => ['sometimes', 'string', 'max:100'],
            'phone'   => ['sometimes', 'nullable', 'string', 'max:20',
                          'unique:users,phone,' . $user->id],
            'email'   => ['sometimes', 'email', 'max:100',
                          'unique:users,email,' . $user->id],
            'address' => ['sometimes', 'nullable', 'string', 'max:255'],
            // Kendaraan mitra
            'vehicle_plate' => ['sometimes', 'nullable', 'string', 'max:20'],
            'vehicle_brand' => ['sometimes', 'nullable', 'string', 'max:50'],
            'vehicle_year'  => ['sometimes', 'nullable', 'integer', 'min:2000', 'max:' . date('Y')],
        ]);

        // Update field user
        $userFields = array_intersect_key($data, array_flip(['name', 'phone', 'email', 'address']));
        if (!empty($userFields)) {
            $user->update($userFields);
        }

        // Update kendaraan mitra
        $mitraFields = array_intersect_key($data, array_flip(['vehicle_plate', 'vehicle_brand', 'vehicle_year']));
        if (!empty($mitraFields) && $user->isMitra()) {
            $user->mitraDetail()->updateOrCreate(
                ['user_id' => $user->id],
                $mitraFields
            );
        }

        return response()->json([
            'message' => 'Profil berhasil diperbarui.',
            'user'    => $user->fresh()->load('wallet', 'mitraDetail'),
        ]);
    }

    public function saveFcmToken(Request $request): JsonResponse
    {
        $data = $request->validate(['fcm_token' => ['required', 'string', 'max:500']]);
        $request->user()->update(['fcm_token' => $data['fcm_token']]);
        return response()->json(['message' => 'FCM token tersimpan.']);
    }

    public function changePassword(Request $request): JsonResponse
    {
        $data = $request->validate([
            'current_password'      => ['required'],
            'new_password'          => ['required', 'confirmed', Password::min(6)],
        ]);

        if (!Hash::check($data['current_password'], $request->user()->password)) {
            return response()->json(['message' => 'Password lama tidak sesuai.'], 422);
        }

        $request->user()->update(['password' => Hash::make($data['new_password'])]);

        return response()->json(['message' => 'Password berhasil diubah.']);
    }
}
