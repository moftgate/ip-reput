<?php

use App\Models\LicenseSetting;
use App\Services\DnsLookup;
use App\Services\LicenseVerifier;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Support\FakeDnsLookup;
use Tests\TestCase;

/*
|--------------------------------------------------------------------------
| Test Case
|--------------------------------------------------------------------------
|
| The closure you provide to your test functions is always bound to a specific PHPUnit test
| case class. By default, that class is "PHPUnit\Framework\TestCase". Of course, you may
| need to change it using the "pest()" function to bind different classes or traits.
|
*/

pest()->extend(TestCase::class)
    ->use(RefreshDatabase::class)
    ->in('Feature');

/*
|--------------------------------------------------------------------------
| Expectations
|--------------------------------------------------------------------------
|
| When you're writing tests, you often need to check that values meet certain conditions. The
| "expect()" function gives you access to a set of "expectations" methods that you can use
| to assert different things. Of course, you may extend the Expectation API at any time.
|
*/

expect()->extend('toBeOne', function () {
    return $this->toBe(1);
});

/*
|--------------------------------------------------------------------------
| Functions
|--------------------------------------------------------------------------
|
| While Pest is very powerful out-of-the-box, you may have some testing code specific to your
| project that you don't want to repeat in every file. Here you can also expose helpers as
| global functions to help you to reduce the number of lines of code in your test files.
|
*/

/**
 * Configure a fresh signing key pair and store a valid license.
 */
function validLicense(int $maxAssets = 50, ?int $days = 365): LicenseSetting
{
    $verifier = app(LicenseVerifier::class);
    $pair = $verifier->generateKeyPair();
    config(['iprep.license_public_key' => $pair['public'], 'iprep.license_private_key' => $pair['private']]);

    $expiresAt = $days === null ? null : now()->addDays($days);

    return LicenseSetting::create([
        'license_key' => $verifier->issue('Test', $maxAssets, $expiresAt, null, $pair['private']),
        'plan_name' => 'Test',
        'max_assets' => $maxAssets,
        'is_active' => true,
        'expires_at' => $expiresAt,
    ]);
}

/**
 * @param  array<string, array<int, string>|null>  $aRecords
 * @param  array<string, array<int, string>>  $mxRecords
 */
function fakeDns(array $aRecords = [], array $mxRecords = []): void
{
    app()->instance(DnsLookup::class, new FakeDnsLookup($aRecords, $mxRecords));
}
