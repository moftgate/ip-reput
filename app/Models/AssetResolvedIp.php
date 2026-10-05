<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AssetResolvedIp extends Model
{
    use HasFactory;

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

    public function asset(): BelongsTo
    {
        return $this->belongsTo(MonitoredAsset::class, 'monitored_asset_id');
    }
}
