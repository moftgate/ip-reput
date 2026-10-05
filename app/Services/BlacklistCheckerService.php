<?php

namespace App\Services;

use App\Models\BlacklistProvider;
use App\Models\MonitoredAsset;
use App\Models\ReputationCheck;
use App\Models\ReputationFinding;

class BlacklistCheckerService
{
    public function __construct(
        protected DnsResolverService $dnsResolver
    ) {}

    /**
     * Run reputation check on a single asset
     */
    public function checkAsset(MonitoredAsset $asset): ReputationCheck
    {
        // 1. DNS Resolution (A and MX records dynamically re-resolved every run)
        $resolvedIps = $this->dnsResolver->resolve($asset->target, $asset->type);

        // Update resolved IPs in DB
        $asset->resolvedIps()->delete();
        foreach ($resolvedIps as $item) {
            $asset->resolvedIps()->create([
                'ip_address' => $item['ip'],
                'record_type' => $item['record_type'],
                'hostname' => $item['hostname'],
                'last_resolved_at' => now(),
            ]);
        }

        // Active providers
        $providers = BlacklistProvider::where('is_active', true)->get();

        $check = ReputationCheck::create([
            'monitored_asset_id' => $asset->id,
            'total_sources_queried' => count($providers) * max(1, count($resolvedIps)),
            'listed_count' => 0,
            'counted_threat_count' => 0,
            'highest_threat_level' => 'clean',
            'status' => 'running',
        ]);

        $uniqueIps = array_unique(array_column($resolvedIps, 'ip'));
        $totalListed = 0;
        $countedThreats = 0;
        $highestThreat = 'clean';

        $threatPriority = [
            'clean' => 0,
            'low' => 1,
            'medium' => 2,
            'high' => 3,
            'critical' => 4,
        ];

        // If no IPs were resolved (e.g. invalid domain or DNS failure)
        if (empty($uniqueIps)) {
            $check->update([
                'status' => 'completed',
                'error_message' => 'Alan adı için çözümlenen A veya MX kaydı bulunamadı.',
            ]);
            $asset->update([
                'last_checked_at' => now(),
                'highest_threat_level' => 'clean',
                'active_listings_count' => 0,
            ]);

            return $check;
        }

        foreach ($uniqueIps as $ip) {
            foreach ($providers as $provider) {
                $result = $this->queryDnsbl($ip, $provider->host);

                if ($result['is_listed']) {
                    $totalListed++;
                    $threat = $provider->threat_level;

                    if ($provider->is_counted) {
                        $countedThreats++;
                        if ($threatPriority[$threat] > $threatPriority[$highestThreat]) {
                            $highestThreat = $threat;
                        }
                    }

                    ReputationFinding::create([
                        'reputation_check_id' => $check->id,
                        'monitored_asset_id' => $asset->id,
                        'blacklist_provider_id' => $provider->id,
                        'ip_address' => $ip,
                        'is_listed' => true,
                        'response_code' => $result['response_code'],
                        'response_text' => $result['response_text'],
                        'threat_level' => $threat,
                        'is_counted' => $provider->is_counted,
                        'listed_at' => now(),
                    ]);
                }
            }
        }

        $check->update([
            'listed_count' => $totalListed,
            'counted_threat_count' => $countedThreats,
            'highest_threat_level' => $highestThreat,
            'status' => 'completed',
        ]);

        $asset->update([
            'highest_threat_level' => $highestThreat,
            'active_listings_count' => $countedThreats,
            'last_checked_at' => now(),
        ]);

        return $check;
    }

    /**
     * Query a specific DNSBL for an IP
     * Reverse IP + provider host: 1.2.3.4 -> 4.3.2.1.zen.spamhaus.org
     *
     * @return array{is_listed: bool, response_code: ?string, response_text: ?string}
     */
    public function queryDnsbl(string $ip, string $dnsblHost): array
    {
        $parts = explode('.', $ip);
        if (count($parts) !== 4) {
            return ['is_listed' => false, 'response_code' => null, 'response_text' => null];
        }

        $reversedIp = implode('.', array_reverse($parts));
        $lookupDomain = $reversedIp.'.'.rtrim($dnsblHost, '.');

        // Fast DNS A record lookup
        $ipResult = @gethostbyname($lookupDomain);

        if ($ipResult !== $lookupDomain && str_starts_with($ipResult, '127.')) {
            // DNSBL listed
            $txtRecords = @dns_get_record($lookupDomain, DNS_TXT);
            $txt = null;
            if (is_array($txtRecords) && ! empty($txtRecords)) {
                $txt = $txtRecords[0]['txt'] ?? null;
            }

            return [
                'is_listed' => true,
                'response_code' => $ipResult,
                'response_text' => $txt,
            ];
        }

        return [
            'is_listed' => false,
            'response_code' => null,
            'response_text' => null,
        ];
    }
}
