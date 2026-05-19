<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Models\TopUpRequest;
use App\Models\User;
use App\Models\Wallet;
use App\Models\WalletTransaction;
use App\Models\WithdrawRequest;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class StatController extends Controller
{
    public function overview(): JsonResponse
    {
        $today     = today();
        $thisMonth = now()->startOfMonth();
        $last7days = now()->subDays(7);

        return response()->json([
            'users' => [
                'total'     => User::where('role', '!=', 'admin')->count(),
                'pelanggan' => User::where('role', 'pelanggan')->count(),
                'mitra'     => User::whereIn('role', ['mitra_motor', 'mitra_mobil'])->count(),
                'new_today' => User::whereDate('created_at', $today)->count(),
                'suspended' => User::where('status', 'suspended')->count(),
                'banned'    => User::where('status', 'banned')->count(),
            ],
            'orders' => [
                'total'       => Order::count(),
                'today'       => Order::whereDate('created_at', $today)->count(),
                'this_month'  => Order::where('created_at', '>=', $thisMonth)->count(),
                'pending'     => Order::where('status', 'pending')->count(),
                'active'      => Order::whereIn('status', ['accepted', 'on_pickup', 'picked_up', 'on_delivery'])->count(),
                'completed'   => Order::where('status', 'completed')->count(),
                'cancelled'   => Order::where('status', 'cancelled')->count(),
                'jastip_total'=> Order::where('type', 'jastip')->count(),
            ],
            'revenue' => [
                'total'                  => (float) Order::where('status', 'completed')->sum('platform_commission'),
                'total_commission'       => (float) Order::where('status', 'completed')->sum('platform_commission'),
                'commission_today'       => (float) Order::where('status', 'completed')->whereDate('completed_at', $today)->sum('platform_commission'),
                'commission_this_month'  => (float) Order::where('status', 'completed')->where('completed_at', '>=', $thisMonth)->sum('platform_commission'),
            ],
            'topup' => [
                'pending'       => TopUpRequest::where('status', 'pending')->count(),
                'today_amount'  => (float) TopUpRequest::where('status', 'confirmed')->whereDate('confirmed_at', $today)->sum('amount'),
                'month_amount'  => (float) TopUpRequest::where('status', 'confirmed')->where('confirmed_at', '>=', $thisMonth)->sum('amount'),
            ],
            'withdraw' => [
                'pending'       => WithdrawRequest::where('status', 'pending')->count(),
                'today_amount'  => (float) WithdrawRequest::where('status', 'completed')->whereDate('processed_at', $today)->sum('amount'),
                'month_amount'  => (float) WithdrawRequest::where('status', 'completed')->where('processed_at', '>=', $thisMonth)->sum('amount'),
            ],
            'wallet' => [
                'total_balance' => (float) Wallet::sum('balance'),
            ],
        ]);
    }

    public function orderTrend(Request $request): JsonResponse
    {
        $days = (int) ($request->query('days', 7));
        $days = min($days, 30);

        $trend = collect(range($days - 1, 0))->map(function ($i) {
            $date = today()->subDays($i);
            return [
                'date'      => $date->format('Y-m-d'),
                'label'     => $date->format('d/m'),
                'orders'    => Order::whereDate('created_at', $date)->count(),
                'completed' => Order::whereDate('completed_at', $date)->count(),
                'revenue'   => (float) Order::where('status', 'completed')->whereDate('completed_at', $date)->sum('platform_commission'),
            ];
        });

        return response()->json($trend);
    }

    public function topMitra(): JsonResponse
    {
        $mitra = User::whereIn('role', ['mitra_motor', 'mitra_mobil'])
            ->with('mitraDetail')
            ->withCount(['orders as completed_orders' => fn($q) => $q->where('status', 'completed')])
            ->withAvg(['ratings as avg_rating_calc' => fn($q) => $q->where('rater_role', 'customer')], 'score')
            ->orderByDesc('completed_orders')
            ->limit(10)
            ->get()
            ->map(fn($u) => [
                'id'                 => $u->id,
                'name'               => $u->name,
                'role'               => $u->role,
                'badge'              => $u->mitraDetail?->badge,
                'is_online'          => (bool) $u->mitraDetail?->is_online,
                'total_transactions' => $u->mitraDetail?->total_transactions ?? 0,
                'avg_rating'         => $u->avg_rating_calc ? round((float) $u->avg_rating_calc, 2) : null,
                'completed_orders'   => $u->completed_orders,
            ]);

        return response()->json($mitra);
    }
}
