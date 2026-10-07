<?php

namespace App\Services;

class DnsResolverService
{
    public function __construct(
        protected DnsLookup $dns
    ) {}

    /**
     * Resolves IPv4 addresses from domain (A and MX records)
     *
     * @return array<int, array{ip: string, record_type: string, hostname: ?string}>
     */
    public function resolve(string $target, string $type = 'domain'): array
    {
        if ($type === 'ip') {
            $ip = trim($target);

            return filter_var($ip, FILTER_VALIDATE_IP, FILTER_FLAG_IPV4)
                ? [['ip' => $ip, 'record_type' => 'IP', 'hostname' => null]]
                : [];
        }

        $domain = idn_to_ascii(trim($target)) ?: trim($target);
        $resolved = [];

        foreach ($this->dns->a($domain) ?? [] as $ip) {
            $resolved[] = ['ip' => $ip, 'record_type' => 'A', 'hostname' => $domain];
        }

        foreach ($this->dns->mx($domain) as $mxHost) {
            foreach ($this->dns->a($mxHost) ?? [] as $ip) {
                $resolved[] = ['ip' => $ip, 'record_type' => 'MX', 'hostname' => $mxHost];
            }
        }

        // Benzersiz IP ve Record tipi eşleşmelerini koru
        $unique = [];
        foreach ($resolved as $item) {
            $unique[$item['ip'].'|'.$item['record_type']] ??= $item;
        }

        return array_values($unique);
    }
}
