<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class ReputationCheck extends Model
{
    use HasFactory;

    protected $fillable = [
        'monitored_asset_id',
        'total_sources_queried',
        'listed_count',
        'counted_threat_count',
        'highest_threat_level',
        'status',
        'error_message',
    ];

    protected $casts = [
        'total_sources_queried' => 'integer',
        'listed_count' => 'integer',
        'counted_threat_count' => 'integer',
    ];

    public function asset(): BelongsTo
    {
        return $this->belongsTo(MonitoredAsset::class, 'monitored_asset_id');
    }

    public function findings(): HasMany
    {
        return $this->hasMany(ReputationFinding::class);
    }
}
