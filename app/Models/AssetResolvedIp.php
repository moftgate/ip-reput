<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AssetResolvedIp extends Model
{
    protected $fillable = [
        'monitored_asset_id',
        'ip_address',
        'record_type',
        'hostname',
        'last_resolved_at',
    ];

    protected $casts = [
        'last_resolved_at' => 'datetime',
    ];

    /**
     * @return BelongsTo<MonitoredAsset, $this>
     */
    public function asset(): BelongsTo
    {
        return $this->belongsTo(MonitoredAsset::class, 'monitored_asset_id');
    }
}
