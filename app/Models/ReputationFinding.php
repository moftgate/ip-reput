<?php

namespace App\Models;

use Database\Factories\ReputationFindingFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ReputationFinding extends Model
{
    /** @use HasFactory<ReputationFindingFactory> */
    use HasFactory;

    protected $fillable = [
        'reputation_check_id',
        'monitored_asset_id',
        'blacklist_provider_id',
        'ip_address',
        'is_listed',
        'response_code',
        'response_text',
        'threat_level',
        'is_counted',
        'listed_at',
        'delisted_at',
    ];

    protected $casts = [
        'is_listed' => 'boolean',
        'is_counted' => 'boolean',
        'listed_at' => 'datetime',
        'delisted_at' => 'datetime',
    ];

    /**
     * @return BelongsTo<ReputationCheck, $this>
     */
    public function check(): BelongsTo
    {
        return $this->belongsTo(ReputationCheck::class, 'reputation_check_id');
    }

    /**
     * @return BelongsTo<MonitoredAsset, $this>
     */
    public function asset(): BelongsTo
    {
        return $this->belongsTo(MonitoredAsset::class, 'monitored_asset_id');
    }

    /**
     * @return BelongsTo<BlacklistProvider, $this>
     */
    public function provider(): BelongsTo
    {
        return $this->belongsTo(BlacklistProvider::class, 'blacklist_provider_id');
    }
}
