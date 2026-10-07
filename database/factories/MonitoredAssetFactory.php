<?php

namespace Database\Factories;

use App\Models\MonitoredAsset;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<MonitoredAsset>
 */
class MonitoredAssetFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'name' => fake()->company(),
            'type' => 'ip',
            'target' => fake()->ipv4(),
            'frequency' => 'weekly',
            'highest_threat_level' => 'clean',
            'active_listings_count' => 0,
            'alert_email' => null,
            'is_active' => true,
        ];
    }
}
