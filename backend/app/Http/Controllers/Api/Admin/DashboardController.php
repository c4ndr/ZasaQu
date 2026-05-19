<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\TopUpRequest;
use App\Models\User;
use App\Models\Wallet;
use App\Models\WithdrawRequest;
use Illuminate\Http\JsonResponse;

class DashboardController extends Controller
{
    public function index(): JsonResponse
    {
        return response()->json([
            'users' => [
                'total'     => User::where('role', '!=', 'admin')->count(),
                'pelanggan' => User::where('role', 'pelanggan')->count(),
                'mitra'     => User::whereIn('role', ['mitra_motor', 'mitra_mobil'])->count(),
                'suspended' => User::where('status', 'suspended')->count(),
                'banned'    => User::where('status', 'banned')->count(),
            ],
            'wallet' => [
                'total_balance' => (float) Wallet::sum('balance'),
            ],
            'topup' => [
                'pending'      => TopUpRequest::where('status', 'pending')->count(),
                'today'        => TopUpRequest::where('status', 'confirmed')->whereDate('confirmed_at', today())->count(),
                'today_amount' => (float) TopUpRequest::where('status', 'confirmed')->whereDate('confirmed_at', today())->sum('amount'),
            ],
            'withdraw' => [
                'pending'      => WithdrawRequest::where('status', 'pending')->count(),
                'today'        => WithdrawRequest::where('status', 'completed')->whereDate('processed_at', today())->count(),
                'today_amount' => (float) WithdrawRequest::where('status', 'completed')->whereDate('processed_at', today())->sum('amount'),
            ],
        ]);
    }
}
