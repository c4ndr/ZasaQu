<?php

use App\Http\Controllers\Api\Serv\CustomerController;
use App\Http\Controllers\Api\Serv\ProviderController;
use App\Http\Controllers\Api\Serv\MitraController as ServMitraController;
use App\Http\Controllers\Api\Admin\ServController;
use Illuminate\Support\Facades\Route;

// ── Customer routes ──────────────────────────────────────────────────────────
Route::prefix('serv')->middleware('auth:sanctum')->group(function () {

    Route::get('providers',              [CustomerController::class, 'providers']);
    Route::get('providers/{provider}',   [CustomerController::class, 'provider']);

    Route::post('orders',                [CustomerController::class, 'placeOrder']);
    Route::get('orders',                 [CustomerController::class, 'myOrders']);
    Route::get('orders/{order}',         [CustomerController::class, 'orderDetail']);
    Route::post('orders/{order}/cancel', [CustomerController::class, 'cancelOrder']);
    Route::post('orders/{order}/rate',   [CustomerController::class, 'rateOrder']);
});

// ── Provider routes ──────────────────────────────────────────────────────────
Route::prefix('serv/provider')->middleware(['auth:sanctum', 'role:serv_provider,admin'])->group(function () {

    Route::get('profile',                          [ProviderController::class, 'profile']);
    Route::patch('profile',                        [ProviderController::class, 'updateProfile']);
    Route::post('toggle-open',                     [ProviderController::class, 'toggleOpen']);
    Route::post('upload-logo-base64',   fn(\Illuminate\Http\Request $r) => app(ProviderController::class)->uploadImageBase64($r, 'logo'));
    Route::post('upload-banner-base64', fn(\Illuminate\Http\Request $r) => app(ProviderController::class)->uploadImageBase64($r, 'banner'));

    Route::post('services',              [ProviderController::class, 'storeService']);
    Route::patch('services/{service}',   [ProviderController::class, 'updateService']);
    Route::delete('services/{service}',  [ProviderController::class, 'deleteService']);

    Route::get('consultations',                    [ProviderController::class, 'consultations']);

    Route::get('orders',                           [ProviderController::class, 'orders']);
    Route::patch('orders/{order}/status',          [ProviderController::class, 'updateOrderStatus']);
});

// ── Mitra routes ─────────────────────────────────────────────────────────────
Route::prefix('serv/mitra')->middleware(['auth:sanctum', 'role:mitra_motor,mitra_mobil,admin'])->group(function () {
    Route::get('available',              [ServMitraController::class, 'available']);
    Route::get('active',                 [ServMitraController::class, 'active']);
    Route::get('history',                [ServMitraController::class, 'history']);
    Route::post('orders/{id}/accept',    [ServMitraController::class, 'accept']);
    Route::patch('orders/{id}/status',   [ServMitraController::class, 'updateStatus']);
});

// ── Admin routes ─────────────────────────────────────────────────────────────
Route::prefix('admin/serv')->middleware(['auth:sanctum', 'role:admin'])->group(function () {

    Route::get('providers',                  [ServController::class, 'indexProviders']);
    Route::post('providers',                 [ServController::class, 'createProvider']);
    Route::get('providers/{id}',             [ServController::class, 'showProvider']);
    Route::post('providers/{id}/approve',    [ServController::class, 'approveProvider']);
    Route::post('providers/{id}/suspend',    [ServController::class, 'suspendProvider']);

    Route::get('orders',                     [ServController::class, 'indexOrders']);
    Route::post('orders/{id}/force-cancel',  [ServController::class, 'forceCancelOrder']);
});
