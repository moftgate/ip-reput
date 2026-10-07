<?php

namespace Database\Factories;

use App\Models\MonitoredAsset;
use App\Models\ReputationCheck;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<ReputationCheck>
 */
class ReputationCheckFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'monitored_asset_id' => MonitoredAsset::factory(),
            'total_sources_queried' => 0,
            'listed_count' => 0,
            'counted_threat_count' => 0,
            'failed_sources_count' => 0,
            'highest_threat_level' => 'clean',
            'status' => 'completed',
        ];
    }
}
