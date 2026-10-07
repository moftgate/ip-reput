<?php

namespace App\Models;

use App\Services\LicenseVerifier;
use Illuminate\Database\Eloquent\Model;

class LicenseSetting extends Model
{
    protected $fillable = [
        'license_key',
        'plan_name',
        'is_active',
        'expires_at',
        'max_assets',
        'contact_email',
    ];

    protected $hidden = [
        'license_key',
    ];

    protected $casts = [
        'is_active' => 'boolean',
        'expires_at' => 'datetime',
        'max_assets' => 'integer',
    ];

    /**
     * A license is valid only when a signed key is stored, it verifies and it has not expired.
     */
    public static function isLicenseValid(): bool
    {
        $setting = static::first();

        return $setting !== null && $setting->isValid();
    }

    public function isValid(): bool
    {
        if (! $this->is_active || ! $this->license_key) {
            return false;
        }

        if (app(LicenseVerifier::class)->verify($this->license_key) === null) {
            return false;
        }

        return ! ($this->expires_at && $this->expires_at->isPast());
    }

    public static function maxAssets(): int
    {
        return static::first()->max_assets ?? 0;
    }
}
