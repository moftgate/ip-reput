<?php

use App\Http\Controllers\Auth\LoginController;
use App\Http\Controllers\ReputationController;
use Illuminate\Support\Facades\Route;

Route::middleware('guest')->group(function () {
    Route::get('/login', [LoginController::class, 'create'])->name('login');
    Route::post('/login', [LoginController::class, 'store'])->name('login.store');
});

Route::middleware('auth')->group(function () {
    Route::post('/logout', [LoginController::class, 'destroy'])->name('logout');

    Route::get('/', [ReputationController::class, 'index'])->name('home');
    Route::post('/assets', [ReputationController::class, 'storeAsset'])->name('assets.store');
    Route::post('/assets/check-all', [ReputationController::class, 'checkAll'])->name('assets.check-all');
    Route::post('/assets/{asset}/check', [ReputationController::class, 'checkSingle'])->name('assets.check');
    Route::delete('/assets/{asset}', [ReputationController::class, 'destroyAsset'])->name('assets.destroy');
    Route::post('/license/update', [ReputationController::class, 'updateLicense'])->name('license.update');
});
