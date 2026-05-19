<?php

namespace App\Services;

use App\Models\User;
use App\Models\Wallet;
use App\Models\MitraDetail;
use Illuminate\Support\Facades\Hash;

class AuthService
{
    public function registerEmail(array $data): User
    {
        $role   = $data['role'] ?? 'pelanggan';
        $isMitra = in_array($role, ['mitra_motor', 'mitra_mobil']);

        $user = User::create([
            'name'               => $data['name'],
            'email'              => $data['email'],
            'password'           => Hash::make($data['password']),
            'role'               => $role,
            // Mitra baru → pending review, pelanggan langsung aktif
            'status'             => $isMitra ? 'pending_review' : 'active',
            'email_verified_at'  => now(),
        ]);

        $this->createWallet($user);

        if ($user->isMitra()) {
            $this->createMitraDetail($user, $data);
        }

        return $user;
    }

    public function registerPhone(array $data): User
    {
        $role    = $data['role'] ?? 'pelanggan';
        $isMitra = in_array($role, ['mitra_motor', 'mitra_mobil']);

        $user = User::create([
            'name'              => $data['name'],
            'phone'             => $data['phone'],
            'password'          => Hash::make($data['password']),
            'role'              => $role,
            'status'            => $isMitra ? 'pending_review' : 'active',
            'phone_verified_at' => now(),
        ]);

        $this->createWallet($user);

        if ($user->isMitra()) {
            $this->createMitraDetail($user, $data);
        }

        return $user;
    }

    private function createWallet(User $user): void
    {
        if ($user->isAdmin()) return; // admin tidak punya wallet

        Wallet::create([
            'user_id' => $user->id,
            'balance' => 0,
        ]);
    }

    private function createMitraDetail(User $user, array $data): void
    {
        MitraDetail::create([
            'user_id'       => $user->id,
            'vehicle_plate' => $data['vehicle_plate'],
            'vehicle_brand' => $data['vehicle_brand'] ?? null,
            'vehicle_year'  => $data['vehicle_year'] ?? null,
            'mode'          => 'reguler',
            'badge'         => 'starter',
        ]);
    }

    public function createToken(User $user): string
    {
        return $user->createToken('zashago-app')->plainTextToken;
    }
}
