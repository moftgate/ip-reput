<?php

namespace App\Http\Controllers;

use App\Jobs\CheckAssetJob;
use App\Models\BlacklistProvider;
use App\Models\LicenseSetting;
use App\Models\MonitoredAsset;
use App\Models\ReputationCheck;
use App\Models\ReputationFinding;
use App\Services\LicenseVerifier;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class ReputationController extends Controller
{
    /**
     * Dashboard & Varlık Listesi
     */
    public function index(Request $request): Response
    {
        $selectedAssetId = $request->integer('asset_id');

        $assets = MonitoredAsset::with('resolvedIps')
            ->orderBy('created_at', 'desc')
            ->get();

        $selectedAsset = $assets->firstWhere('id', $selectedAssetId) ?? $assets->first();
        $history = collect();
        $latestFindings = collect();
        $trend = ['added' => [], 'removed' => []];

        if ($selectedAsset) {
            $history = ReputationCheck::where('monitored_asset_id', $selectedAsset->id)
                ->latest()
                ->latest('id')
                ->take(15)
                ->get();

            $completed = $history->where('status', 'completed')->values();
            $latestCheck = $completed->first();

            if ($latestCheck) {
                $latestFindings = $latestCheck->findings()
                    ->with('provider')
                    ->orderByRaw("CASE
                        WHEN threat_level = 'critical' THEN 1
                        WHEN threat_level = 'high' THEN 2
                        WHEN threat_level = 'medium' THEN 3
                        WHEN threat_level = 'low' THEN 4
                        ELSE 5 END")
                    ->get();

                $previousCheck = $completed->get(1);
                if ($previousCheck) {
                    $trend = $this->compareChecks($previousCheck, $latestCheck);
                }
            }
        }

        $providers = BlacklistProvider::orderBy('is_counted', 'desc')->get();
        $license = LicenseSetting::first();

        $stats = [
            'total_assets' => $assets->count(),
            'clean_assets' => $assets->where('highest_threat_level', 'clean')->count(),
            'at_risk_assets' => $assets->where('highest_threat_level', '!=', 'clean')->count(),
            'critical_count' => $assets->where('highest_threat_level', 'critical')->count(),
            'high_count' => $assets->where('highest_threat_level', 'high')->count(),
            'medium_count' => $assets->where('highest_threat_level', 'medium')->count(),
            'low_count' => $assets->where('highest_threat_level', 'low')->count(),
            'total_providers' => $providers->count(),
            'counted_providers' => $providers->where('is_counted', true)->count(),
            'policy_providers' => $providers->where('is_counted', false)->count(),
        ];

        return Inertia::render('welcome', [
            'assets' => $assets,
            'selectedAsset' => $selectedAsset,
            'history' => $history,
            'latestFindings' => $latestFindings,
            'trend' => $trend,
            'providers' => $providers,
            'license' => $license ? [
                'plan_name' => $license->plan_name,
                'is_active' => $license->isValid(),
                'expires_at' => $license->expires_at,
                'max_assets' => $license->max_assets,
                'contact_email' => $license->contact_email,
            ] : null,
            'stats' => $stats,
        ]);
    }

    /**
     * Yeni Varlık Ekle (Domain / IP)
     */
    public function storeAsset(Request $request): RedirectResponse
    {
        if (! LicenseSetting::isLicenseValid()) {
            return back()->with('error', 'Geçerli bir lisans yok. Varlık eklemek için lisans anahtarı girin.');
        }

        if (MonitoredAsset::count() >= LicenseSetting::maxAssets()) {
            return back()->with('error', 'Lisansınızın izin verdiği en fazla varlık sayısına ulaştınız.');
        }

        $validated = $request->validate([
            'name' => 'nullable|string|max:100',
            'type' => 'required|in:domain,ip',
            'target' => [
                'required',
                'string',
                'max:255',
                Rule::when($request->input('type') === 'ip', ['ipv4']),
                Rule::when($request->input('type') === 'domain', ['regex:/^(?=.{1,253}$)(?!-)([\p{L}\p{N}-]{1,63}(?<!-)\.)+[\p{L}]{2,63}$/u']),
                Rule::unique('monitored_assets', 'target'),
            ],
            'frequency' => 'required|in:manual,weekly,monthly',
            'alert_email' => 'nullable|email|max:150',
        ], [
            'target.ipv4' => 'Geçerli bir IPv4 adresi girin.',
            'target.regex' => 'Geçerli bir alan adı girin (örn. ornek.com).',
            'target.unique' => 'Bu varlık zaten izleniyor.',
        ]);

        $asset = MonitoredAsset::create([
            'name' => $validated['name'] ?? null,
            'type' => $validated['type'],
            'target' => mb_strtolower(trim($validated['target'])),
            'frequency' => $validated['frequency'],
            'alert_email' => $validated['alert_email'] ?? null,
            'is_active' => true,
        ]);

        // Kural 02: İlk sorgu varlık oluşturulunca yapılır
        CheckAssetJob::dispatch($asset);

        return redirect()->route('home', ['asset_id' => $asset->id])
            ->with('success', 'Varlık eklendi. İlk itibar sorgusu arka planda çalışıyor.');
    }

    /**
     * Tekil Varlık Sorgusunu Yeniden Çalıştır
     */
    public function checkSingle(MonitoredAsset $asset): RedirectResponse
    {
        if (! LicenseSetting::isLicenseValid()) {
            return back()->with('error', 'Lisansınızın süresi dolmuş. Yalnızca geçmiş görüntüleme yapılabilir.');
        }

        CheckAssetJob::dispatch($asset);

        return redirect()->route('home', ['asset_id' => $asset->id])
            ->with('success', "{$asset->target} için sorgu kuyruğa alındı.");
    }

    /**
     * Tek Komutta Toplu Kontrol (Tüm Varlıklar)
     */
    public function checkAll(): RedirectResponse
    {
        if (! LicenseSetting::isLicenseValid()) {
            return back()->with('error', 'Lisansınızın süresi dolmuş. Yalnızca geçmiş görüntüleme yapılabilir.');
        }

        $assets = MonitoredAsset::where('is_active', true)->get();
        $assets->each(fn (MonitoredAsset $asset) => CheckAssetJob::dispatch($asset));

        return back()->with('success', "{$assets->count()} varlık için sorgu kuyruğa alındı.");
    }

    /**
     * Varlık Silme
     */
    public function destroyAsset(MonitoredAsset $asset): RedirectResponse
    {
        $asset->delete();

        return redirect()->route('home')->with('success', 'Varlık silindi.');
    }

    /**
     * Lisans Güncelleme
     */
    public function updateLicense(Request $request, LicenseVerifier $verifier): RedirectResponse
    {
        $validated = $request->validate([
            'license_key' => 'required|string|max:2000',
            'contact_email' => 'nullable|email|max:150',
        ]);

        $payload = $verifier->verify($validated['license_key']);

        if ($payload === null) {
            return back()->withErrors(['license_key' => 'Lisans anahtarı doğrulanamadı.']);
        }

        $expiresAt = $payload['expires_at'] ? Carbon::parse($payload['expires_at']) : null;

        if ($expiresAt?->isPast()) {
            return back()->withErrors(['license_key' => 'Bu lisans anahtarının süresi dolmuş.']);
        }

        LicenseSetting::updateOrCreate(['id' => 1], [
            'license_key' => trim($validated['license_key']),
            'plan_name' => $payload['plan'],
            'max_assets' => $payload['max_assets'],
            'contact_email' => $validated['contact_email'] ?? null,
            'is_active' => true,
            'expires_at' => $expiresAt,
        ]);

        return back()->with('success', 'Lisans doğrulandı ve kaydedildi.');
    }

    /**
     * Sources that started or stopped listing between two checks.
     *
     * @return array{added: array<int, array{provider: string, ip_address: string, threat_level: string}>, removed: array<int, array{provider: string, ip_address: string, threat_level: string}>}
     */
    protected function compareChecks(ReputationCheck $previous, ReputationCheck $latest): array
    {
        $keyed = fn (ReputationCheck $check): Collection => $check->findings()->with('provider')->get()
            ->keyBy(fn (ReputationFinding $finding): string => $finding->blacklist_provider_id.'|'.$finding->ip_address);

        $before = $keyed($previous);
        $after = $keyed($latest);

        $format = fn (ReputationFinding $finding): array => [
            'provider' => $finding->provider->name ?? '-',
            'ip_address' => $finding->ip_address,
            'threat_level' => $finding->threat_level,
        ];

        return [
            'added' => $after->diffKeys($before)->map($format)->values()->all(),
            'removed' => $before->diffKeys($after)->map($format)->values()->all(),
        ];
    }
}
