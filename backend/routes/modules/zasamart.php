<?php

use App\Http\Controllers\Api\Mart\CustomerController;
use App\Http\Controllers\Api\Mart\SellerController;
use App\Http\Controllers\Api\Mart\MitraMartController;
use App\Http\Controllers\Api\Admin\MartController;
use App\Http\Controllers\Api\DeliveryPhotoController;
use Illuminate\Support\Facades\Route;

// ── Customer routes ──────────────────────────────────────────────────────────
Route::prefix('mart')->middleware('auth:sanctum')->group(function () {
    Route::get('categories',            [CustomerController::class, 'categories']);
    Route::get('products',              [CustomerController::class, 'products']);
    Route::get('products/{product}',    [CustomerController::class, 'product']);
    Route::get('sellers',               [CustomerController::class, 'sellers']);
    Route::get('sellers/{seller}',      [CustomerController::class, 'seller']);

    Route::get('cart',                  [CustomerController::class, 'cart']);
    Route::post('cart',                 [CustomerController::class, 'addToCart']);
    Route::delete('cart/{id}',          [CustomerController::class, 'removeFromCart']);
    Route::delete('cart',               [CustomerController::class, 'clearCart']);

    Route::post('checkout',             [CustomerController::class, 'checkout']);

    Route::get('orders',                [CustomerController::class, 'myOrders']);
    Route::get('orders/{id}',           [CustomerController::class, 'orderDetail']);
    Route::post('orders/{id}/cancel',   [CustomerController::class, 'cancelOrder']);
    Route::post('orders/{id}/receive',       [CustomerController::class, 'receiveOrder']);
    Route::post('reviews',                   [CustomerController::class, 'submitReview']);
    Route::get('orders/{id}/delivery-photo', [DeliveryPhotoController::class, 'serveMart']);
});

// ── Seller routes ─────────────────────────────────────────────────────────────
Route::prefix('mart/seller')->middleware(['auth:sanctum', 'role:seller,admin'])->group(function () {
    Route::get('profile',                      [SellerController::class, 'profile']);
    Route::patch('profile',                    [SellerController::class, 'updateProfile']);
    Route::post('toggle-open',                 [SellerController::class, 'toggleOpen']);
    Route::post('upload-logo',          fn(\Illuminate\Http\Request $r) => app(SellerController::class)->uploadImage($r, 'logo'));
    Route::post('upload-banner',        fn(\Illuminate\Http\Request $r) => app(SellerController::class)->uploadImage($r, 'banner'));
    Route::post('upload-logo-base64',   fn(\Illuminate\Http\Request $r) => app(SellerController::class)->uploadImageBase64($r, 'logo'));
    Route::post('upload-banner-base64', fn(\Illuminate\Http\Request $r) => app(SellerController::class)->uploadImageBase64($r, 'banner'));

    Route::get('products',                          [SellerController::class, 'products']);
    Route::post('products',                         [SellerController::class, 'storeProduct']);
    Route::patch('products/{id}',                   [SellerController::class, 'updateProduct']);
    Route::post('products/{id}/images',             [SellerController::class, 'uploadProductImage']);
    Route::post('products/{id}/images-base64',      [SellerController::class, 'uploadProductImageBase64']);
    Route::delete('products/{id}/images',           [SellerController::class, 'deleteProductImage']);
    Route::delete('products/{id}',             [SellerController::class, 'deleteProduct']);

    Route::get('orders',                       [SellerController::class, 'orders']);
    Route::get('orders/{id}',                  [SellerController::class, 'orderDetail']);
    Route::post('orders/{id}/confirm',         [SellerController::class, 'confirmOrder']);
    Route::post('orders/{id}/pack',            [SellerController::class, 'packOrder']);
    Route::post('orders/{id}/cancel',          [SellerController::class, 'cancelOrder']);
});

// ── Mitra Mart routes ─────────────────────────────────────────────────────────
Route::prefix('mart/mitra')->middleware(['auth:sanctum', 'role:mitra_motor,mitra_mobil,admin'])->group(function () {
    Route::get('orders/available',        [MitraMartController::class, 'available']);
    Route::get('orders/my',               [MitraMartController::class, 'myOrders']);
    Route::get('orders/history',          [MitraMartController::class, 'history']);
    Route::post('orders/{id}/accept',     [MitraMartController::class, 'accept']);
    Route::patch('orders/{id}/status',         [MitraMartController::class, 'updateStatus']);
    Route::post('orders/{id}/delivery-photo',  [DeliveryPhotoController::class, 'uploadMart']);
});

// ── Admin Mart routes ─────────────────────────────────────────────────────────
Route::prefix('admin/mart')->middleware(['auth:sanctum', 'role:admin'])->group(function () {
    Route::get('sellers',                      [MartController::class, 'indexSellers']);
    Route::post('sellers',                     [MartController::class, 'createSeller']);
    Route::get('sellers/{id}',                 [MartController::class, 'showSeller']);
    Route::post('sellers/{id}/approve',        [MartController::class, 'approveSeller']);
    Route::post('sellers/{id}/suspend',        [MartController::class, 'suspendSeller']);

    Route::get('products',                     [MartController::class, 'indexProducts']);
    Route::post('products/{id}/toggle',        [MartController::class, 'toggleProduct']);

    Route::get('orders',                       [MartController::class, 'indexOrders']);
    Route::post('orders/{id}/force-cancel',    [MartController::class, 'forceCancelOrder']);
});
