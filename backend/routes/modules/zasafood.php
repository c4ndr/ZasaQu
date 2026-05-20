<?php

use App\Http\Controllers\Api\Food\FoodOrderController;
use App\Http\Controllers\Api\Food\FoodMitraController;
use App\Http\Controllers\Api\Merchant\ProfileController as MerchantProfileController;
use App\Http\Controllers\Api\Merchant\MenuController as MerchantMenuController;
use App\Http\Controllers\Api\Merchant\FoodOrderController as MerchantFoodOrderController;
use App\Http\Controllers\Api\Admin\FoodController as AdminFoodController;
use Illuminate\Support\Facades\Route;

// ── Publik (pelanggan & semua role login) ─────────────────────────────────
Route::prefix('food')->group(function () {
    Route::get('merchants',                    [FoodOrderController::class, 'indexMerchants']);
    Route::get('merchants/{id}',               [FoodOrderController::class, 'showMerchant']);
    Route::get('delivery-estimate',            [FoodOrderController::class, 'estimateDelivery']);

    Route::get('orders',                       [FoodOrderController::class, 'index']);
    Route::post('orders',                      [FoodOrderController::class, 'store']);
    Route::get('orders/{id}',                  [FoodOrderController::class, 'show']);
    Route::post('orders/{id}/cancel',          [FoodOrderController::class, 'cancel']);
    Route::post('orders/{id}/confirm',         [FoodOrderController::class, 'confirm']);
    Route::post('orders/{id}/rate',            [FoodOrderController::class, 'rate']);
    Route::get('orders/{id}/rating',           [FoodOrderController::class, 'getRating']);
    Route::get('orders/{id}/mitra-location',   [FoodOrderController::class, 'mitraLocation']);
});

// ── Mitra delivery ZasaFood ───────────────────────────────────────────────
Route::prefix('food/mitra')
    ->middleware('role:mitra_motor,mitra_mobil')
    ->group(function () {

    Route::get('orders/available',         [FoodMitraController::class, 'available']);
    Route::get('orders/my',                [FoodMitraController::class, 'myOrders']);
    Route::post('orders/{id}/accept',      [FoodMitraController::class, 'accept']);
    Route::patch('orders/{id}/status',     [FoodMitraController::class, 'updateStatus']);
});

// ── Merchant (role: merchant) ──────────────────────────────────────────────
Route::prefix('food/merchant')
    ->middleware('role:merchant')
    ->group(function () {

    Route::get('profile',            [MerchantProfileController::class, 'show']);
    Route::patch('profile',          [MerchantProfileController::class, 'update']);
    Route::post('toggle-open',       [MerchantProfileController::class, 'toggleOpen']);
    Route::post('upload-logo',       [MerchantProfileController::class, 'uploadLogo']);
    Route::post('upload-banner',     [MerchantProfileController::class, 'uploadBanner']);

    Route::prefix('menu')->group(function () {
        Route::get('categories',              [MerchantMenuController::class, 'indexCategories']);
        Route::post('categories',             [MerchantMenuController::class, 'storeCategory']);
        Route::patch('categories/{id}',       [MerchantMenuController::class, 'updateCategory']);
        Route::delete('categories/{id}',      [MerchantMenuController::class, 'destroyCategory']);

        Route::get('items',                   [MerchantMenuController::class, 'indexItems']);
        Route::post('items',                  [MerchantMenuController::class, 'storeItem']);
        Route::patch('items/{id}',            [MerchantMenuController::class, 'updateItem']);
        Route::delete('items/{id}',           [MerchantMenuController::class, 'destroyItem']);
        Route::post('items/{id}/toggle',      [MerchantMenuController::class, 'toggleItem']);
    });

    // Order management
    Route::prefix('orders')->group(function () {
        Route::get('/',                [MerchantFoodOrderController::class, 'index']);
        Route::get('{id}',             [MerchantFoodOrderController::class, 'show']);
        Route::post('{id}/accept',     [MerchantFoodOrderController::class, 'accept']);
        Route::post('{id}/reject',     [MerchantFoodOrderController::class, 'reject']);
        Route::post('{id}/preparing',  [MerchantFoodOrderController::class, 'preparing']);
        Route::post('{id}/ready',      [MerchantFoodOrderController::class, 'ready']);
    });
});

// ── Admin Food ─────────────────────────────────────────────────────────────
Route::prefix('admin/food')
    ->middleware('role:admin')
    ->group(function () {

    Route::get('merchants',                       [AdminFoodController::class, 'indexMerchants']);
    Route::get('merchants/{id}',                  [AdminFoodController::class, 'showMerchant']);
    Route::post('merchants/{id}/approve',         [AdminFoodController::class, 'approveMerchant']);
    Route::post('merchants/{id}/suspend',         [AdminFoodController::class, 'suspendMerchant']);
    Route::get('orders',                          [AdminFoodController::class, 'indexOrders']);
});
