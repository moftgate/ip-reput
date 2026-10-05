<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class LicenseSetting extends Model
{
    use HasFactory;

    protected $fillable = [
        'license_key',
        'plan_name',
        'is_active',
        'expires_at',
        'max_assets',
        'contact_email',
    ];

    protected $casts = [
        'is_active' => 'boolean',
        'expires_at' => 'datetime',
        'max_assets' => 'integer',
    ];

    public static function isLicenseValid(): bool
    {
        $setting = static::first();
        if (! $setting) {
            return true; // Default aktivasyon var
        }

        if (! $setting->is_active) {
            return false;
        }

        if ($setting->expires_at && $setting->expires_at->isPast()) {
            return false;
        }

        return true;
    }
}
