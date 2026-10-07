<?php

namespace App\Jobs;

use App\Models\LicenseSetting;
use App\Models\MonitoredAsset;
use App\Services\BlacklistCheckerService;
use Illuminate\Contracts\Queue\ShouldBeUnique;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Support\Facades\Log;
use Throwable;

class CheckAssetJob implements ShouldBeUnique, ShouldQueue
{
    use Queueable;

    public int $timeout = 300;

    public int $tries = 2;

    public function __construct(
        public MonitoredAsset $asset
    ) {}

    public function uniqueId(): string
    {
        return (string) $this->asset->id;
    }

    public function handle(BlacklistCheckerService $checker): void
    {
        if (! LicenseSetting::isLicenseValid()) {
            return;
        }

        $checker->checkAsset($this->asset);
    }

    public function failed(?Throwable $exception): void
    {
        Log::error('Reputation check failed', [
            'asset_id' => $this->asset->id,
            'target' => $this->asset->target,
            'error' => $exception?->getMessage(),
        ]);
    }
}
