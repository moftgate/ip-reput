<?php

namespace App\Services;

class DnsResolverService
{
    /**
     * Resolves IPv4 addresses from domain (A and MX records)
     *
     * @return array<int, array{ip: string, record_type: string, hostname: ?string}>
     */
    public function resolve(string $target, string $type = 'domain'): array
    {
        $resolved = [];

        if ($type === 'ip') {
            $ip = trim($target);
            if (filter_var($ip, FILTER_VALIDATE_IP, FILTER_FLAG_IPV4)) {
                $resolved[] = [
                    'ip' => $ip,
                    'record_type' => 'IP',
                    'hostname' => null,
                ];
            }

            return $resolved;
        }

        $domain = idn_to_ascii(trim($target));
        if (! $domain) {
            $domain = trim($target);
        }

        // 1. Resolve A records
        $aRecords = @dns_get_record($domain, DNS_A);
        if (is_array($aRecords)) {
            foreach ($aRecords as $rec) {
                if (! empty($rec['ip'])) {
                    $resolved[] = [
                        'ip' => $rec['ip'],
                        'record_type' => 'A',
                        'hostname' => $domain,
                    ];
                }
            }
        }

        // 2. Resolve MX records
        $mxRecords = @dns_get_record($domain, DNS_MX);
        if (is_array($mxRecords)) {
            foreach ($mxRecords as $mx) {
                $mxHost = $mx['target'] ?? null;
                if ($mxHost) {
                    $mxARecords = @dns_get_record($mxHost, DNS_A);
                    if (is_array($mxARecords)) {
                        foreach ($mxARecords as $rec) {
                            if (! empty($rec['ip'])) {
                                $resolved[] = [
                                    'ip' => $rec['ip'],
                                    'record_type' => 'MX',
                                    'hostname' => $mxHost,
                                ];
                            }
                        }
                    }
                }
            }
        }

        // Benzersiz IP ve Record tipi eşleşmelerini koru
        $unique = [];
        foreach ($resolved as $item) {
            $key = $item['ip'].'|'.$item['record_type'];
            if (! isset($unique[$key])) {
                $unique[$key] = $item;
            }
        }

        return array_values($unique);
    }
}
