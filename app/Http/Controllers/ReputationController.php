<?php

namespace App\Http\Controllers;

use App\Models\BlacklistProvider;
use App\Models\LicenseSetting;
use App\Models\MonitoredAsset;
use App\Models\ReputationCheck;
use App\Services\BlacklistCheckerService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class ReputationController extends Controller
{
    public function __construct(
        protected BlacklistCheckerService $checker
    ) {}

    /**
     * Dashboard & Varlık Listesi
     */
    public function index(Request $request): Response
    {
        $selectedAssetId = $request->query('asset_id');

        $assets = MonitoredAsset::with(['resolvedIps', 'checks' => fn ($q) => $q->take(5)])
            ->orderBy('created_at', 'desc')
            ->get();

        $selectedAsset = null;
        $history = [];
        $latestFindings = [];

        if ($assets->isNotEmpty()) {
            $selectedAsset = $selectedAssetId
                ? $assets->firstWhere('id', (int) $selectedAssetId) ?? $assets->first()
                : $assets->first();

            if ($selectedAsset) {
                $history = ReputationCheck::where('monitored_asset_id', $selectedAsset->id)
                    ->orderBy('created_at', 'desc')
                    ->take(15)
                    ->get();

                $latestCheck = $selectedAsset->checks()->first();
                if ($latestCheck) {
                    $latestFindings = $latestCheck->findings()
                        ->with('provider')
                        ->orderBy('is_listed', 'desc')
                        ->orderByRaw("CASE 
                            WHEN threat_level = 'critical' THEN 1 
                            WHEN threat_level = 'high' THEN 2 
                            WHEN threat_level = 'medium' THEN 3 
                            WHEN threat_level = 'low' THEN 4 
                            ELSE 5 END")
                        ->get();
                }
            }
        }

        $providers = BlacklistProvider::orderBy('is_counted', 'desc')->get();
        $license = LicenseSetting::first();

        // İstatistikler
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
            'providers' => $providers,
            'license' => $license,
            'stats' => $stats,
        ]);
    }

    /**
     * Yeni Varlık Ekle (Domain / IP)
     */
    public function storeAsset(Request $request): RedirectResponse
    {
        $license = LicenseSetting::first();
        if ($license && ! $license->is_active) {
            return back()->with('error', 'Lisansınız aktif değil veya süresi dolmuş.');
        }

        $validated = $request->validate([
            'name' => 'nullable|string|max:100',
            'type' => 'required|in:domain,ip',
            'target' => 'required|string|max:255',
            'frequency' => 'required|in:manual,weekly,monthly',
            'alert_email' => 'nullable|email|max:150',
        ]);

        $asset = MonitoredAsset::create([
            'name' => $validated['name'] ?? null,
            'type' => $validated['type'],
            'target' => trim($validated['target']),
            'frequency' => $validated['frequency'],
            'alert_email' => $validated['alert_email'] ?? null,
            'is_active' => true,
        ]);

        // Kural 02: İlk sorgu varlık oluşturulunca yapılır
        try {
            $this->checker->checkAsset($asset);
        } catch (\Throwable $e) {
            // Log & continue
        }

        return redirect()->route('home', ['asset_id' => $asset->id])
            ->with('success', 'Varlık eklendi ve ilk itibar sorgusu tamamlandı.');
    }

    /**
     * Tekil Varlık Sorgusunu Yeniden Çalıştır
     */
    public function checkSingle(MonitoredAsset $asset): RedirectResponse
    {
        if (! LicenseSetting::isLicenseValid()) {
            return back()->with('error', 'Lisansınızın süresi dolmuş. Yalnızca geçmiş görüntüleme yapılabilir.');
        }

        $this->checker->checkAsset($asset);

        return redirect()->route('home', ['asset_id' => $asset->id])
            ->with('success', "{$asset->target} için sorgu güncellendi.");
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

        foreach ($assets as $asset) {
            try {
                $this->checker->checkAsset($asset);
            } catch (\Throwable $e) {
                // Ignore single failure
            }
        }

        return back()->with('success', "Toplam {$assets->count()} varlık için kontrol tamamlandı.");
    }

    /**
     * Varlık Silme
     */
    public function destroyAsset(MonitoredAsset $asset): RedirectResponse
    {
        $asset->delete();

        return redirect()->route('home')->with('success', 'Varlık başarıyla silindi.');
    }

    /**
     * Lisans Güncelleme
     */
    public function updateLicense(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'license_key' => 'required|string',
            'plan_name' => 'required|string',
            'contact_email' => 'nullable|email',
        ]);

        $license = LicenseSetting::firstOrCreate(['id' => 1]);
        $license->update([
            'license_key' => $validated['license_key'],
            'plan_name' => $validated['plan_name'],
            'contact_email' => $validated['contact_email'] ?? null,
            'is_active' => true,
            'expires_at' => now()->addYear(),
        ]);

        return back()->with('success', 'Lisans bilgileri güncellendi.');
    }
}
