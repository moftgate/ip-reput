<?php

use App\Jobs\CheckAssetJob;
use App\Models\BlacklistProvider;
use App\Models\LicenseSetting;
use App\Models\MonitoredAsset;
use App\Models\ReputationCheck;
use App\Models\ReputationFinding;
use App\Models\User;
use App\Services\LicenseVerifier;
use Illuminate\Support\Facades\Queue;
use Inertia\Testing\AssertableInertia as Assert;

beforeEach(function () {
    Queue::fake();
    $this->actingAs(User::factory()->create());
});

test('guests are redirected to the login page', function () {
    auth()->logout();

    $this->get('/')->assertRedirect('/login');
    $this->post('/assets', [])->assertRedirect('/login');
});

test('adding an asset queues its first check', function () {
    validLicense();

    $this->post('/assets', ['type' => 'ip', 'target' => '8.8.4.4', 'frequency' => 'weekly'])
        ->assertRedirect();

    $asset = MonitoredAsset::sole();
    Queue::assertPushed(CheckAssetJob::class, fn (CheckAssetJob $job) => $job->asset->is($asset));
});

test('asset targets are validated by type', function (string $type, string $target) {
    validLicense();

    $this->post('/assets', ['type' => $type, 'target' => $target, 'frequency' => 'weekly'])
        ->assertSessionHasErrors('target');
})->with([
    ['ip', 'not-an-ip'],
    ['ip', '2001:db8::1'],
    ['domain', 'no spaces.com'],
    ['domain', 'localhost'],
]);

test('assets cannot be added without a valid license', function () {
    $this->post('/assets', ['type' => 'ip', 'target' => '8.8.4.4', 'frequency' => 'weekly'])
        ->assertSessionHas('error');

    expect(MonitoredAsset::count())->toBe(0);
});

test('a tampered license in the database is rejected', function () {
    validLicense();
    LicenseSetting::first()->update(['license_key' => 'IPREP1.abc.def']);

    expect(LicenseSetting::isLicenseValid())->toBeFalse();
});

test('the license asset limit is enforced', function () {
    validLicense(maxAssets: 1);
    MonitoredAsset::factory()->create();

    $this->post('/assets', ['type' => 'ip', 'target' => '8.8.4.4', 'frequency' => 'weekly'])
        ->assertSessionHas('error');

    expect(MonitoredAsset::count())->toBe(1);
});

test('check all queues every active asset', function () {
    validLicense();
    MonitoredAsset::factory()->count(2)->create();
    MonitoredAsset::factory()->create(['is_active' => false]);

    $this->post('/assets/check-all')->assertSessionHas('success');

    Queue::assertPushed(CheckAssetJob::class, 2);
});

test('an expired license blocks new checks', function () {
    validLicense(days: 1);
    $this->travel(2)->days();
    $asset = MonitoredAsset::factory()->create();

    $this->post("/assets/{$asset->id}/check")->assertSessionHas('error');

    Queue::assertNothingPushed();
});

test('a signed license key can be saved', function () {
    $verifier = app(LicenseVerifier::class);
    $pair = $verifier->generateKeyPair();
    config(['iprep.license_public_key' => $pair['public']]);

    $key = $verifier->issue('Kurumsal', 25, now()->addMonth(), null, $pair['private']);

    $this->post('/license/update', ['license_key' => $key])->assertSessionHas('success');

    expect(LicenseSetting::sole())
        ->plan_name->toBe('Kurumsal')
        ->max_assets->toBe(25)
        ->and(LicenseSetting::isLicenseValid())->toBeTrue();
});

test('an unsigned license key is rejected', function () {
    $pair = app(LicenseVerifier::class)->generateKeyPair();
    config(['iprep.license_public_key' => $pair['public']]);

    $this->post('/license/update', ['license_key' => 'IPREP-PRO-9842-7194-GLOBAL'])
        ->assertSessionHasErrors('license_key');

    expect(LicenseSetting::count())->toBe(0);
});

test('the dashboard shows sources added and removed since the previous check', function () {
    $asset = MonitoredAsset::factory()->create();
    [$oldList, $newList] = BlacklistProvider::factory()->count(2)->create();

    $previous = ReputationCheck::factory()->for($asset, 'asset')->create(['created_at' => now()->subDay()]);
    $latest = ReputationCheck::factory()->for($asset, 'asset')->create();
    ReputationFinding::factory()->for($previous, 'check')->for($oldList, 'provider')->create(['monitored_asset_id' => $asset->id, 'ip_address' => '1.1.1.1']);
    ReputationFinding::factory()->for($latest, 'check')->for($newList, 'provider')->create(['monitored_asset_id' => $asset->id, 'ip_address' => '1.1.1.1']);

    $this->get('/?asset_id='.$asset->id)->assertInertia(fn (Assert $page) => $page
        ->component('welcome')
        ->where('trend.added.0.provider', $newList->name)
        ->where('trend.removed.0.provider', $oldList->name)
        ->missing('license.license_key')
    );
});
