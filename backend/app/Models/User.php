<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;
use App\Models\Rating;

class User extends Authenticatable
{
    use HasApiTokens, HasFactory, Notifiable, SoftDeletes;

    protected $fillable = [
        'name',
        'email',
        'phone',
        'address',
        'password',
        'role',
        'status',
        'email_verified_at',
        'phone_verified_at',
    ];

    protected $hidden = [
        'password',
        'remember_token',
        // phone ditampilkan agar user bisa lihat & edit nomornya sendiri
    ];

    protected function casts(): array
    {
        return [
            'email_verified_at'  => 'datetime',
            'phone_verified_at'  => 'datetime',
            'password'           => 'hashed',
        ];
    }

    public function wallet()
    {
        return $this->hasOne(Wallet::class);
    }

    public function mitraDetail()
    {
        return $this->hasOne(MitraDetail::class);
    }

    public function orders()
    {
        return $this->hasMany(Order::class, 'mitra_id');
    }

    public function customerOrders()
    {
        return $this->hasMany(Order::class, 'customer_id');
    }

    public function ratings()
    {
        return $this->hasMany(Rating::class, 'ratee_id');
    }

    public function givenRatings()
    {
        return $this->hasMany(Rating::class, 'rater_id');
    }

    public function isMitra(): bool
    {
        return in_array($this->role, ['mitra_motor', 'mitra_mobil']);
    }

    public function isAdmin(): bool
    {
        return $this->role === 'admin';
    }

    public function isActive(): bool
    {
        return $this->status === 'active';
    }
}
