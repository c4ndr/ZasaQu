<?php

namespace App\Http\Controllers\Api;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;

class MonitorController extends Controller
{
    public function errors(Request $request): JsonResponse
    {
        // Validasi secret key agar endpoint tidak bisa diakses sembarangan
        $secret = config('services.monitor.secret');
        if (empty($secret) || $request->header('X-Monitor-Secret') !== $secret) {
            return response()->json(['message' => 'Unauthorized'], 401);
        }

        $logFile = storage_path('logs/laravel.log');

        if (!file_exists($logFile)) {
            return response()->json(['errors' => [], 'count' => 0, 'checked_at' => now()->toIso8601String()]);
        }

        // Ambil 500 baris terakhir dari log
        $lines = $this->tailFile($logFile, 500);

        // Filter baris ERROR dan CRITICAL dalam 10 menit terakhir
        $since   = now()->subMinutes(10);
        $errors  = [];
        $current = null;

        foreach ($lines as $line) {
            // Deteksi baris baru dengan timestamp Laravel: [YYYY-MM-DD HH:MM:SS]
            if (preg_match('/^\[(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2})\].*\.(ERROR|CRITICAL|ALERT|EMERGENCY)/', $line, $m)) {
                // Simpan error sebelumnya jika ada
                if ($current) $errors[] = $current;

                $timestamp = \Carbon\Carbon::parse($m[1]);
                if ($timestamp->lt($since)) {
                    $current = null;
                    continue;
                }

                $current = [
                    'level'   => $m[2],
                    'time'    => $timestamp->toIso8601String(),
                    'message' => trim($line),
                ];
            } elseif ($current && !empty(trim($line))) {
                // Sambung stack trace ke error sebelumnya (maks 300 karakter)
                $current['message'] .= "\n" . trim($line);
                if (strlen($current['message']) > 800) {
                    $current['message'] = substr($current['message'], 0, 800) . '...';
                }
            }
        }
        if ($current) $errors[] = $current;

        // Ambil 10 error terbaru saja agar pesan Telegram tidak terlalu panjang
        $errors = array_slice(array_reverse($errors), 0, 10);

        return response()->json([
            'errors'     => $errors,
            'count'      => count($errors),
            'checked_at' => now()->toIso8601String(),
        ]);
    }

    public function dailyRevenue(Request $request): JsonResponse
    {
        $secret = config('services.monitor.secret');
        if (empty($secret) || $request->header('X-Monitor-Secret') !== $secret) {
            return response()->json(['message' => 'Unauthorized'], 401);
        }

        $today     = now()->startOfDay();
        $yesterday = now()->subDay()->startOfDay();
        $date      = $request->query('date', 'today');
        $start     = $date === 'yesterday' ? $yesterday : $today;
        $end       = $start->copy()->endOfDay();

        // Revenue per modul (platform_commission = pendapatan platform)
        $revenuePerModul = \DB::table('wallet_transactions')
            ->whereIn('type', ['platform_commission', 'order_payment', 'mart_payment'])
            ->where('status', 'completed')
            ->whereBetween('created_at', [$start, $end])
            ->selectRaw('service_module, SUM(amount) as total, COUNT(*) as transaksi')
            ->groupBy('service_module')
            ->get();

        // Total order selesai per modul
        $ordersSelesai = [
            'zasago'   => \DB::table('orders')->where('status', 'completed')->whereBetween('created_at', [$start, $end])->count(),
            'zasafood' => \DB::table('food_orders')->where('status', 'completed')->whereBetween('created_at', [$start, $end])->count(),
            'zasamart' => \DB::table('mart_orders')->where('status', 'completed')->whereBetween('created_at', [$start, $end])->count(),
            'zasaride' => \DB::table('ride_orders')->where('status', 'completed')->whereBetween('created_at', [$start, $end])->count(),
        ];

        // Total order dibatalkan
        $ordersBatal = [
            'zasago'   => \DB::table('orders')->where('status', 'cancelled')->whereBetween('created_at', [$start, $end])->count(),
            'zasafood' => \DB::table('food_orders')->where('status', 'cancelled')->whereBetween('created_at', [$start, $end])->count(),
            'zasamart' => \DB::table('mart_orders')->where('status', 'cancelled')->whereBetween('created_at', [$start, $end])->count(),
            'zasaride' => \DB::table('ride_orders')->where('status', 'cancelled')->whereBetween('created_at', [$start, $end])->count(),
        ];

        // Pengguna baru
        $userBaru = \DB::table('users')
            ->where('role', 'pelanggan')
            ->whereBetween('created_at', [$start, $end])
            ->count();

        // Mitra baru
        $mitraBaru = \DB::table('users')
            ->whereIn('role', ['mitra_motor', 'mitra_mobil'])
            ->whereBetween('created_at', [$start, $end])
            ->count();

        // Total topup
        $totalTopup = \DB::table('wallet_transactions')
            ->where('type', 'topup')
            ->where('status', 'completed')
            ->whereBetween('created_at', [$start, $end])
            ->sum('amount');

        $totalRevenue = $revenuePerModul->sum('total');

        return response()->json([
            'tanggal'        => $start->toDateString(),
            'total_revenue'  => (float) $totalRevenue,
            'revenue_modul'  => $revenuePerModul,
            'orders_selesai' => $ordersSelesai,
            'orders_batal'   => $ordersBatal,
            'user_baru'      => $userBaru,
            'mitra_baru'     => $mitraBaru,
            'total_topup'    => (float) $totalTopup,
            'checked_at'     => now()->toIso8601String(),
        ]);
    }

    public function stuckOrders(Request $request): JsonResponse
    {
        $secret = config('services.monitor.secret');
        if (empty($secret) || $request->header('X-Monitor-Secret') !== $secret) {
            return response()->json(['message' => 'Unauthorized'], 401);
        }

        $threshold = now()->subMinutes(10);
        $stuck     = [];

        // ZasaGo
        $rows = \DB::table('orders')
            ->where('status', 'pending')
            ->whereNull('mitra_id')
            ->where('created_at', '<=', $threshold)
            ->select('id', 'order_number', 'created_at')
            ->get();
        foreach ($rows as $r) {
            $stuck[] = ['modul' => 'ZasaGo', 'order_number' => $r->order_number, 'id' => $r->id, 'sejak' => $r->created_at];
        }

        // ZasaRide
        $rows = \DB::table('ride_orders')
            ->where('status', 'pending')
            ->whereNull('mitra_id')
            ->where('created_at', '<=', $threshold)
            ->select('id', 'order_number', 'created_at')
            ->get();
        foreach ($rows as $r) {
            $stuck[] = ['modul' => 'ZasaRide', 'order_number' => $r->order_number, 'id' => $r->id, 'sejak' => $r->created_at];
        }

        // ZasaFood
        $rows = \DB::table('food_orders')
            ->where('status', 'pending')
            ->whereNull('mitra_id')
            ->where('created_at', '<=', $threshold)
            ->select('id', 'order_number', 'created_at')
            ->get();
        foreach ($rows as $r) {
            $stuck[] = ['modul' => 'ZasaFood', 'order_number' => $r->order_number, 'id' => $r->id, 'sejak' => $r->created_at];
        }

        // ZasaShop
        $rows = \DB::table('mart_orders')
            ->where('status', 'pending')
            ->where('created_at', '<=', $threshold)
            ->select('id', 'order_number', 'created_at')
            ->get();
        foreach ($rows as $r) {
            $stuck[] = ['modul' => 'ZasaShop', 'order_number' => $r->order_number, 'id' => $r->id, 'sejak' => $r->created_at];
        }

        return response()->json([
            'stuck'      => $stuck,
            'count'      => count($stuck),
            'checked_at' => now()->toIso8601String(),
        ]);
    }

    private function tailFile(string $path, int $lines): array
    {
        $file   = new \SplFileObject($path, 'r');
        $file->seek(PHP_INT_MAX);
        $total  = $file->key();
        $start  = max(0, $total - $lines);
        $file->seek($start);

        $result = [];
        while (!$file->eof()) {
            $result[] = rtrim($file->fgets());
        }
        return $result;
    }
}
