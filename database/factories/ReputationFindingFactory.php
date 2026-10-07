<?php

namespace Database\Factories;

use App\Models\BlacklistProvider;
use App\Models\ReputationCheck;
use App\Models\ReputationFinding;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<ReputationFinding>
 */
class ReputationFindingFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'reputation_check_id' => ReputationCheck::factory(),
            'monitored_asset_id' => fn (array $attributes) => ReputationCheck::whereKey($attributes['reputation_check_id'])->value('monitored_asset_id'),
            'blacklist_provider_id' => BlacklistProvider::factory(),
            'ip_address' => fake()->ipv4(),
            'is_listed' => true,
            'response_code' => '127.0.0.2',
            'threat_level' => 'high',
            'is_counted' => true,
            'listed_at' => now(),
        ];
    }
}
