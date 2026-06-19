<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\FoodOrder;
use App\Models\HomeOrder;
use App\Models\MartOrder;
use App\Models\Order;
use App\Models\ServOrder;
use App\Models\TopUpRequest;
use App\Models\User;
use App\Models\Wallet;
use App\Models\WalletTransaction;
use App\Models\WithdrawRequest;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

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
                'total'       => Order::count() + FoodOrder::count() + MartOrder::count() + HomeOrder::count() + ServOrder::count(),
                'today'       => Order::whereDate('created_at', $today)->count()
                               + FoodOrder::whereDate('created_at', $today)->count()
                               + MartOrder::whereDate('created_at', $today)->count()
                               + HomeOrder::whereDate('created_at', $today)->count()
                               + ServOrder::whereDate('created_at', $today)->count(),
                'this_month'  => Order::where('created_at', '>=', $thisMonth)->count()
                               + FoodOrder::where('created_at', '>=', $thisMonth)->count()
                               + MartOrder::where('created_at', '>=', $thisMonth)->count()
                               + HomeOrder::where('created_at', '>=', $thisMonth)->count()
                               + ServOrder::where('created_at', '>=', $thisMonth)->count(),
                'active'      => Order::whereIn('status', ['accepted', 'on_pickup', 'picked_up', 'on_delivery'])->count()
                               + FoodOrder::whereIn('status', ['accepted', 'on_delivery'])->count()
                               + MartOrder::whereIn('status', ['accepted', 'processing', 'on_delivery'])->count()
                               + HomeOrder::whereIn('status', ['accepted', 'on_the_way', 'in_progress'])->count()
                               + ServOrder::whereIn('status', ['accepted', 'on_the_way', 'in_progress'])->count(),
                'completed'   => Order::where('status', 'completed')->count()
                               + FoodOrder::where('status', 'completed')->count()
                               + MartOrder::where('status', 'completed')->count()
                               + HomeOrder::where('status', 'completed')->count()
                               + ServOrder::where('status', 'completed')->count(),
                'cancelled'   => Order::where('status', 'cancelled')->count()
                               + FoodOrder::where('status', 'cancelled')->count()
                               + MartOrder::where('status', 'cancelled')->count()
                               + HomeOrder::where('status', 'cancelled')->count()
                               + ServOrder::where('status', 'cancelled')->count(),
                'jastip_total'=> Order::where('type', 'jastip')->count(),
            ],
            'revenue' => [
                'zasago_commission'     => (float) Order::where('status', 'completed')->sum('platform_commission'),
                'food_commission'       => (float) (FoodOrder::where('status', 'completed')->sum('platform_commission_food') + FoodOrder::where('status', 'completed')->sum('platform_commission_delivery')),
                'mart_commission'       => (float) MartOrder::where('status', 'completed')->sum('platform_commission'),
                'home_commission'       => (float) HomeOrder::where('status', 'completed')->sum('platform_commission'),
                'serv_commission'       => (float) ServOrder::where('status', 'completed')->sum('platform_commission'),
                'total_commission'      => (float) (
                    Order::where('status', 'completed')->sum('platform_commission') +
                    FoodOrder::where('status', 'completed')->sum('platform_commission_food') +
                    FoodOrder::where('status', 'completed')->sum('platform_commission_delivery') +
                    MartOrder::where('status', 'completed')->sum('platform_commission') +
                    HomeOrder::where('status', 'completed')->sum('platform_commission') +
                    ServOrder::where('status', 'completed')->sum('platform_commission')
                ),
                'commission_today'      => (float) (
                    Order::where('status', 'completed')->whereDate('completed_at', $today)->sum('platform_commission') +
                    FoodOrder::where('status', 'completed')->whereDate('completed_at', $today)->sum('platform_commission_food') +
                    FoodOrder::where('status', 'completed')->whereDate('completed_at', $today)->sum('platform_commission_delivery') +
                    MartOrder::where('status', 'completed')->whereDate('completed_at', $today)->sum('platform_commission') +
                    HomeOrder::where('status', 'completed')->whereDate('completed_at', $today)->sum('platform_commission') +
                    ServOrder::where('status', 'completed')->whereDate('completed_at', $today)->sum('platform_commission')
                ),
                'commission_this_month' => (float) (
                    Order::where('status', 'completed')->where('completed_at', '>=', $thisMonth)->sum('platform_commission') +
                    FoodOrder::where('status', 'completed')->where('completed_at', '>=', $thisMonth)->sum('platform_commission_food') +
                    FoodOrder::where('status', 'completed')->where('completed_at', '>=', $thisMonth)->sum('platform_commission_delivery') +
                    MartOrder::where('status', 'completed')->where('completed_at', '>=', $thisMonth)->sum('platform_commission') +
                    HomeOrder::where('status', 'completed')->where('completed_at', '>=', $thisMonth)->sum('platform_commission') +
                    ServOrder::where('status', 'completed')->where('completed_at', '>=', $thisMonth)->sum('platform_commission')
                ),
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

            $zasago = Order::whereDate('created_at', $date)->count();
            $food   = FoodOrder::whereDate('created_at', $date)->count();
            $mart   = MartOrder::whereDate('created_at', $date)->count();
            $home   = HomeOrder::whereDate('created_at', $date)->count();
            $serv   = ServOrder::whereDate('created_at', $date)->count();

            return [
                'date'   => $date->format('Y-m-d'),
                'label'  => $date->format('d/m'),
                'orders' => $zasago + $food + $mart + $home + $serv,
                'zasago' => $zasago,
                'food'   => $food,
                'mart'   => $mart,
                'home'   => $home,
                'serv'   => $serv,
            ];
        });

        return response()->json($trend);
    }

    public function commissionDetail(Request $request): JsonResponse
    {
        $period = $request->query('period', 'month');

        $from = match ($period) {
            'today' => today()->startOfDay(),
            'week'  => now()->startOfWeek(),
            'month' => now()->startOfMonth(),
            default => null,
        };

        $w = fn($q) => $from ? $q->where('completed_at', '>=', $from) : $q;

        // ── Per modul ────────────────────────────────────────────────────────────
        $zgQ    = $w(Order::where('status', 'completed'));
        $foodQ  = $w(FoodOrder::where('status', 'completed'));
        $martQ  = $w(MartOrder::where('status', 'completed'));
        $homeQ  = $w(HomeOrder::where('status', 'completed'));
        $servQ  = $w(ServOrder::where('status', 'completed'));

        $zgTotal    = (float) (clone $zgQ)->sum('platform_commission');
        $zgCount    = (int)   (clone $zgQ)->count();
        $zgCod      = (float) (clone $zgQ)->where('payment_method', 'cod')->sum('platform_commission');
        $zgWallet   = (float) (clone $zgQ)->where('payment_method', 'wallet')->sum('platform_commission');

        $foodTotal  = (float) ((clone $foodQ)->sum('platform_commission_food') + (clone $foodQ)->sum('platform_commission_delivery'));
        $foodCount  = (int)   (clone $foodQ)->count();

        $martTotal  = (float) (clone $martQ)->sum('platform_commission');
        $martCount  = (int)   (clone $martQ)->count();

        $homeTotal  = (float) (clone $homeQ)->sum('platform_commission');
        $homeCount  = (int)   (clone $homeQ)->count();

        $servTotal  = (float) (clone $servQ)->sum('platform_commission');
        $servCount  = (int)   (clone $servQ)->count();

        $grand = $zgTotal + $foodTotal + $martTotal + $homeTotal + $servTotal;

        $modules = [
            ['key'=>'zasago', 'label'=>'ZasaGo',   'emoji'=>'🏍️', 'color'=>'#00C896',
             'total'=>$zgTotal,   'count'=>$zgCount,   'avg'=>$zgCount>0   ? round($zgTotal/$zgCount)   : 0,
             'cod'=>$zgCod, 'wallet'=>$zgWallet],
            ['key'=>'food',   'label'=>'ZasaFood',  'emoji'=>'🍜', 'color'=>'#F97316',
             'total'=>$foodTotal, 'count'=>$foodCount, 'avg'=>$foodCount>0 ? round($foodTotal/$foodCount) : 0],
            ['key'=>'mart',   'label'=>'ZasaMart',  'emoji'=>'🛒', 'color'=>'#3B82F6',
             'total'=>$martTotal, 'count'=>$martCount, 'avg'=>$martCount>0 ? round($martTotal/$martCount) : 0],
            ['key'=>'home',   'label'=>'ZasaHome',  'emoji'=>'🏠', 'color'=>'#8B5CF6',
             'total'=>$homeTotal, 'count'=>$homeCount, 'avg'=>$homeCount>0 ? round($homeTotal/$homeCount) : 0],
            ['key'=>'serv',   'label'=>'ZasaServis', 'emoji'=>'🔧', 'color'=>'#059669',
             'total'=>$servTotal, 'count'=>$servCount, 'avg'=>$servCount>0 ? round($servTotal/$servCount) : 0],
        ];

        // ── Trend harian ─────────────────────────────────────────────────────────
        $days  = match ($period) { 'today' => 1, 'week' => 7, default => 30 };
        $trend = collect(range($days - 1, 0))->map(function ($i) {
            $d    = today()->subDays($i);
            $zg   = (float) Order::where('status','completed')->whereDate('completed_at',$d)->sum('platform_commission');
            $food = (float) (FoodOrder::where('status','completed')->whereDate('completed_at',$d)->sum('platform_commission_food')
                           + FoodOrder::where('status','completed')->whereDate('completed_at',$d)->sum('platform_commission_delivery'));
            $mart = (float) MartOrder::where('status','completed')->whereDate('completed_at',$d)->sum('platform_commission');
            $home = (float) HomeOrder::where('status','completed')->whereDate('completed_at',$d)->sum('platform_commission');
            $serv = (float) ServOrder::where('status','completed')->whereDate('completed_at',$d)->sum('platform_commission');
            return ['date'=>$d->format('Y-m-d'), 'label'=>$d->format('d/m'),
                    'zasago'=>$zg, 'food'=>$food, 'mart'=>$mart, 'home'=>$home, 'serv'=>$serv,
                    'total'=>$zg+$food+$mart+$home+$serv];
        });

        // ── Top mitra by commission ───────────────────────────────────────────────
        $topMitra = User::whereIn('role', ['mitra_motor','mitra_mobil'])
            ->select('id','name','role')
            ->withSum(['orders as comm_sum' => fn($q) =>
                $q->where('status','completed')->when($from, fn($q2) => $q2->where('completed_at','>=',$from))
            ], 'platform_commission')
            ->withCount(['orders as order_count' => fn($q) =>
                $q->where('status','completed')->when($from, fn($q2) => $q2->where('completed_at','>=',$from))
            ])
            ->having('comm_sum', '>', 0)
            ->orderByDesc('comm_sum')
            ->limit(8)
            ->get()
            ->map(fn($u) => ['id'=>$u->id,'name'=>$u->name,'role'=>$u->role,
                             'comm_sum'=>(float)$u->comm_sum,'order_count'=>(int)$u->order_count]);

        // ── Ringkasan periode sebelumnya (untuk perbandingan) ─────────────────────
        $prevFrom = match ($period) {
            'today' => today()->subDay()->startOfDay(),
            'week'  => now()->subWeek()->startOfWeek(),
            'month' => now()->subMonth()->startOfMonth(),
            default => null,
        };
        $prevTo = match ($period) {
            'today' => today()->subDay()->endOfDay(),
            'week'  => now()->subWeek()->endOfWeek(),
            'month' => now()->subMonth()->endOfMonth(),
            default => null,
        };
        $prevTotal = 0;
        if ($prevFrom && $prevTo) {
            $prevTotal = (float) (
                Order::where('status','completed')->whereBetween('completed_at',[$prevFrom,$prevTo])->sum('platform_commission') +
                FoodOrder::where('status','completed')->whereBetween('completed_at',[$prevFrom,$prevTo])->sum('platform_commission_food') +
                FoodOrder::where('status','completed')->whereBetween('completed_at',[$prevFrom,$prevTo])->sum('platform_commission_delivery') +
                MartOrder::where('status','completed')->whereBetween('completed_at',[$prevFrom,$prevTo])->sum('platform_commission') +
                HomeOrder::where('status','completed')->whereBetween('completed_at',[$prevFrom,$prevTo])->sum('platform_commission') +
                ServOrder::where('status','completed')->whereBetween('completed_at',[$prevFrom,$prevTo])->sum('platform_commission')
            );
        }

        return response()->json([
            'period'      => $period,
            'grand_total' => $grand,
            'prev_total'  => $prevTotal,
            'modules'     => $modules,
            'trend'       => $trend,
            'top_mitra'   => $topMitra,
        ]);
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
