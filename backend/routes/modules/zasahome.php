<?php

use App\Http\Controllers\Api\Home\CustomerController;
use App\Http\Controllers\Api\Home\ProviderController;
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
Route::prefix('home/provider')->middleware(['auth:sanctum'])->group(function () {

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
