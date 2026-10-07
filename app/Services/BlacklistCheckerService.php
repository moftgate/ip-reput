<?php

namespace App\Services;

use App\Models\BlacklistProvider;
use App\Models\MonitoredAsset;
use App\Models\ReputationCheck;
use App\Models\ReputationFinding;
use App\Notifications\ListingStatusChanged;
use Illuminate\Support\Facades\Notification;

class BlacklistCheckerService
{
    public const THREAT_PRIORITY = [
        'clean' => 0,
        'low' => 1,
        'medium' => 2,
        'high' => 3,
        'critical' => 4,
    ];

    public function __construct(
        protected DnsResolverService $dnsResolver,
        protected DnsLookup $dns
    ) {}

    /**
     * Run reputation check on a single asset
     */
    public function checkAsset(MonitoredAsset $asset): ReputationCheck
    {
        $previousCheck = $asset->checks()->where('status', 'completed')->first();

        // DNS Resolution (A and MX records dynamically re-resolved every run)
        $resolvedIps = $this->dnsResolver->resolve($asset->target, $asset->type);

        $asset->resolvedIps()->delete();
        foreach ($resolvedIps as $item) {
            $asset->resolvedIps()->create([
                'ip_address' => $item['ip'],
                'record_type' => $item['record_type'],
                'hostname' => $item['hostname'],
                'last_resolved_at' => now(),
            ]);
        }

        $providers = BlacklistProvider::where('is_active', true)->get();
        $uniqueIps = array_values(array_unique(array_column($resolvedIps, 'ip')));

        $check = ReputationCheck::create([
            'monitored_asset_id' => $asset->id,
            'total_sources_queried' => $providers->count() * count($uniqueIps),
            'highest_threat_level' => 'clean',
            'status' => 'running',
        ]);

        if ($uniqueIps === []) {
            $check->update([
                'status' => 'failed',
                'error_message' => $asset->type === 'ip'
                    ? 'Geçerli bir IPv4 adresi değil.'
                    : 'Alan adı için çözümlenen A veya MX kaydı bulunamadı.',
            ]);
            $asset->update(['last_checked_at' => now()]);

            return $check;
        }

        $totalListed = 0;
        $countedThreats = 0;
        $failedSources = 0;
        $highestThreat = 'clean';

        foreach ($uniqueIps as $ip) {
            foreach ($providers as $provider) {
                $result = $this->queryDnsbl($ip, $provider->host);

                if ($result['status'] === 'error') {
                    $failedSources++;

                    continue;
                }

                if ($result['status'] !== 'listed') {
                    continue;
                }

                $totalListed++;
                $threat = $provider->threat_level;

                if ($provider->is_counted) {
                    $countedThreats++;
                    if (self::THREAT_PRIORITY[$threat] > self::THREAT_PRIORITY[$highestThreat]) {
                        $highestThreat = $threat;
                    }
                }

                $firstSeen = ReputationFinding::where('monitored_asset_id', $asset->id)
                    ->where('blacklist_provider_id', $provider->id)
                    ->where('ip_address', $ip)
                    ->whereNull('delisted_at')
                    ->min('listed_at');

                ReputationFinding::create([
                    'reputation_check_id' => $check->id,
                    'monitored_asset_id' => $asset->id,
                    'blacklist_provider_id' => $provider->id,
                    'ip_address' => $ip,
                    'is_listed' => true,
                    'response_code' => $result['response_code'],
                    'response_text' => $result['response_text'] !== null ? mb_substr($result['response_text'], 0, 255) : null,
                    'threat_level' => $threat,
                    'is_counted' => $provider->is_counted,
                    'listed_at' => $firstSeen ?? now(),
                ]);
            }
        }

        $check->update([
            'listed_count' => $totalListed,
            'counted_threat_count' => $countedThreats,
            'failed_sources_count' => $failedSources,
            'highest_threat_level' => $highestThreat,
            'status' => 'completed',
            'error_message' => $failedSources > 0
                ? "{$failedSources} kaynak sorgusu yanıt vermedi veya sorguyu reddetti; sonuç eksik olabilir."
                : null,
        ]);

        $this->markDelistedFindings($asset, $check);

        $asset->update([
            'highest_threat_level' => $highestThreat,
            'active_listings_count' => $countedThreats,
            'last_checked_at' => now(),
        ]);

        $this->notifyOnStatusChange($asset, $previousCheck, $check);

        return $check;
    }

    /**
     * Query a specific DNSBL for an IP
     * Reverse IP + provider host: 1.2.3.4 -> 4.3.2.1.zen.spamhaus.org
     *
     * Only 127.0.0.2 – 127.0.0.255 style answers are real listings. Spamhaus answers
     * 127.255.255.x when it refuses a query (public resolver, rate limit); 127.0.0.1
     * is never a valid listing either. Both are reported as errors, not listings.
     *
     * @return array{status: 'listed'|'not_listed'|'error', response_code: ?string, response_text: ?string}
     */
    public function queryDnsbl(string $ip, string $dnsblHost): array
    {
        $none = ['response_code' => null, 'response_text' => null];

        if (! filter_var($ip, FILTER_VALIDATE_IP, FILTER_FLAG_IPV4)) {
            return ['status' => 'error', ...$none];
        }

        $lookupDomain = implode('.', array_reverse(explode('.', $ip))).'.'.rtrim($dnsblHost, '.');
        $answers = $this->dns->a($lookupDomain);

        if ($answers === null) {
            return ['status' => 'error', ...$none];
        }

        if ($answers === []) {
            return ['status' => 'not_listed', ...$none];
        }

        $listingCodes = array_values(array_filter($answers, fn (string $answer): bool => self::isListingCode($answer)));

        if ($listingCodes === []) {
            return ['status' => 'error', 'response_code' => $answers[0], 'response_text' => null];
        }

        return [
            'status' => 'listed',
            'response_code' => $listingCodes[0],
            'response_text' => $this->dns->txt($lookupDomain),
        ];
    }

    public static function isListingCode(string $answer): bool
    {
        if (! str_starts_with($answer, '127.')) {
            return false;
        }

        if (str_starts_with($answer, '127.255.255.') || $answer === '127.0.0.1') {
            return false;
        }

        return true;
    }

    /**
     * Close findings from the previous check that are no longer reported.
     */
    protected function markDelistedFindings(MonitoredAsset $asset, ReputationCheck $check): void
    {
        $currentKeys = $check->findings()
            ->get(['blacklist_provider_id', 'ip_address'])
            ->map(fn (ReputationFinding $finding): string => $finding->blacklist_provider_id.'|'.$finding->ip_address)
            ->all();

        ReputationFinding::where('monitored_asset_id', $asset->id)
            ->where('reputation_check_id', '!=', $check->id)
            ->whereNull('delisted_at')
            ->get()
            ->reject(fn (ReputationFinding $finding): bool => in_array($finding->blacklist_provider_id.'|'.$finding->ip_address, $currentKeys, true))
            ->each(fn (ReputationFinding $finding) => $finding->update(['delisted_at' => now()]));
    }

    protected function notifyOnStatusChange(MonitoredAsset $asset, ?ReputationCheck $previousCheck, ReputationCheck $check): void
    {
        if (! $asset->alert_email) {
            return;
        }

        $wasListed = ($previousCheck->counted_threat_count ?? 0) > 0;
        $isListed = $check->counted_threat_count > 0;

        if ($wasListed === $isListed) {
            return;
        }

        Notification::route('mail', $asset->alert_email)
            ->notify(new ListingStatusChanged($asset, $isListed));
    }
}
