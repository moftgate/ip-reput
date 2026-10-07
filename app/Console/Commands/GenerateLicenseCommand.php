<?php

namespace App\Console\Commands;

use App\Services\LicenseVerifier;
use Illuminate\Console\Command;

class GenerateLicenseCommand extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'iprep:license
        {plan? : Paket adı}
        {--max-assets=50 : İzlenebilecek en fazla varlık}
        {--days=365 : Geçerlilik süresi (0 = süresiz)}
        {--to= : Lisans sahibi}
        {--keypair : Yeni bir Ed25519 anahtar çifti üret}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Satıcı aracı: imzalı lisans anahtarı veya anahtar çifti üretir';

    /**
     * Execute the console command.
     */
    public function handle(LicenseVerifier $verifier): int
    {
        if ($this->option('keypair')) {
            $pair = $verifier->generateKeyPair();
            $this->line('IPREP_LICENSE_PUBLIC_KEY='.$pair['public']);
            $this->line('IPREP_LICENSE_PRIVATE_KEY='.$pair['private']);
            $this->warn('Özel anahtarı müşteri kurulumlarına koymayın.');

            return self::SUCCESS;
        }

        $privateKey = (string) config('iprep.license_private_key');
        $plan = $this->argument('plan');

        if ($privateKey === '' || ! $plan) {
            $this->error('Paket adı ve IPREP_LICENSE_PRIVATE_KEY gereklidir.');

            return self::FAILURE;
        }

        $days = (int) $this->option('days');

        $this->line($verifier->issue(
            $plan,
            (int) $this->option('max-assets'),
            $days > 0 ? now()->addDays($days) : null,
            $this->option('to') ?: null,
            $privateKey,
        ));

        return self::SUCCESS;
    }
}
