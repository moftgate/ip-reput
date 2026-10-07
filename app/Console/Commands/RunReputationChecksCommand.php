<?php

namespace App\Console\Commands;

use App\Models\LicenseSetting;
use App\Models\MonitoredAsset;
use App\Services\BlacklistCheckerService;
use Illuminate\Console\Command;
use Illuminate\Database\Eloquent\Builder;

class RunReputationChecksCommand extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'iprep:check
        {asset_id? : İsteğe bağlı izlenen varlık ID}
        {--due : Yalnız haftalık/aylık sorgu zamanı gelmiş varlıkları kontrol et}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Kara liste ve IP itibar kontrollerini toplu veya tekil olarak sorgular';

    /**
     * Execute the console command.
     */
    public function handle(BlacklistCheckerService $checker): int
    {
        if (! LicenseSetting::isLicenseValid()) {
            $this->error('Lisans süresi dolmuş veya geçersiz. Yeni sorgu çalıştırılamaz.');

            return self::FAILURE;
        }

        $assetId = $this->argument('asset_id');

        if ($assetId) {
            $asset = MonitoredAsset::find($assetId);
            if (! $asset) {
                $this->error("Varlık ID #{$assetId} bulunamadı.");

                return self::FAILURE;
            }
            $this->info("{$asset->target} ({$asset->type}) için sorgu başlatılıyor...");
            $check = $checker->checkAsset($asset);
            $this->info("Tamamlandı: {$check->listed_count} listede tespit edildi, {$check->counted_threat_count} sayılan tehdit (Seviye: {$check->highest_threat_level}).");

            return self::SUCCESS;
        }

        $assets = MonitoredAsset::where('is_active', true)
            ->when($this->option('due'), fn (Builder $query) => $query->due())
            ->get();

        $this->info("Toplam {$assets->count()} varlık için toplu kontrol başlatılıyor...");

        $this->output->progressStart($assets->count());
        $failures = 0;

        foreach ($assets as $asset) {
            try {
                $checker->checkAsset($asset);
            } catch (\Throwable $e) {
                $failures++;
                report($e);
                $this->error("Hata ({$asset->target}): ".$e->getMessage());
            }
            $this->output->progressAdvance();
        }

        $this->output->progressFinish();

        if ($failures > 0) {
            $this->warn("{$failures} varlık kontrol edilemedi.");

            return self::FAILURE;
        }

        $this->info('Tüm varlıklar kontrol edildi.');

        return self::SUCCESS;
    }
}
