<?php

namespace Database\Factories;

use App\Models\BlacklistProvider;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<BlacklistProvider>
 */
class BlacklistProviderFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'name' => fake()->words(2, true),
            'host' => fake()->unique()->domainName(),
            'threat_level' => 'high',
            'category' => 'spam',
            'is_counted' => true,
            'is_active' => true,
        ];
    }
}
