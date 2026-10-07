<?php

namespace App\Models;

use Database\Factories\BlacklistProviderFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class BlacklistProvider extends Model
{
    /** @use HasFactory<BlacklistProviderFactory> */
    use HasFactory;

    protected $fillable = [
        'name',
        'host',
        'threat_level',
        'category',
        'is_counted',
        'is_active',
        'delist_url',
        'description',
    ];

    protected $casts = [
        'is_counted' => 'boolean',
        'is_active' => 'boolean',
    ];

    /**
     * @return HasMany<ReputationFinding, $this>
     */
    public function findings(): HasMany
    {
        return $this->hasMany(ReputationFinding::class);
    }
}
