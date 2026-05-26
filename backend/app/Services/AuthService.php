<?php

namespace App\Services;

use App\Models\FoodMerchant;
use App\Models\HomeProvider;
use App\Models\MitraDetail;
use App\Models\User;
use App\Models\Wallet;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class AuthService
{
    public function registerEmail(array $data): User
    {
        $role    = $data['role'] ?? 'pelanggan';
        $isMitra = in_array($role, ['mitra_motor', 'mitra_mobil']);

        $user = User::create([
            'name'              => $data['name'],
            'email'             => $data['email'],
            'password'          => Hash::make($data['password']),
            'role'              => $role,
            'status'            => $isMitra ? 'pending_review' : 'active',
            'email_verified_at' => now(),
        ]);

        $this->createWallet($user);

        if ($user->isMitra()) {
            $this->createMitraDetail($user, $data);
        }

        if ($role === 'merchant') {
            $this->createMerchant($user, $data);
        }

        if ($role === 'home_provider') {
            $this->createHomeProvider($user, $data);
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

        if ($role === 'merchant') {
            $this->createMerchant($user, $data);
        }

        if ($role === 'home_provider') {
            $this->createHomeProvider($user, $data);
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

    private function createMerchant(User $user, array $data): void
    {
        $name = $data['shop_name'];
        FoodMerchant::create([
            'user_id'              => $user->id,
            'name'                 => $name,
            'slug'                 => Str::slug($name) . '-' . Str::random(6),
            'category'             => $data['shop_category'] ?? 'lainnya',
            'address'              => $data['shop_address'] ?? '',
            'lat'                  => $data['shop_lat'] ?? null,
            'lng'                  => $data['shop_lng'] ?? null,
            'phone'                => $data['shop_phone'] ?? null,
            'avg_prep_time_minutes'=> 20,
            'status'               => 'pending',
            'is_open'              => false,
        ]);
    }

    private function createHomeProvider(User $user, array $data): void
    {
        $name = $data['provider_name'];
        HomeProvider::create([
            'user_id'  => $user->id,
            'name'     => $name,
            'slug'     => Str::slug($name) . '-' . Str::random(6),
            'category' => $data['provider_category'] ?? 'laundry',
            'address'  => $data['provider_address'] ?? '',
            'lat'      => $data['provider_lat'] ?? null,
            'lng'      => $data['provider_lng'] ?? null,
            'phone'    => $data['provider_phone'] ?? null,
            'status'   => 'pending',
            'is_open'  => false,
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
