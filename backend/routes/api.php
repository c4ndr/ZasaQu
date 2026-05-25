<?php

use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\OtpController;
use App\Http\Controllers\Api\TopUpController;
use App\Http\Controllers\Api\WalletController;
use App\Http\Controllers\Api\WithdrawController;
use App\Http\Controllers\Api\OrderController;
use App\Http\Controllers\Api\OrderPhotoController;
use App\Http\Controllers\Api\JastipController;
use App\Http\Controllers\Api\Mitra\OnboardingController as MitraOnboardingController;
use App\Http\Controllers\Api\Mitra\OrderController as MitraOrderController;
use App\Http\Controllers\Api\Mitra\GpsController;
use App\Http\Controllers\Api\ChatController;
use App\Http\Controllers\Api\Admin\TopUpController as AdminTopUpController;
use App\Http\Controllers\Api\Admin\WithdrawController as AdminWithdrawController;
use App\Http\Controllers\Api\Admin\DashboardController as AdminDashboardController;
use App\Http\Controllers\Api\Admin\SettingController as AdminSettingController;
use App\Http\Controllers\Api\Admin\UserController as AdminUserController;
use App\Http\Controllers\Api\Admin\AuditLogController as AdminAuditLogController;
use App\Http\Controllers\Api\Admin\StatController as AdminStatController;
use App\Http\Controllers\Api\Admin\OrderController as AdminOrderController;
use App\Http\Controllers\Api\Admin\PromoController as AdminPromoController;
use App\Http\Controllers\Api\ShippingController;
use App\Http\Controllers\Api\RatingController;
use App\Http\Controllers\Api\NotificationController;
use Illuminate\Support\Facades\Route;

// ─── Health Check ──────────────────────────────────────────────────────────
Route::get('health', \App\Http\Controllers\Api\HealthController::class);

// ─── Auth ──────────────────────────────────────────────────────────────────
Route::prefix('auth')->group(function () {
    Route::post('register', [AuthController::class, 'register']);
    Route::post('login', [AuthController::class, 'login']);

    Route::prefix('otp')->group(function () {
        Route::post('send', [OtpController::class, 'sendOtp']);
        Route::post('register', [OtpController::class, 'register']);
        Route::post('login', [OtpController::class, 'login']);
        Route::post('reset-password', [OtpController::class, 'resetPassword']);
    });

    Route::middleware(['auth:sanctum', 'active'])->group(function () {
        Route::post('logout', [AuthController::class, 'logout']);
        Route::get('me', [AuthController::class, 'me']);
        Route::patch('profile', [AuthController::class, 'updateProfile']);
        Route::post('change-password', [AuthController::class, 'changePassword']);
        Route::post('fcm-token', [AuthController::class, 'saveFcmToken']);
    });
});

// ─── Webhook Midtrans (publik, tanpa auth) ─────────────────────────────────
Route::post('topup/midtrans/callback', [TopUpController::class, 'midtransCallback']);

// ─── Promo publik (tanpa auth) ─────────────────────────────────────────────
Route::get('promos', function () {
    $promos = \App\Models\Promo::where('is_active', true)->orderBy('sort_order')->orderBy('id')->get();
    $result = $promos->map(function ($promo) {
        $data = $promo->toArray();
        if (!empty($promo->image_path)) {
            $fullPath = storage_path('app/public/' . $promo->image_path);
            if (file_exists($fullPath)) {
                $mime = mime_content_type($fullPath) ?: 'image/jpeg';
                $data['image_data_url'] = 'data:' . $mime . ';base64,' . base64_encode(file_get_contents($fullPath));
            }
        }
        return $data;
    });
    return response()->json($result);
});

// ─── Info aplikasi publik (tanpa auth) ─────────────────────────────────────
Route::get('app-info', function () {
    $keys = ['app_name', 'app_tagline', 'app_logo_path', 'maintenance_mode'];
    $rows = \App\Models\AdminSetting::whereIn('key', $keys)->get()->keyBy('key');
    $logoPath = $rows['app_logo_path']->value ?? '';

    // Return logo sebagai base64 data URL agar tidak bergantung HTTP image loading di WebView
    $logoDataUrl = null;
    if ($logoPath) {
        $fullPath = storage_path('app/public/' . $logoPath);
        if (file_exists($fullPath)) {
            $mime        = mime_content_type($fullPath) ?: 'image/jpeg';
            $logoDataUrl = 'data:' . $mime . ';base64,' . base64_encode(file_get_contents($fullPath));
        }
    }

    return response()->json([
        'app_name'         => $rows['app_name']->value         ?? 'ZasaQu',
        'app_tagline'      => $rows['app_tagline']->value      ?? '',
        'app_logo_url'     => $logoDataUrl,
        'maintenance_mode' => ($rows['maintenance_mode']->value ?? '0') === '1',
    ]);
});

// ─── Route yang butuh login & akun aktif ───────────────────────────────────
Route::middleware(['auth:sanctum', 'active'])->group(function () {

    // Estimasi ongkir
    Route::get('shipping/estimate', [ShippingController::class, 'estimate']);

    // Wallet
    Route::prefix('wallet')->group(function () {
        Route::get('summary', [WalletController::class, 'summary']);
        Route::get('transactions', [WalletController::class, 'transactions']);
    });

    // Top Up
    Route::prefix('topup')->group(function () {
        Route::get('bank-accounts', [TopUpController::class, 'bankAccounts']);
        Route::get('history', [TopUpController::class, 'history']);
        Route::post('manual', [TopUpController::class, 'createManual']);
        Route::post('virtual-account', [TopUpController::class, 'createVirtualAccount']);
        Route::post('qris', [TopUpController::class, 'createQris']);
        Route::post('midtrans',           [TopUpController::class, 'createMidtrans']);
        if (!app()->isProduction()) {
            Route::post('{id}/simulate-qris', [TopUpController::class, 'simulateQrisCallback']);
            Route::post('{id}/simulate-va',   [TopUpController::class, 'simulateVaCallback']);
        }
    });

    // Withdraw (mitra only)
    Route::prefix('withdraw')->group(function () {
        Route::get('history', [WithdrawController::class, 'history']);
        Route::post('/', [WithdrawController::class, 'create']);
    });

    // Kategori barang
    Route::get('item-categories', [OrderController::class, 'categories']);

    // Order pelanggan
    Route::prefix('orders')->group(function () {
        Route::get('/', [OrderController::class, 'index']);
        Route::post('/', [OrderController::class, 'store']);
        Route::get('{id}', [OrderController::class, 'show']);
        Route::post('{id}/cancel', [OrderController::class, 'cancel']);
        Route::post('{id}/confirm-cod', [OrderController::class, 'confirmCod']);
        Route::post('{id}/photos', [OrderPhotoController::class, 'upload']);
        Route::get('{id}/photos/{stage}', [OrderPhotoController::class, 'serve']); // authenticated photo serve
        Route::post('{id}/rate', [RatingController::class, 'store']);
        Route::get('{id}/rating', [RatingController::class, 'show']);
    });

    // Notifikasi
    Route::prefix('notifications')->group(function () {
        Route::get('/', [NotificationController::class, 'index']);
        Route::post('read', [NotificationController::class, 'markRead']);
        Route::get('unread-count', [NotificationController::class, 'unreadCount']);
    });

    // Chat in-app
    Route::prefix('chat')->group(function () {
        Route::get('orders/{orderId}', [ChatController::class, 'getOrCreateRoom']);
        Route::post('rooms/{roomId}/messages', [ChatController::class, 'sendMessage']);
        Route::get('templates', [ChatController::class, 'templates']);
    });

    // Onboarding mitra (boleh diakses pending_review)
    Route::prefix('mitra/onboarding')->middleware('role:mitra_motor,mitra_mobil')->group(function () {
        Route::get('status',         [MitraOnboardingController::class, 'status']);
        Route::post('documents',     [MitraOnboardingController::class, 'uploadDocument']);
    });

    // GPS mitra
    Route::prefix('mitra/gps')->middleware('role:mitra_motor,mitra_mobil')->group(function () {
        Route::get('status', [GpsController::class, 'status']);
        Route::post('update', [GpsController::class, 'update'])->middleware('throttle:30,1'); // max 30x/menit per mitra
        Route::post('lost', [GpsController::class, 'reportLost']);
    });
    Route::get('orders/{id}/location', [GpsController::class, 'getLocation']);

    // Order mitra
    Route::prefix('mitra/orders')->middleware('role:mitra_motor,mitra_mobil')->group(function () {
        Route::get('available', [MitraOrderController::class, 'available']);
        Route::get('my', [MitraOrderController::class, 'myOrders']);
        Route::post('{id}/accept', [MitraOrderController::class, 'accept']);
        Route::patch('{id}/status', [MitraOrderController::class, 'updateStatus']);
    });

    // JastipQu
    Route::prefix('jastip')->group(function () {
        Route::post('sessions', [JastipController::class, 'startSession']);
        Route::delete('sessions/current', [JastipController::class, 'closeSession']);
        Route::get('sessions/current', [JastipController::class, 'currentSession']);
        Route::get('sessions/available', [JastipController::class, 'availableSessions']);
        Route::post('sessions/{id}/order', [JastipController::class, 'placeJastipOrder']);
    });

    // ─── ZasaFood ──────────────────────────────────────────────────────────
    require __DIR__ . '/modules/zasafood.php';

    // ─── Admin ─────────────────────────────────────────────────────────────
    Route::prefix('admin')->middleware('role:admin')->group(function () {

        Route::prefix('topup')->group(function () {
            Route::get('/', [AdminTopUpController::class, 'index']);
            Route::post('{id}/confirm', [AdminTopUpController::class, 'confirm']);
            Route::post('{id}/reject', [AdminTopUpController::class, 'reject']);
        });

        Route::prefix('withdraw')->group(function () {
            Route::get('/', [AdminWithdrawController::class, 'index']);
            Route::post('{id}/process', [AdminWithdrawController::class, 'process']);
        });

        Route::get('dashboard', [AdminDashboardController::class, 'index']);

        Route::prefix('settings')->group(function () {
            Route::get('/', [AdminSettingController::class, 'index']);
            Route::put('{key}', [AdminSettingController::class, 'update']);
            Route::post('upload-logo', [AdminSettingController::class, 'uploadLogo']);
            Route::post('upload-logo-base64', [AdminSettingController::class, 'uploadLogoBase64']);
        });

        Route::prefix('promos')->group(function () {
            Route::get('/', [AdminPromoController::class, 'index']);
            Route::post('/', [AdminPromoController::class, 'store']);
            Route::post('{id}', [AdminPromoController::class, 'update']); // POST+_method=PUT for multipart
            Route::delete('{id}', [AdminPromoController::class, 'destroy']);
        });

        Route::prefix('users')->group(function () {
            Route::get('/', [AdminUserController::class, 'index']);
            Route::get('{id}', [AdminUserController::class, 'show']);
            Route::patch('{id}/status', [AdminUserController::class, 'updateStatus']);
            Route::post('{id}/add-balance', [AdminUserController::class, 'addBalance']);
        });

        // Onboarding mitra
        Route::prefix('mitra')->group(function () {
            Route::get('pending',         [AdminUserController::class, 'pendingMitra']);
            Route::post('{id}/approve',   [AdminUserController::class, 'approveMitra']);
            Route::post('{id}/reject',    [AdminUserController::class, 'rejectMitra']);
        });

        Route::get('audit-logs', [AdminAuditLogController::class, 'index']);

        // Statistik & analytics
        Route::prefix('stats')->group(function () {
            Route::get('overview', [AdminStatController::class, 'overview']);
            Route::get('order-trend', [AdminStatController::class, 'orderTrend']);
            Route::get('top-mitra', [AdminStatController::class, 'topMitra']);
        });

        // Manajemen order
        Route::prefix('orders')->group(function () {
            Route::get('/', [AdminOrderController::class, 'index']);
            Route::get('{id}', [AdminOrderController::class, 'show']);
            Route::post('{id}/force-complete', [AdminOrderController::class, 'forceComplete']);
            Route::post('{id}/force-cancel', [AdminOrderController::class, 'forceCancel']);
        });
    });
});
