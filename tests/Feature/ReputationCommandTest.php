<?php

use App\Models\MonitoredAsset;

test('only assets whose weekly or monthly check is due are selected', function () {
    $dueWeekly = MonitoredAsset::factory()->create(['frequency' => 'weekly', 'last_checked_at' => now()->subDays(8)]);
    $dueMonthly = MonitoredAsset::factory()->create(['frequency' => 'monthly', 'last_checked_at' => null]);
    MonitoredAsset::factory()->create(['frequency' => 'weekly', 'last_checked_at' => now()->subDay()]);
    MonitoredAsset::factory()->create(['frequency' => 'monthly', 'last_checked_at' => now()->subWeeks(2)]);
    MonitoredAsset::factory()->create(['frequency' => 'manual', 'last_checked_at' => null]);

    expect(MonitoredAsset::due()->pluck('id')->sort()->values()->all())
        ->toBe([$dueWeekly->id, $dueMonthly->id]);
});

test('the check command refuses to run without a valid license', function () {
    $this->artisan('iprep:check')->assertFailed();
});

test('the due check runs on the schedule', function () {
    $this->artisan('schedule:list')->expectsOutputToContain('iprep:check --due');
});
