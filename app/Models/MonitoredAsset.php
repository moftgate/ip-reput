<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class MonitoredAsset extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'type',
        'target',
        'frequency',
        'highest_threat_level',
        'active_listings_count',
        'last_checked_at',
        'alert_email',
        'is_active',
    ];

    protected $casts = [
        'last_checked_at' => 'datetime',
        'is_active' => 'boolean',
        'active_listings_count' => 'integer',
    ];

    public function resolvedIps(): HasMany
    {
        return $this->hasMany(AssetResolvedIp::class);
    }

    public function checks(): HasMany
    {
        return $this->hasMany(ReputationCheck::class)->latest();
    }

    public function findings(): HasMany
    {
        return $this->hasMany(ReputationFinding::class);
    }
}
