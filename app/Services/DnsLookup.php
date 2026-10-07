<?php

namespace App\Services;

/**
 * Thin wrapper around PHP's resolver so DNS can be faked in tests.
 */
class DnsLookup
{
    /**
     * Resolve IPv4 A records. Returns null when the lookup itself failed (timeout, SERVFAIL).
     *
     * @return array<int, string>|null
     */
    public function a(string $hostname): ?array
    {
        $records = @dns_get_record($hostname, DNS_A);

        if ($records === false) {
            return null;
        }

        return array_values(array_filter(array_map(fn (array $record): ?string => $record['ip'] ?? null, $records)));
    }

    /**
     * Resolve MX target hostnames.
     *
     * @return array<int, string>
     */
    public function mx(string $hostname): array
    {
        $records = @dns_get_record($hostname, DNS_MX);

        if (! is_array($records)) {
            return [];
        }

        return array_values(array_filter(array_map(fn (array $record): ?string => $record['target'] ?? null, $records)));
    }

    /**
     * Resolve the first TXT record value.
     */
    public function txt(string $hostname): ?string
    {
        $records = @dns_get_record($hostname, DNS_TXT);

        if (! is_array($records) || $records === []) {
            return null;
        }

        return $records[0]['txt'] ?? null;
    }
}
