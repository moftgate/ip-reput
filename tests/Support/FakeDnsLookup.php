<?php

namespace Tests\Support;

use App\Services\DnsLookup;

class FakeDnsLookup extends DnsLookup
{
    /**
     * @param  array<string, array<int, string>|null>  $aRecords
     * @param  array<string, array<int, string>>  $mxRecords
     */
    public function __construct(
        public array $aRecords = [],
        public array $mxRecords = [],
    ) {}

    public function a(string $hostname): ?array
    {
        return array_key_exists($hostname, $this->aRecords) ? $this->aRecords[$hostname] : [];
    }

    public function mx(string $hostname): array
    {
        return $this->mxRecords[$hostname] ?? [];
    }

    public function txt(string $hostname): ?string
    {
        return null;
    }
}
