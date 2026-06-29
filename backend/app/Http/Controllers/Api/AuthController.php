<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Traits\CompressesImage;
use App\Models\User;
use App\Services\AuthService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Illuminate\Validation\Rules\Password;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    use CompressesImage;

    public function __construct(private AuthService $authService) {}

    public function register(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name'          => ['required', 'string', 'max:100'],
            'email'         => ['required', 'email', 'unique:users,email'],
            'password'      => ['required', 'confirmed', Password::min(8)],
            'role'          => ['sometimes', 'in:pelanggan,mitra_motor,mitra_mobil,merchant,home_provider,seller,serv_provider'],
            'address'       => ['required_if:role,pelanggan', 'nullable', 'string', 'max:255'],
            'vehicle_plate' => ['nullable', 'required_if:role,mitra_motor', 'required_if:role,mitra_mobil', 'string', 'max:20'],
            'vehicle_brand' => ['nullable', 'sometimes', 'string', 'max:50'],
            'vehicle_year'  => ['nullable', 'sometimes', 'integer', 'min:2000', 'max:' . date('Y')],
            // Merchant fields
            'shop_name'     => ['required_if:role,merchant', 'nullable', 'string', 'max:100'],
            'shop_category' => ['required_if:role,merchant', 'nullable', 'in:makanan_berat,minuman,snack,lainnya'],
            'shop_address'  => ['required_if:role,merchant', 'nullable', 'string', 'max:255'],
            'shop_phone'    => ['nullable', 'string', 'max:20'],
            'shop_lat'      => ['nullable', 'numeric', 'between:-90,90'],
            'shop_lng'      => ['nullable', 'numeric', 'between:-180,180'],
            // Home provider fields
            'provider_name'     => ['required_if:role,home_provider', 'nullable', 'string', 'max:100'],
            'provider_category' => ['required_if:role,home_provider', 'nullable', 'in:laundry,pijat,cleaning,tukang,cukur,lainnya'],
            'provider_address'  => ['required_if:role,home_provider', 'nullable', 'string', 'max:255'],
            'provider_phone'    => ['nullable', 'string', 'max:20'],
            'provider_lat'      => ['nullable', 'numeric', 'between:-90,90'],
            'provider_lng'      => ['nullable', 'numeric', 'between:-180,180'],
            // Serv provider fields
            'serv_name'     => ['required_if:role,serv_provider', 'nullable', 'string', 'max:100'],
            'serv_category' => ['required_if:role,serv_provider', 'nullable', 'in:ac,elektronik,listrik,air,bangunan,jahit,cctv,lainnya'],
            'serv_address'  => ['required_if:role,serv_provider', 'nullable', 'string', 'max:255'],
            'serv_phone'    => ['nullable', 'string', 'max:20'],
            'serv_lat'      => ['nullable', 'numeric', 'between:-90,90'],
            'serv_lng'      => ['nullable', 'numeric', 'between:-180,180'],
            // Seller fields
            'seller_name'    => ['required_if:role,seller', 'nullable', 'string', 'max:100'],
            'seller_address' => ['required_if:role,seller', 'nullable', 'string', 'max:255'],
            'seller_phone'   => ['nullable', 'string', 'max:20'],
            'seller_lat'     => ['nullable', 'numeric', 'between:-90,90'],
            'seller_lng'     => ['nullable', 'numeric', 'between:-180,180'],
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

        if ($user->isPendingReview()) {
            // Mitra pending_review boleh login — frontend redirect ke onboarding
            $token = $this->authService->createToken($user);
            return response()->json([
                'message' => 'Login berhasil. Akun Anda sedang dalam proses verifikasi.',
                'user'    => $user->load('wallet', 'mitraDetail'),
                'token'   => $token,
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

    public function uploadPhoto(Request $request): JsonResponse
    {
        $request->validate([
            'photo' => ['required', 'image', 'max:5120', 'mimes:jpg,jpeg,png,webp'],
        ]);

        $user = $request->user();

        if ($user->photo_path) {
            \Illuminate\Support\Facades\Storage::disk('public')->delete($user->photo_path);
        }

        $path = $this->compressAndStore($request->file('photo'), 'user-photos', Str::random(40) . '.jpg', 800, 800);
        $user->update(['photo_path' => $path]);

        return response()->json([
            'message'   => 'Foto profil berhasil diperbarui.',
            'photo_url' => $user->fresh()->photo_url,
        ]);
    }

    public function uploadPhotoBase64(Request $request): JsonResponse
    {
        $data = $request->validate([
            'data' => ['required', 'string'],
            'mime' => ['required', 'string', 'in:image/jpeg,image/png,image/webp,image/gif'],
        ]);

        $user   = $request->user();
        $binary = base64_decode(preg_replace('/^data:image\/\w+;base64,/', '', $data['data']), true);

        if ($binary === false || strlen($binary) > 5242880) {
            return response()->json(['message' => 'Ukuran file terlalu besar (maks 5MB).'], 422);
        }

        if ($user->photo_path) {
            \Illuminate\Support\Facades\Storage::disk('public')->delete($user->photo_path);
        }

        $path = $this->compressBinaryAndStore($binary, $data['mime'], 'user-photos', Str::random(40) . '.jpg', 800, 800);
        $user->update(['photo_path' => $path]);

        return response()->json([
            'message'   => 'Foto profil berhasil diperbarui.',
            'photo_url' => $user->fresh()->photo_url,
        ]);
    }

    public function saveAvatarPreset(Request $request): JsonResponse
    {
        $data = $request->validate([
            'emoji' => ['required', 'string', 'max:10'],
            'color' => ['required', 'string', 'regex:/^#[0-9A-Fa-f]{6}$/'],
        ]);

        $user = $request->user();

        \Illuminate\Support\Facades\DB::transaction(function () use ($user, $data) {
            if ($user->photo_path) {
                \Illuminate\Support\Facades\Storage::disk('public')->delete($user->photo_path);
            }
            $user->update([
                'avatar_preset' => $data['emoji'] . '|' . $data['color'],
                'photo_path'    => null,
            ]);
        });

        return response()->json([
            'message'       => 'Avatar berhasil diperbarui.',
            'avatar_preset' => $user->fresh()->avatar_preset,
            'photo_url'     => null,
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

    public function deleteAccount(Request $request): JsonResponse
    {
        $data = $request->validate([
            'password' => ['required'],
        ]);

        $user = $request->user();

        if (!Hash::check($data['password'], $user->password)) {
            return response()->json(['message' => 'Password tidak sesuai.'], 422);
        }

        if ($user->wallet && $user->wallet->balance > 0) {
            return response()->json([
                'message' => 'Saldo dompet Anda masih Rp' . number_format($user->wallet->balance, 0, ',', '.') . '. Tarik saldo terlebih dahulu sebelum menutup akun.',
            ], 422);
        }

        // Anonimisasi data — riwayat order tetap ada untuk keperluan keuangan
        $user->tokens()->delete();
        $user->update([
            'name'      => 'Pengguna Dihapus',
            'email'     => 'deleted_' . $user->id . '_' . time() . '@zasaqu.invalid',
            'phone'     => null,
            'address'   => null,
            'fcm_token' => null,
            'status'    => 'banned',
            'password'  => Hash::make(\Illuminate\Support\Str::random(32)),
        ]);

        return response()->json(['message' => 'Akun berhasil dihapus.']);
    }
}
