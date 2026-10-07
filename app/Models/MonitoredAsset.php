<?php

namespace App\Models;

use Database\Factories\MonitoredAssetFactory;
use Illuminate\Database\Eloquent\Attributes\Scope;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class MonitoredAsset extends Model
{
    /** @use HasFactory<MonitoredAssetFactory> */
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

    /**
     * @return HasMany<AssetResolvedIp, $this>
     */
    public function resolvedIps(): HasMany
    {
        return $this->hasMany(AssetResolvedIp::class);
    }

    /**
     * @return HasMany<ReputationCheck, $this>
     */
    public function checks(): HasMany
    {
        return $this->hasMany(ReputationCheck::class)->latest();
    }

    /**
     * @return HasMany<ReputationFinding, $this>
     */
    public function findings(): HasMany
    {
        return $this->hasMany(ReputationFinding::class);
    }

    /**
     * Assets whose weekly/monthly automatic check is due.
     *
     * @param  Builder<MonitoredAsset>  $query
     */
    #[Scope]
    protected function due(Builder $query): void
    {
        $query->where(function (Builder $query) {
            $query->where(function (Builder $query) {
                $query->where('frequency', 'weekly')
                    ->where(fn (Builder $query) => $query->whereNull('last_checked_at')->orWhere('last_checked_at', '<=', now()->subWeek()));
            })->orWhere(function (Builder $query) {
                $query->where('frequency', 'monthly')
                    ->where(fn (Builder $query) => $query->whereNull('last_checked_at')->orWhere('last_checked_at', '<=', now()->subMonth()));
            });
        });
    }
}
