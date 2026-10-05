<?php

use App\Http\Controllers\ReputationController;
use Illuminate\Support\Facades\Route;

Route::get('/', [ReputationController::class, 'index'])->name('home');
Route::post('/assets', [ReputationController::class, 'storeAsset'])->name('assets.store');
Route::post('/assets/{asset}/check', [ReputationController::class, 'checkSingle'])->name('assets.check');
Route::post('/assets/check-all', [ReputationController::class, 'checkAll'])->name('assets.check-all');
Route::delete('/assets/{asset}', [ReputationController::class, 'destroyAsset'])->name('assets.destroy');
Route::post('/license/update', [ReputationController::class, 'updateLicense'])->name('license.update');
