<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\Ride\MitraController as RideMitraController;
use App\Http\Controllers\Api\Ride\CustomerController as RideCustomerController;
use App\Http\Controllers\Api\Ride\SavedPlaceController;

// ── Mitra ──────────────────────────────────────────────────────────────────────
Route::prefix('ride/mitra')
    ->middleware(['auth:sanctum', 'role:mitra_motor,mitra_mobil,admin'])
    ->group(function () {
        Route::get('available',              [RideMitraController::class, 'available']);
        Route::get('active',                 [RideMitraController::class, 'active']);
        Route::get('history',                [RideMitraController::class, 'history']);
        Route::post('orders/{id}/accept',    [RideMitraController::class, 'accept']);
        Route::patch('orders/{id}/status',   [RideMitraController::class, 'updateStatus']);
        Route::post('orders/{id}/proof-photo', [RideMitraController::class, 'uploadProofPhoto']);
    });

// ── Customer ───────────────────────────────────────────────────────────────────
Route::prefix('ride')
    ->middleware(['auth:sanctum'])
    ->group(function () {
        Route::get('estimate',               [RideCustomerController::class, 'estimate']);
        Route::post('orders',                [RideCustomerController::class, 'store']);
        Route::get('orders',                 [RideCustomerController::class, 'index']);
        Route::get('orders/{id}',            [RideCustomerController::class, 'show']);
        Route::post('orders/{id}/cancel',    [RideCustomerController::class, 'cancel']);
        Route::get('saved-places',           [SavedPlaceController::class, 'index']);
        Route::post('saved-places',          [SavedPlaceController::class, 'store']);
        Route::delete('saved-places/{id}',   [SavedPlaceController::class, 'destroy']);
    });
