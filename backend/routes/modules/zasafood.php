<?php

use App\Http\Controllers\Api\Merchant\ProfileController as MerchantProfileController;
use App\Http\Controllers\Api\Merchant\MenuController as MerchantMenuController;
use App\Http\Controllers\Api\Admin\FoodController as AdminFoodController;
use Illuminate\Support\Facades\Route;

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
});

// ── Admin Food ─────────────────────────────────────────────────────────────
Route::prefix('admin/food')
    ->middleware('role:admin')
    ->group(function () {

    Route::get('merchants',                       [AdminFoodController::class, 'indexMerchants']);
    Route::get('merchants/{id}',                  [AdminFoodController::class, 'showMerchant']);
    Route::post('merchants/{id}/approve',         [AdminFoodController::class, 'approveMerchant']);
    Route::post('merchants/{id}/suspend',         [AdminFoodController::class, 'suspendMerchant']);
});
