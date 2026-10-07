<?php

use App\Models\BlacklistProvider;
use App\Models\MonitoredAsset;
use App\Models\ReputationFinding;
use App\Notifications\ListingStatusChanged;
use App\Services\BlacklistCheckerService;
use Illuminate\Support\Facades\Notification;

beforeEach(function () {
    Notification::fake();
    $this->spamList = BlacklistProvider::factory()->create(['host' => 'bl.example.test', 'threat_level' => 'high']);
    $this->policyList = BlacklistProvider::factory()->create(['host' => 'pbl.example.test', 'threat_level' => 'low', 'category' => 'policy', 'is_counted' => false]);
});

test('a 127.0.0.x answer is recorded as a counted listing', function () {
    fakeDns(['4.3.2.1.bl.example.test' => ['127.0.0.2']]);
    $asset = MonitoredAsset::factory()->create(['target' => '1.2.3.4']);

    $check = app(BlacklistCheckerService::class)->checkAsset($asset);

    expect($check->status)->toBe('completed')
        ->and($check->counted_threat_count)->toBe(1)
        ->and($check->highest_threat_level)->toBe('high')
        ->and($asset->fresh()->active_listings_count)->toBe(1);
});

test('policy lists are recorded but do not raise risk', function () {
    fakeDns(['4.3.2.1.pbl.example.test' => ['127.0.0.10']]);
    $asset = MonitoredAsset::factory()->create(['target' => '1.2.3.4']);

    $check = app(BlacklistCheckerService::class)->checkAsset($asset);

    expect($check->listed_count)->toBe(1)
        ->and($check->counted_threat_count)->toBe(0)
        ->and($check->highest_threat_level)->toBe('clean');
});

test('refused and failed queries are errors, not listings', function (?array $answer) {
    fakeDns(['4.3.2.1.bl.example.test' => $answer]);
    $asset = MonitoredAsset::factory()->create(['target' => '1.2.3.4']);

    $check = app(BlacklistCheckerService::class)->checkAsset($asset);

    expect($check->listed_count)->toBe(0)
        ->and($check->failed_sources_count)->toBe(1)
        ->and($check->error_message)->not->toBeNull();
})->with([
    'spamhaus public resolver refusal' => [['127.255.255.254']],
    'loopback answer' => [['127.0.0.1']],
    'dns timeout' => [null],
]);

test('domains are resolved through A and MX records', function () {
    fakeDns(
        ['example.test' => ['10.0.0.1'], 'mx.example.test' => ['10.0.0.2'], '2.0.0.10.bl.example.test' => ['127.0.0.3']],
        ['example.test' => ['mx.example.test']],
    );
    $asset = MonitoredAsset::factory()->create(['type' => 'domain', 'target' => 'example.test']);

    $check = app(BlacklistCheckerService::class)->checkAsset($asset);

    expect($asset->resolvedIps()->pluck('record_type', 'ip_address')->all())->toBe(['10.0.0.1' => 'A', '10.0.0.2' => 'MX'])
        ->and($check->total_sources_queried)->toBe(4)
        ->and($check->findings()->value('ip_address'))->toBe('10.0.0.2');
});

test('a domain without records produces a failed check', function () {
    fakeDns();
    $asset = MonitoredAsset::factory()->create(['type' => 'domain', 'target' => 'missing.test']);

    $check = app(BlacklistCheckerService::class)->checkAsset($asset);

    expect($check->status)->toBe('failed');
});

test('alerts are sent when an asset gets listed and when it is cleared', function () {
    $asset = MonitoredAsset::factory()->create(['target' => '1.2.3.4', 'alert_email' => 'noc@example.test']);
    $checker = fn () => app(BlacklistCheckerService::class)->checkAsset($asset->fresh());

    fakeDns(['4.3.2.1.bl.example.test' => ['127.0.0.2']]);
    $checker();
    $checker();

    Notification::assertSentOnDemandTimes(ListingStatusChanged::class, 1);

    fakeDns();
    $checker();

    Notification::assertSentOnDemandTimes(ListingStatusChanged::class, 2);
    Notification::assertSentOnDemand(ListingStatusChanged::class, fn (ListingStatusChanged $notification) => $notification->isListed === false);
});

test('findings that disappear are marked as delisted and keep the first seen date', function () {
    $asset = MonitoredAsset::factory()->create(['target' => '1.2.3.4']);

    fakeDns(['4.3.2.1.bl.example.test' => ['127.0.0.2']]);
    $this->travelTo(now()->subDay());
    app(BlacklistCheckerService::class)->checkAsset($asset);
    $this->travelBack();
    app(BlacklistCheckerService::class)->checkAsset($asset);

    expect(ReputationFinding::query()->distinct()->count('listed_at'))->toBe(1);

    fakeDns();
    app(BlacklistCheckerService::class)->checkAsset($asset);

    expect(ReputationFinding::whereNull('delisted_at')->count())->toBe(0);
});
