<?php

use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\OtpController;
use App\Http\Controllers\Api\TopUpController;
use App\Http\Controllers\Api\WalletController;
use App\Http\Controllers\Api\WithdrawController;
use App\Http\Controllers\Api\OrderController;
use App\Http\Controllers\Api\OrderPhotoController;
use App\Http\Controllers\Api\JastipController;
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
use App\Http\Controllers\Api\ShippingController;
use App\Http\Controllers\Api\RatingController;
use App\Http\Controllers\Api\NotificationController;
use Illuminate\Support\Facades\Route;

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
    });
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
        // Simulasi (development only)
        Route::post('{id}/simulate-qris', [TopUpController::class, 'simulateQrisCallback']);
        Route::post('{id}/simulate-va', [TopUpController::class, 'simulateVaCallback']);
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

    // GPS mitra
    Route::prefix('mitra/gps')->middleware('role:mitra_motor,mitra_mobil')->group(function () {
        Route::get('status', [GpsController::class, 'status']);
        Route::post('update', [GpsController::class, 'update']);
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
        });

        Route::prefix('users')->group(function () {
            Route::get('/', [AdminUserController::class, 'index']);
            Route::get('{id}', [AdminUserController::class, 'show']);
            Route::patch('{id}/status', [AdminUserController::class, 'updateStatus']);
            Route::post('{id}/add-balance', [AdminUserController::class, 'addBalance']);
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
