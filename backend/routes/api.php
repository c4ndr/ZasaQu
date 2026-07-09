<?php

use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\OtpController;
use App\Http\Controllers\Api\TopUpController;
use App\Http\Controllers\Api\WalletController;
use App\Http\Controllers\Api\WithdrawController;
use App\Http\Controllers\Api\OrderController;
use App\Http\Controllers\Api\OrderPhotoController;
use App\Http\Controllers\Api\ComplaintController;
use App\Http\Controllers\Api\Admin\ComplaintController as AdminComplaintController;
use App\Http\Controllers\Api\JastipController;
use App\Http\Controllers\Api\Mitra\OnboardingController as MitraOnboardingController;
use App\Http\Controllers\Api\Mitra\OrderController as MitraOrderController;
use App\Http\Controllers\Api\Mitra\GpsController;
use App\Http\Controllers\Api\ChatController;
use App\Http\Controllers\Api\CallController;
use App\Http\Controllers\Api\Admin\TopUpController as AdminTopUpController;
use App\Http\Controllers\Api\Admin\WithdrawController as AdminWithdrawController;
use App\Http\Controllers\Api\Admin\DashboardController as AdminDashboardController;
use App\Http\Controllers\Api\Admin\SettingController as AdminSettingController;
use App\Http\Controllers\Api\Admin\UserController as AdminUserController;
use App\Http\Controllers\Api\Admin\AuditLogController as AdminAuditLogController;
use App\Http\Controllers\Api\Admin\StatController as AdminStatController;
use App\Http\Controllers\Api\Admin\OrderController as AdminOrderController;
use App\Http\Controllers\Api\Admin\PromoController as AdminPromoController;
use App\Http\Controllers\Api\Admin\RideController as AdminRideController;
use App\Http\Controllers\Api\Ride\CustomerController as RideCustomerController;
use App\Http\Controllers\Api\Ride\MitraController as MitraRideController;
use App\Http\Controllers\Api\Ride\RideRatingController;
use App\Http\Controllers\Api\Ride\SavedPlaceController as RideSavedPlaceController;
use App\Http\Controllers\Api\PromoValidateController;
use App\Http\Controllers\Api\ShippingController;
use App\Http\Controllers\Api\RatingController;
use App\Http\Controllers\Api\NotificationController;
use App\Http\Controllers\Api\AddressController;
use Illuminate\Support\Facades\Route;

// ─── Health Check ──────────────────────────────────────────────────────────
Route::get('health', \App\Http\Controllers\Api\HealthController::class);

// ─── Monitor (n8n internal) ────────────────────────────────────────────────
Route::get('monitor/errors',       [\App\Http\Controllers\Api\MonitorController::class, 'errors']);
Route::get('monitor/stuck-orders',  [\App\Http\Controllers\Api\MonitorController::class, 'stuckOrders']);
Route::get('monitor/daily-revenue', [\App\Http\Controllers\Api\MonitorController::class, 'dailyRevenue']);
Route::get('monitor/test-run',     [\App\Http\Controllers\Api\TestRunController::class, 'run']);

// ─── Telegram Bot Webhook ──────────────────────────────────────────────────
Route::post('telegram/webhook',    [\App\Http\Controllers\Api\TelegramBotController::class, 'webhook']);
Route::post('telegram/register',   [\App\Http\Controllers\Api\TelegramBotController::class, 'register']);
Route::get('telegram/info',        [\App\Http\Controllers\Api\TelegramBotController::class, 'info']);

// ─── Agora Token (Sanctum) ────────────────────────────────────────────────
Route::post('call/agora-token', [\App\Http\Controllers\Api\AgoraController::class, 'token'])
    ->middleware('auth:sanctum');

// ─── Broadcasting Auth (Sanctum) ───────────────────────────────────────────
// Route default /broadcasting/auth menggunakan web guard (session).
// Route ini override dengan Sanctum agar Bearer token dari mobile app dikenali.
Route::post('broadcasting/auth', [\App\Http\Controllers\Api\BroadcastingAuthController::class, 'authenticate'])
    ->middleware('auth:sanctum');

// ─── Auth ──────────────────────────────────────────────────────────────────
Route::prefix('auth')->group(function () {
    // Max 10 percobaan per menit per IP — cegah brute force
    Route::middleware('throttle:10,1')->group(function () {
        Route::post('register', [AuthController::class, 'register']);
        Route::post('login', [AuthController::class, 'login']);
    });

    Route::prefix('otp')->middleware('throttle:6,1')->group(function () {
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
        Route::post('photo', [AuthController::class, 'uploadPhoto']);
        Route::post('photo-base64', [AuthController::class, 'uploadPhotoBase64']);
        Route::post('avatar-preset', [AuthController::class, 'saveAvatarPreset']);
        Route::delete('account', [AuthController::class, 'deleteAccount']);
    });
});

// ─── Webhook Midtrans & iPaymu (publik, tanpa auth) ────────────────────────
Route::post('topup/midtrans/callback', [TopUpController::class, 'midtransCallback']);
Route::post('topup/ipaymu/callback',   [TopUpController::class, 'ipaymuCallback']);

// ─── Promo publik (tanpa auth) ─────────────────────────────────────────────
Route::get('promos', function () {
    $promos = \App\Models\Promo::where('is_active', true)->orderBy('sort_order')->orderBy('id')->get();
    $basePath = realpath(storage_path('app/public'));
    $result = $promos->map(function ($promo) use ($basePath) {
        $data = $promo->toArray();
        if (!empty($promo->image_path) && $basePath) {
            // Sanitasi path: hanya izinkan file yang berada di dalam direktori storage/app/public
            $fullPath = realpath(storage_path('app/public/' . $promo->image_path));
            if ($fullPath && str_starts_with($fullPath, $basePath . DIRECTORY_SEPARATOR) && file_exists($fullPath)) {
                $mime = mime_content_type($fullPath) ?: 'image/jpeg';
                $data['image_data_url'] = 'data:' . $mime . ';base64,' . base64_encode(file_get_contents($fullPath));
            }
        }
        return $data;
    });
    return response()->json($result);
});

Route::middleware('auth:sanctum')->post('promos/validate', [PromoValidateController::class, 'validate']);

// ─── Info aplikasi publik (tanpa auth) ─────────────────────────────────────
Route::get('app-info', function () {
    $keys = ['app_name', 'app_tagline', 'app_logo_path', 'maintenance_mode', 'wallet_enabled', 'app_min_version'];
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

    // Feature flags — satu query untuk semua modul
    $featureKeys = ['feature_zasago', 'feature_zasafood', 'feature_zasamart', 'feature_zasahome', 'feature_zasaride', 'feature_zasaserv'];
    $featureRows = \App\Models\AdminSetting::whereIn('key', $featureKeys)->get()->keyBy('key');
    $features = [];
    foreach ($featureKeys as $k) {
        $module = str_replace('feature_', '', $k);
        $features[$module] = ($featureRows[$k]->value ?? '1') === '1';
    }

    return response()->json([
        'app_name'         => $rows['app_name']->value         ?? 'ZasaQu',
        'app_tagline'      => $rows['app_tagline']->value      ?? '',
        'app_logo_url'     => $logoDataUrl,
        'maintenance_mode' => ($rows['maintenance_mode']->value ?? '0') === '1',
        'wallet_enabled'   => ($rows['wallet_enabled']->value  ?? '0') === '1',
        'app_min_version'  => $rows['app_min_version']->value  ?? '1.0.0',
        'features'         => $features,
    ]);
});

// ─── Route yang butuh login & akun aktif ───────────────────────────────────
Route::middleware(['auth:sanctum', 'active'])->group(function () {

    // Estimasi ongkir
    Route::get('shipping/estimate', [ShippingController::class, 'estimate']);

    // Buku alamat pelanggan
    Route::prefix('addresses')->group(function () {
        Route::get('/', [AddressController::class, 'index']);
        Route::post('/', [AddressController::class, 'store']);
        Route::put('{id}', [AddressController::class, 'update']);
        Route::delete('{id}', [AddressController::class, 'destroy']);
        Route::post('{id}/set-default', [AddressController::class, 'setDefault']);
    });

    // Wallet
    Route::prefix('wallet')->group(function () {
        Route::get('summary', [WalletController::class, 'summary']);
        Route::get('transactions', [WalletController::class, 'transactions']);
    });

    // Top Up
    Route::prefix('topup')->group(function () {
        Route::get('bank-accounts', [TopUpController::class, 'bankAccounts']);
        Route::get('history', [TopUpController::class, 'history']);
        Route::get('ipaymu/{id}/status', [TopUpController::class, 'checkIpaymuStatus']);
        // POST top up: maks 5 permintaan/menit per user
        Route::middleware('throttle:5,1')->group(function () {
            Route::post('manual',          [TopUpController::class, 'createManual']);
            Route::post('virtual-account', [TopUpController::class, 'createVirtualAccount']);
            Route::post('midtrans',        [TopUpController::class, 'createMidtrans']);
            Route::post('ipaymu/va',       [TopUpController::class, 'createIpaymuVA']);
            Route::post('ipaymu/qris',     [TopUpController::class, 'createIpaymuQRIS']);
        });
        if (!app()->isProduction()) {
            Route::post('{id}/simulate-va', [TopUpController::class, 'simulateVaCallback']);
        }
    });

    // Withdraw (mitra only) — maks 5 permintaan/menit
    Route::prefix('withdraw')->group(function () {
        Route::get('history', [WithdrawController::class, 'history']);
        Route::post('/', [WithdrawController::class, 'create'])->middleware('throttle:5,1');
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

    // Laporan masalah order (semua modul) — window 24 jam sejak completed_at
    Route::prefix('complaints')->group(function () {
        Route::get('/', [ComplaintController::class, 'index']);
        Route::get('{id}', [ComplaintController::class, 'show']);
        Route::post('/', [ComplaintController::class, 'store']);
    });

    // Chat in-app
    Route::prefix('chat')->group(function () {
        Route::get('orders/{orderId}', [ChatController::class, 'getOrCreateRoom']);
        Route::post('rooms/{roomId}/messages', [ChatController::class, 'sendMessage']);
        Route::get('templates', [ChatController::class, 'templates']);
        // ZasaMart pre-order chat (seller inbox)
        Route::get('mart/seller/inbox', [ChatController::class, 'sellerInbox']);
    });

    // Voice call — WebRTC signaling relay (tanpa expose nomor HP)
    Route::post('call/signal', [CallController::class, 'signal']);

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

    // ─── ZasaHome ──────────────────────────────────────────────────────────
    require __DIR__ . '/modules/zasahome.php';

    // ─── ZasaMart ──────────────────────────────────────────────────────────
    require __DIR__ . '/modules/zasamart.php';

    // ─── ZasaServ ──────────────────────────────────────────────────────────
    require __DIR__ . '/modules/zasaserv.php';

    // ─── ZasaRide ──────────────────────────────────────────────────────────
    Route::prefix('ride')->group(function () {
        // Customer
        Route::get('estimate', [RideCustomerController::class, 'estimate']);
        Route::get('orders', [RideCustomerController::class, 'index']);
        Route::post('orders', [RideCustomerController::class, 'store']);
        Route::get('orders/{id}', [RideCustomerController::class, 'show']);
        Route::get('orders/{id}/location', [RideCustomerController::class, 'mitraLocation']);
        Route::post('orders/{id}/cancel', [RideCustomerController::class, 'cancel']);
        Route::post('orders/{id}/rate', [RideRatingController::class, 'store']);
        Route::get('orders/{id}/rating', [RideRatingController::class, 'show']);

        // Saved places (customer)
        Route::prefix('saved-places')->group(function () {
            Route::get('/', [RideSavedPlaceController::class, 'index']);
            Route::post('/', [RideSavedPlaceController::class, 'store']);
            Route::delete('{id}', [RideSavedPlaceController::class, 'destroy']);
        });

        // Mitra
        Route::prefix('mitra')->middleware('role:mitra_motor,mitra_mobil')->group(function () {
            Route::get('available', [MitraRideController::class, 'available']);
            Route::get('active', [MitraRideController::class, 'active']);
            Route::get('history', [MitraRideController::class, 'history']);
            Route::post('orders/{id}/accept', [MitraRideController::class, 'accept']);
            Route::patch('orders/{id}/status', [MitraRideController::class, 'updateStatus']);
            Route::post('orders/{id}/proof-photo', [MitraRideController::class, 'uploadProofPhoto']);
        });
    });

    // ─── Admin ─────────────────────────────────────────────────────────────
    Route::prefix('admin')->middleware(['role:admin', 'throttle:60,1'])->group(function () {

        Route::prefix('topup')->group(function () {
            Route::get('/', [AdminTopUpController::class, 'index']);
            Route::post('{id}/confirm', [AdminTopUpController::class, 'confirm']);
            Route::post('{id}/reject', [AdminTopUpController::class, 'reject']);
        });

        Route::prefix('withdraw')->group(function () {
            Route::get('/', [AdminWithdrawController::class, 'index']);
            Route::post('{id}/process', [AdminWithdrawController::class, 'process']);
        });

        Route::prefix('complaints')->group(function () {
            Route::get('/', [AdminComplaintController::class, 'index']);
            Route::get('{id}', [AdminComplaintController::class, 'show']);
            Route::post('{id}/resolve', [AdminComplaintController::class, 'resolve']);
            Route::post('{id}/reject', [AdminComplaintController::class, 'reject']);
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

        Route::prefix('vouchers')->group(function () {
            Route::get('/', [\App\Http\Controllers\Api\Admin\VoucherController::class, 'index']);
            Route::post('/', [\App\Http\Controllers\Api\Admin\VoucherController::class, 'store']);
            Route::patch('{id}', [\App\Http\Controllers\Api\Admin\VoucherController::class, 'update']);
            Route::delete('{id}', [\App\Http\Controllers\Api\Admin\VoucherController::class, 'destroy']);
        });

        Route::prefix('users')->group(function () {
            Route::get('/', [AdminUserController::class, 'index']);
            Route::get('{id}', [AdminUserController::class, 'show']);
            Route::patch('{id}/status', [AdminUserController::class, 'updateStatus']);
            Route::post('{id}/add-balance', [AdminUserController::class, 'addBalance']);
            Route::post('{id}/deduct-balance', [AdminUserController::class, 'deductBalance']);
            Route::get('{id}/wallet-transactions', [AdminUserController::class, 'walletTransactions']);
        });

        Route::prefix('wallet')->group(function () {
            Route::get('search', [AdminUserController::class, 'walletSearch']);
            Route::get('adjustments', [AdminUserController::class, 'adminAdjustments']);
        });

        // Onboarding mitra
        Route::prefix('mitra')->group(function () {
            Route::get('pending',         [AdminUserController::class, 'pendingMitra']);
            Route::post('{id}/approve',   [AdminUserController::class, 'approveMitra']);
            Route::post('{id}/reject',    [AdminUserController::class, 'rejectMitra']);
        });

        Route::get('audit-logs', [AdminAuditLogController::class, 'index']);

        // ZasaRide admin
        Route::prefix('ride')->group(function () {
            Route::get('orders', [AdminRideController::class, 'orders']);
            Route::get('fares', [AdminRideController::class, 'fares']);
            Route::patch('fares/{id}', [AdminRideController::class, 'updateFare']);
            Route::get('stats', [AdminRideController::class, 'stats']);
        });

        // Statistik & analytics
        Route::prefix('stats')->group(function () {
            Route::get('overview',    [AdminStatController::class, 'overview']);
            Route::get('order-trend', [AdminStatController::class, 'orderTrend']);
            Route::get('top-mitra',   [AdminStatController::class, 'topMitra']);
            Route::get('commission',  [AdminStatController::class, 'commissionDetail']);
        });

        // Manajemen order
        Route::prefix('orders')->group(function () {
            Route::get('/', [AdminOrderController::class, 'index']);
            Route::get('{id}', [AdminOrderController::class, 'show']);
            Route::post('{id}/force-complete', [AdminOrderController::class, 'forceComplete']);
            Route::post('{id}/force-cancel', [AdminOrderController::class, 'forceCancel']);
        });

        Route::post('broadcast', [\App\Http\Controllers\Api\Admin\BroadcastController::class, 'send']);
    });
});

// ─── Browse publik — didaftarkan SETELAH auth group agar tidak tertimpa ────
use App\Http\Controllers\Api\Food\FoodOrderController;
use App\Http\Controllers\Api\Home\CustomerController as HomeCustomerController;
use App\Http\Controllers\Api\Mart\CustomerController as MartCustomerController;
use App\Http\Controllers\Api\Serv\CustomerController as ServCustomerController;

Route::prefix('food')->group(function () {
    Route::get('merchants',         [FoodOrderController::class, 'indexMerchants']);
    Route::get('merchants/{id}',    [FoodOrderController::class, 'showMerchant']);
    Route::get('delivery-estimate', [FoodOrderController::class, 'estimateDelivery']);
});
Route::prefix('mart')->group(function () {
    Route::get('categories',         [MartCustomerController::class, 'categories']);
    Route::get('products',           [MartCustomerController::class, 'products']);
    Route::get('products/{product}', [MartCustomerController::class, 'product']);
    Route::get('sellers',            [MartCustomerController::class, 'sellers']);
    Route::get('sellers/{seller}',   [MartCustomerController::class, 'seller']);
});
Route::prefix('serv')->group(function () {
    Route::get('providers',            [ServCustomerController::class, 'providers']);
    Route::get('providers/{provider}', [ServCustomerController::class, 'provider']);
});
Route::prefix('home')->group(function () {
    Route::get('providers',            [HomeCustomerController::class, 'providers']);
    Route::get('providers/{provider}', [HomeCustomerController::class, 'provider']);
});
Route::get('ride/estimate', [RideCustomerController::class, 'estimate']);
