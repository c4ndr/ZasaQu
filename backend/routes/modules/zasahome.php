<?php

use App\Http\Controllers\Api\Home\CustomerController;
use App\Http\Controllers\Api\Home\ProviderController;
use App\Http\Controllers\Api\Admin\HomeController as AdminHomeController;
use Illuminate\Support\Facades\Route;

// ── Customer routes ──────────────────────────────────────────────────────────
Route::prefix('home')->middleware('auth:sanctum')->group(function () {

    // Browse providers
    Route::get('providers',          [CustomerController::class, 'providers']);
    Route::get('providers/{provider}',[CustomerController::class, 'provider']);

    // Orders
    Route::post('orders',                       [CustomerController::class, 'placeOrder']);
    Route::get('orders',                        [CustomerController::class, 'myOrders']);
    Route::get('orders/{order}',                [CustomerController::class, 'orderDetail']);
    Route::post('orders/{order}/cancel',        [CustomerController::class, 'cancelOrder']);
});

// ── Provider routes ──────────────────────────────────────────────────────────
Route::prefix('home/provider')->middleware(['auth:sanctum', 'role:home_provider,admin'])->group(function () {

    Route::get('profile',                            [ProviderController::class, 'profile']);
    Route::patch('profile',                          [ProviderController::class, 'updateProfile']);
    Route::post('toggle-open',                       [ProviderController::class, 'toggleOpen']);
    Route::post('upload-logo',   fn($r) => app(ProviderController::class)->uploadImage($r, 'logo'));
    Route::post('upload-banner', fn($r) => app(ProviderController::class)->uploadImage($r, 'banner'));

    // Services
    Route::get('services',               [ProviderController::class, 'profile']); // included in profile
    Route::post('services',              [ProviderController::class, 'storeService']);
    Route::patch('services/{service}',   [ProviderController::class, 'updateService']);
    Route::delete('services/{service}',  [ProviderController::class, 'deleteService']);

    // Orders
    Route::get('orders',                              [ProviderController::class, 'orders']);
    Route::patch('orders/{order}/status',             [ProviderController::class, 'updateOrderStatus']);
});

// ── Admin Home routes ────────────────────────────────────────────────────────
Route::prefix('admin/home')->middleware(['auth:sanctum', 'role:admin'])->group(function () {

    Route::get('providers',                    [AdminHomeController::class, 'indexProviders']);
    Route::post('providers',                   [AdminHomeController::class, 'createProvider']);
    Route::get('providers/{id}',               [AdminHomeController::class, 'showProvider']);
    Route::post('providers/{id}/approve',      [AdminHomeController::class, 'approveProvider']);
    Route::post('providers/{id}/suspend',      [AdminHomeController::class, 'suspendProvider']);

    Route::get('orders',                       [AdminHomeController::class, 'indexOrders']);
    Route::post('orders/{id}/force-cancel',    [AdminHomeController::class, 'forceCancelOrder']);
});
