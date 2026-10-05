import React, { useState } from 'react';
import { Head, router } from '@inertiajs/react';

interface ResolvedIp {
    id: number;
    ip_address: string;
    record_type: string;
    hostname?: string;
    last_resolved_at?: string;
}

interface ReputationCheck {
    id: number;
    monitored_asset_id: number;
    total_sources_queried: number;
    listed_count: number;
    counted_threat_count: number;
    highest_threat_level: 'clean' | 'low' | 'medium' | 'high' | 'critical';
    status: string;
    error_message?: string;
    created_at: string;
}

interface BlacklistProvider {
    id: number;
    name: string;
    host: string;
    threat_level: 'critical' | 'high' | 'medium' | 'low';
    category: 'spam' | 'abuse' | 'attack' | 'reputation' | 'policy' | 'informational';
    is_counted: boolean;
    delist_url?: string;
    description?: string;
}

interface ReputationFinding {
    id: number;
    ip_address: string;
    is_listed: boolean;
    response_code?: string;
    response_text?: string;
    threat_level: 'clean' | 'low' | 'medium' | 'high' | 'critical';
    is_counted: boolean;
    listed_at?: string;
    provider?: BlacklistProvider;
}

interface MonitoredAsset {
    id: number;
    name?: string;
    type: 'domain' | 'ip';
    target: string;
    frequency: 'manual' | 'weekly' | 'monthly';
    highest_threat_level: 'clean' | 'low' | 'medium' | 'high' | 'critical';
    active_listings_count: number;
    last_checked_at?: string;
    alert_email?: string;
    is_active: boolean;
    resolved_ips?: ResolvedIp[];
    checks?: ReputationCheck[];
}

interface LicenseSetting {
    id: number;
    license_key: string;
    plan_name: string;
    is_active: boolean;
    expires_at?: string;
    max_assets: number;
    contact_email?: string;
}

interface Stats {
    total_assets: number;
    clean_assets: number;
    at_risk_assets: number;
    critical_count: number;
    high_count: number;
    medium_count: number;
    low_count: number;
    total_providers: number;
    counted_providers: number;
    policy_providers: number;
}

interface Props {
    assets: MonitoredAsset[];
    selectedAsset?: MonitoredAsset | null;
    history: ReputationCheck[];
    latestFindings: ReputationFinding[];
    providers: BlacklistProvider[];
    license?: LicenseSetting | null;
    stats: Stats;
}

export default function Welcome({
    assets = [],
    selectedAsset = null,
    history = [],
    latestFindings = [],
    providers = [],
    license,
    stats,
}: Props) {
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isLicenseModalOpen, setIsLicenseModalOpen] = useState(false);
    const [isCheckingAll, setIsCheckingAll] = useState(false);
    const [isCheckingCurrent, setIsCheckingCurrent] = useState(false);

    // Form states
    const [newName, setNewName] = useState('');
    const [newType, setNewType] = useState<'domain' | 'ip'>('domain');
    const [newTarget, setNewTarget] = useState('');
    const [newFrequency, setNewFrequency] = useState<'manual' | 'weekly' | 'monthly'>('weekly');
    const [newAlertEmail, setNewAlertEmail] = useState('');

    const [licenseKey, setLicenseKey] = useState(license?.license_key || '');
    const [licensePlan, setLicensePlan] = useState(license?.plan_name || 'Enterprise Suite');
    const [licenseEmail, setLicenseEmail] = useState(license?.contact_email || '');

    const handleCreateAsset = (e: React.FormEvent) => {
        e.preventDefault();
        router.post('/assets', {
            name: newName,
            type: newType,
            target: newTarget,
            frequency: newFrequency,
            alert_email: newAlertEmail,
        }, {
            onSuccess: () => {
                setIsAddModalOpen(false);
                setNewName('');
                setNewTarget('');
                setNewAlertEmail('');
            },
        });
    };

    const handleCheckSingle = (assetId: number) => {
        setIsCheckingCurrent(true);
        router.post(`/assets/${assetId}/check`, {}, {
            onFinish: () => setIsCheckingCurrent(false),
        });
    };

    const handleCheckAll = () => {
        setIsCheckingAll(true);
        router.post('/assets/check-all', {}, {
            onFinish: () => setIsCheckingAll(false),
        });
    };

    const handleDeleteAsset = (assetId: number) => {
        if (confirm('Bu varlığı izlemeden kaldırmak istediğinize emin misiniz?')) {
            router.delete(`/assets/${assetId}`);
        }
    };

    const handleUpdateLicense = (e: React.FormEvent) => {
        e.preventDefault();
        router.post('/license/update', {
            license_key: licenseKey,
            plan_name: licensePlan,
            contact_email: licenseEmail,
        }, {
            onSuccess: () => setIsLicenseModalOpen(false),
        });
    };

    const getThreatBadge = (level: string) => {
        switch (level) {
            case 'critical':
                return <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200"><span className="w-1.5 h-1.5 rounded-full bg-rose-600 animate-pulse"></span>Kritik Tehdit</span>;
            case 'high':
                return <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200"><span className="w-1.5 h-1.5 rounded-full bg-amber-600"></span>Yüksek Risk</span>;
            case 'medium':
                return <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-yellow-50 text-yellow-800 border border-yellow-200"><span className="w-1.5 h-1.5 rounded-full bg-yellow-600"></span>Orta Seviye</span>;
            case 'low':
                return <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200"><span className="w-1.5 h-1.5 rounded-full bg-blue-600"></span>Düşük (Bilgi)</span>;
            case 'clean':
            default:
                return <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200"><span className="w-1.5 h-1.5 rounded-full bg-emerald-600"></span>Temiz (Listede Yok)</span>;
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-sans selection:bg-indigo-600 selection:text-white">
            <Head title="IP İtibar & Kara Liste İzleme Platformu" />

            {/* Top Navigation */}
            <header className="border-b border-slate-200 bg-white/80 backdrop-blur-md sticky top-0 z-40 shadow-xs">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-sky-400 p-[1px] shadow-sm">
                            <div className="h-full w-full bg-white rounded-[11px] flex items-center justify-center">
                                <svg className="w-5 h-5 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                                </svg>
                            </div>
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <span className="font-bold text-lg tracking-tight text-slate-900">IPREP</span>
                                <span className="text-xs font-mono uppercase bg-indigo-50 text-indigo-700 border border-indigo-200 px-2 py-0.5 rounded font-semibold">İtibar & Kara Liste</span>
                            </div>
                            <p className="text-xs text-slate-500">DNSBL / RBL Gerçek Zamanlı SMTP Teslimat Denetleyicisi</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        {/* Toplu Kontrol Butonu */}
                        <button
                            onClick={handleCheckAll}
                            disabled={isCheckingAll}
                            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-sm font-medium bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 transition shadow-xs disabled:opacity-50"
                        >
                            <svg className={`w-4 h-4 text-indigo-600 ${isCheckingAll ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                            </svg>
                            {isCheckingAll ? 'Toplu Sorgulanıyor...' : 'Tümünü Sorgula'}
                        </button>

                        {/* Yeni Varlık Ekle */}
                        <button
                            onClick={() => setIsAddModalOpen(true)}
                            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-sm font-semibold bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs transition hover:scale-[1.01] active:scale-[0.98]"
                        >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                            </svg>
                            Yeni Varlık Ekle
                        </button>

                        {/* Lisans Durumu Butonu */}
                        <button
                            onClick={() => setIsLicenseModalOpen(true)}
                            className="p-2 rounded-lg bg-white hover:bg-slate-100 border border-slate-300 text-slate-600 hover:text-slate-900 transition shadow-xs"
                            title="Lisans ve Paket Ayarları"
                        >
                            <svg className="w-4 h-4 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                            </svg>
                        </button>
                    </div>
                </div>
            </header>

            {/* Notification Banner / Product Definition Alert */}
            <div className="bg-indigo-50/60 border-b border-indigo-100 py-2.5 px-4">
                <div className="max-w-7xl mx-auto flex items-center justify-between text-xs text-slate-700">
                    <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-indigo-600 animate-pulse"></span>
                        <span className="font-semibold text-indigo-900">Önemli Hatırlatma:</span>
                        <span>Bu ürün zafiyet taraması DEĞİLDİR — dış kara liste, e-posta teslimatı ve itibar kontrolüdür. PBL ve bilgi amaçlı Tor/Barracuda listeleri riski artırmaz; yalnızca spam ve saldırı geçmişi tehdit oluşturur.</span>
                    </div>
                    <div className="hidden md:flex items-center gap-2 font-mono text-[11px] text-slate-500">
                        <span>Lisans: {license?.plan_name || 'Enterprise'}</span>
                        <span className="text-slate-300">•</span>
                        <span className="text-emerald-700 font-semibold">{license?.is_active ? 'Aktif' : 'Geçersiz'}</span>
                    </div>
                </div>
            </div>

            {/* Main Content Area */}
            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1 w-full space-y-8">
                {/* Stats Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs hover:border-slate-300 transition">
                        <div className="text-xs uppercase tracking-wider font-semibold text-slate-500">Toplam İzlenen Varlık</div>
                        <div className="mt-2 flex items-baseline gap-2">
                            <span className="text-3xl font-bold tracking-tight text-slate-900">{stats.total_assets}</span>
                            <span className="text-xs text-slate-500 font-mono">({stats.clean_assets} Temiz)</span>
                        </div>
                        <div className="mt-3 text-xs text-slate-500 flex items-center gap-1">
                            <span className="text-emerald-600 font-semibold">✓ A ve MX</span> kayıtları her turda dinamik çözülür
                        </div>
                    </div>

                    <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs hover:border-slate-300 transition">
                        <div className="text-xs uppercase tracking-wider font-semibold text-slate-500">Risk Taşıyan Varlıklar</div>
                        <div className="mt-2 flex items-baseline gap-2">
                            <span className="text-3xl font-bold tracking-tight text-rose-600">{stats.at_risk_assets}</span>
                            <span className="text-xs text-slate-500 font-mono">/ {stats.total_assets}</span>
                        </div>
                        <div className="mt-3 text-xs text-slate-600 flex items-center gap-2">
                            <span className="text-rose-600 font-semibold">{stats.critical_count} Kritik</span>
                            <span className="text-amber-600 font-semibold">{stats.high_count} Yüksek</span>
                            <span className="text-yellow-600 font-semibold">{stats.medium_count} Orta</span>
                        </div>
                    </div>

                    <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs hover:border-slate-300 transition">
                        <div className="text-xs uppercase tracking-wider font-semibold text-slate-500">Kara Liste Kaynakları</div>
                        <div className="mt-2 flex items-baseline gap-2">
                            <span className="text-3xl font-bold tracking-tight text-indigo-600">{stats.total_providers}</span>
                            <span className="text-xs text-slate-500 font-mono">Veritabanı</span>
                        </div>
                        <div className="mt-3 text-xs text-slate-600">
                            <span className="text-indigo-600 font-medium">{stats.counted_providers} Sayılan Tehdit</span>, {stats.policy_providers} Politika/Bilgi
                        </div>
                    </div>

                    <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs hover:border-slate-300 transition">
                        <div className="text-xs uppercase tracking-wider font-semibold text-slate-500">Otomatik İzleme Döngüsü</div>
                        <div className="mt-2 flex items-baseline gap-2">
                            <span className="text-2xl font-bold tracking-tight text-slate-900">Cron / Haftalık</span>
                        </div>
                        <div className="mt-3 text-xs text-slate-600 flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                            <span>E-posta uyarı mekanizması aktif</span>
                        </div>
                    </div>
                </div>

                {/* Workflow Cards (Nasıl Çalışır - 01 to 05) */}
                <div className="rounded-2xl bg-white border border-slate-200 p-6 shadow-xs">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                        <div>
                            <h2 className="text-base font-semibold text-slate-900 tracking-tight">Nasıl Çalışır? Kurulumdan Rapora</h2>
                            <p className="text-xs text-slate-500">Adım adım itibar denetimi, tehdit seviyelendirmesi ve delist süreci</p>
                        </div>
                        <div className="flex items-center gap-2 text-xs font-mono text-slate-600 bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200">
                            <span className="text-indigo-600 font-bold">SMTP / DNSBL</span>
                            <span>Standardı</span>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                        <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 flex flex-col justify-between">
                            <div>
                                <span className="text-xs font-mono font-bold text-indigo-600">01</span>
                                <h3 className="text-sm font-semibold text-slate-900 mt-1">İzlenecek Varlık</h3>
                                <p className="text-xs text-slate-600 mt-1">Alan adı veya tekil IP seçilir. Alan adında A ve MX kayıtları anında çözülür.</p>
                            </div>
                        </div>

                        <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 flex flex-col justify-between">
                            <div>
                                <span className="text-xs font-mono font-bold text-indigo-600">02</span>
                                <h3 className="text-sm font-semibold text-slate-900 mt-1">Sorgu Başlar</h3>
                                <p className="text-xs text-slate-600 mt-1">Dış kara liste sağlayıcıları sorgulanır: tehdit seviyesi, tarih ve yanıt kodları kaydedilir.</p>
                            </div>
                        </div>

                        <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 flex flex-col justify-between">
                            <div>
                                <span className="text-xs font-mono font-bold text-indigo-600">03</span>
                                <h3 className="text-sm font-semibold text-slate-900 mt-1">Sonuç Tablosu</h3>
                                <p className="text-xs text-slate-600 mt-1">Kaç kaynak listeledi, en yüksek risk seviyesi ve listeleme yoksa temiz durum görünür.</p>
                            </div>
                        </div>

                        <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 flex flex-col justify-between">
                            <div>
                                <span className="text-xs font-mono font-bold text-indigo-600">04</span>
                                <h3 className="text-sm font-semibold text-slate-900 mt-1">Tarihçe & Trend</h3>
                                <p className="text-xs text-slate-600 mt-1">Eski sorgularla karşılaştırma: Hangi kaynak sizi bıraktı, yenisi ekledi mi takip edilir.</p>
                            </div>
                        </div>

                        <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 flex flex-col justify-between">
                            <div>
                                <span className="text-xs font-mono font-bold text-indigo-600">05</span>
                                <h3 className="text-sm font-semibold text-slate-900 mt-1">Listenin Temizlenmesi</h3>
                                <p className="text-xs text-slate-600 mt-1">Delist linkleri ile temizleme süreci başlatılır. Çözülünce e-posta bildirimi iletilir.</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Workspace Split Layout: Asset List & Detailed Overview */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                    {/* Left Column: Asset Selection Table */}
                    <div className="lg:col-span-4 space-y-4">
                        <div className="flex items-center justify-between">
                            <h2 className="text-sm font-semibold text-slate-800 uppercase tracking-wider">İzlenen Varlıklar ({assets.length})</h2>
                            <span className="text-xs text-slate-500 font-mono">Dinamik DNS</span>
                        </div>

                        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs divide-y divide-slate-100">
                            {assets.length === 0 ? (
                                <div className="p-8 text-center">
                                    <p className="text-sm text-slate-500">Henüz eklenmiş bir varlık yok.</p>
                                    <button
                                        onClick={() => setIsAddModalOpen(true)}
                                        className="mt-3 text-xs text-indigo-600 hover:text-indigo-700 font-semibold"
                                    >
                                        + İlk Varlığı Ekleyin
                                    </button>
                                </div>
                            ) : (
                                assets.map((asset) => {
                                    const isSelected = selectedAsset?.id === asset.id;
                                    return (
                                        <div
                                            key={asset.id}
                                            onClick={() => router.get('/', { asset_id: asset.id }, { preserveState: true })}
                                            className={`p-4 cursor-pointer transition flex items-center justify-between group ${
                                                isSelected
                                                    ? 'bg-indigo-50/70 border-l-4 border-indigo-600 pl-3'
                                                    : 'hover:bg-slate-50'
                                            }`}
                                        >
                                            <div className="space-y-1 min-w-0 pr-3">
                                                <div className="flex items-center gap-2">
                                                    <span className={`text-[10px] font-mono uppercase px-1.5 py-0.5 rounded font-bold ${
                                                        asset.type === 'domain' ? 'bg-sky-50 text-sky-700 border border-sky-200' : 'bg-purple-50 text-purple-700 border border-purple-200'
                                                    }`}>
                                                        {asset.type}
                                                    </span>
                                                    <span className="text-sm font-semibold text-slate-900 truncate max-w-[180px]">
                                                        {asset.target}
                                                    </span>
                                                </div>

                                                <div className="text-xs text-slate-500 flex items-center gap-2">
                                                    {asset.name && <span>{asset.name} • </span>}
                                                    <span>{asset.resolved_ips?.length || 0} Çözülen IP</span>
                                                </div>
                                            </div>

                                            <div className="text-right flex flex-col items-end gap-1">
                                                {getThreatBadge(asset.highest_threat_level)}
                                                <span className="text-[11px] text-slate-500 font-mono">
                                                    {asset.active_listings_count > 0 ? `${asset.active_listings_count} Tehdit Kaynak` : 'Temiz'}
                                                </span>
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </div>

                    {/* Right Column: Selected Asset Details & Findings */}
                    <div className="lg:col-span-8 space-y-6">
                        {selectedAsset ? (
                            <>
                                {/* Asset Header Card */}
                                <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs">
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <span className="text-xs font-mono uppercase px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200 font-semibold">
                                                    {selectedAsset.type === 'domain' ? 'Alan Adı (Domain)' : 'IP Adresi'}
                                                </span>
                                                <h1 className="text-xl font-bold text-slate-900 tracking-tight">{selectedAsset.target}</h1>
                                            </div>
                                            <p className="text-xs text-slate-500 mt-1">
                                                {selectedAsset.name ? `${selectedAsset.name} • ` : ''}
                                                Son Kontrol: {selectedAsset.last_checked_at ? new Date(selectedAsset.last_checked_at).toLocaleString('tr-TR') : 'Henüz yapılmadı'} • 
                                                Periyot: <span className="capitalize text-slate-700 font-medium">{selectedAsset.frequency}</span>
                                            </p>
                                        </div>

                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={() => handleCheckSingle(selectedAsset.id)}
                                                disabled={isCheckingCurrent}
                                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white transition shadow-xs disabled:opacity-50"
                                            >
                                                <svg className={`w-3.5 h-3.5 ${isCheckingCurrent ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                                </svg>
                                                {isCheckingCurrent ? 'Sorgulanıyor...' : 'Şimdi Yeniden Sorgula'}
                                            </button>

                                            <button
                                                onClick={() => handleDeleteAsset(selectedAsset.id)}
                                                className="p-1.5 rounded-lg bg-slate-100 hover:bg-rose-50 text-slate-500 hover:text-rose-600 border border-slate-200 transition"
                                                title="Varlığı Sil"
                                            >
                                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                </svg>
                                            </button>
                                        </div>
                                    </div>

                                    {/* Resolved IPs Tags (A ve MX Kayıtları) */}
                                    <div className="mt-5 pt-4 border-t border-slate-100">
                                        <div className="text-xs font-semibold text-slate-600 mb-2 flex items-center gap-1.5">
                                            <svg className="w-3.5 h-3.5 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                            </svg>
                                            Dinamik DNS Çözümleme (A ve MX Kayıtlarından İzlenen IP'ler):
                                        </div>
                                        <div className="flex flex-wrap gap-2">
                                            {selectedAsset.resolved_ips && selectedAsset.resolved_ips.length > 0 ? (
                                                selectedAsset.resolved_ips.map((item) => (
                                                    <div key={item.id} className="inline-flex items-center gap-2 px-2.5 py-1 rounded-md bg-slate-50 border border-slate-200 text-xs font-mono text-slate-700">
                                                        <span className="text-[10px] px-1 py-0.5 rounded bg-indigo-100 text-indigo-700 font-bold">{item.record_type}</span>
                                                        <span>{item.ip_address}</span>
                                                        {item.hostname && <span className="text-[10px] text-slate-400">({item.hostname})</span>}
                                                    </div>
                                                ))
                                            ) : (
                                                <span className="text-xs text-slate-400 italic">Henüz çözülmüş DNS kaydı bulunamadı.</span>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Findings Table (Tespit Edilen Listelemeler ve Delist Kılavuzu) */}
                                <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
                                    <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                                        <div>
                                            <h3 className="text-sm font-semibold text-slate-900">Tespit Edilen Kara Liste Kayıtları & Yönlendirme</h3>
                                            <p className="text-xs text-slate-500">Yalnızca SMTP teslimatını ve itibarını etkileyen aktif listelemeler</p>
                                        </div>
                                        <div className="text-xs font-mono text-slate-600 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                                            {latestFindings.filter(f => f.is_listed).length} Aktif Listeleme
                                        </div>
                                    </div>

                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left text-xs">
                                            <thead className="bg-slate-50 text-slate-500 font-mono uppercase text-[11px] border-b border-slate-200">
                                                <tr>
                                                    <th className="px-6 py-3">Kaynak Adı / Host</th>
                                                    <th className="px-4 py-3">IP Adresi</th>
                                                    <th className="px-4 py-3">Tehdit Seviyesi</th>
                                                    <th className="px-4 py-3">Kategori</th>
                                                    <th className="px-4 py-3">Listelenme Durumu</th>
                                                    <th className="px-6 py-3 text-right">Temizleme Yönlendirmesi (Delist)</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100">
                                                {latestFindings.filter(f => f.is_listed).length === 0 ? (
                                                    <tr>
                                                        <td colSpan={6} className="px-6 py-10 text-center">
                                                            <div className="flex flex-col items-center justify-center gap-2">
                                                                <div className="w-10 h-10 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600">
                                                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                                                    </svg>
                                                                </div>
                                                                <span className="text-sm font-semibold text-emerald-800">Tebrikler! Temiz Rapor</span>
                                                                <span className="text-xs text-slate-500 max-w-sm">
                                                                    Sorgulanan hiçbir kara listede bu varlığa ait IP adresleri bulunamadı. E-posta teslimatınız ve itibarınız güvende.
                                                                </span>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ) : (
                                                    latestFindings.filter(f => f.is_listed).map((finding) => (
                                                        <tr key={finding.id} className="hover:bg-slate-50 transition">
                                                            <td className="px-6 py-4">
                                                                <div className="font-semibold text-slate-900">{finding.provider?.name}</div>
                                                                <div className="text-[11px] font-mono text-slate-500">{finding.provider?.host}</div>
                                                            </td>
                                                            <td className="px-4 py-4 font-mono text-slate-700">
                                                                {finding.ip_address}
                                                            </td>
                                                            <td className="px-4 py-4">
                                                                {getThreatBadge(finding.threat_level)}
                                                            </td>
                                                            <td className="px-4 py-4">
                                                                <span className="font-mono text-[11px] uppercase text-slate-600">
                                                                    {finding.provider?.category}
                                                                </span>
                                                            </td>
                                                            <td className="px-4 py-4">
                                                                <div className="flex items-center gap-1.5 text-rose-700 font-semibold">
                                                                    <span className="w-1.5 h-1.5 rounded-full bg-rose-600 animate-pulse"></span>
                                                                    <span>Listede ({finding.response_code || '127.0.0.x'})</span>
                                                                </div>
                                                                {finding.response_text && (
                                                                    <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-1">{finding.response_text}</p>
                                                                )}
                                                            </td>
                                                            <td className="px-6 py-4 text-right">
                                                                {finding.provider?.delist_url ? (
                                                                    <a
                                                                        href={finding.provider.delist_url}
                                                                        target="_blank"
                                                                        rel="noreferrer"
                                                                        className="inline-flex items-center gap-1 px-3 py-1 rounded bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-semibold border border-indigo-200 transition"
                                                                    >
                                                                        <span>Delist Başvurusu</span>
                                                                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                                                        </svg>
                                                                    </a>
                                                                ) : (
                                                                    <span className="text-slate-400 italic">Doğrudan başvuru yok</span>
                                                                )}
                                                            </td>
                                                        </tr>
                                                    ))
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>

                                {/* History & Trend Timeline */}
                                <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <h3 className="text-sm font-semibold text-slate-900">Sorgu Geçmişi ve Eğilim (Trend)</h3>
                                            <p className="text-xs text-slate-500">Zaman içindeki sorgulama turları ve tespit edilen tehdit değişimi</p>
                                        </div>
                                        <span className="text-xs font-mono text-slate-500 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">{history.length} Kayıt</span>
                                    </div>

                                    <div className="divide-y divide-slate-100">
                                        {history.length === 0 ? (
                                            <p className="text-xs text-slate-400 italic py-4">Bu varlık için henüz sorgu geçmişi bulunmuyor.</p>
                                        ) : (
                                            history.map((check) => (
                                                <div key={check.id} className="py-3 flex items-center justify-between text-xs">
                                                    <div className="space-y-0.5">
                                                        <div className="flex items-center gap-2">
                                                            <span className="font-mono text-slate-700">
                                                                {new Date(check.created_at).toLocaleString('tr-TR')}
                                                            </span>
                                                            <span className="text-slate-300">•</span>
                                                            <span className="text-slate-500">{check.total_sources_queried} Kaynak Sorgulandı</span>
                                                        </div>
                                                        {check.error_message && (
                                                            <p className="text-rose-600 text-[11px]">{check.error_message}</p>
                                                        )}
                                                    </div>

                                                    <div className="flex items-center gap-3">
                                                        <span className="font-mono text-slate-600">
                                                            {check.counted_threat_count > 0 ? `${check.counted_threat_count} Tehdit` : 'Temiz'}
                                                        </span>
                                                        {getThreatBadge(check.highest_threat_level)}
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>
                            </>
                        ) : (
                            <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center text-slate-400 shadow-xs">
                                Seçili bir varlık bulunmuyor.
                            </div>
                        )}
                    </div>
                </div>
            </main>

            {/* Modal: Yeni Varlık Ekle */}
            {isAddModalOpen && (
                <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
                    <div className="bg-white border border-slate-200 rounded-2xl p-6 max-w-md w-full shadow-xl relative">
                        <h2 className="text-lg font-bold text-slate-900">İzlenecek Yeni Varlık Ekle</h2>
                        <p className="text-xs text-slate-500 mt-1">
                            Alan adı girildiğinde A ve MX kayıtları her turda otomatik çözümlenir.
                        </p>

                        <form onSubmit={handleCreateAsset} className="mt-5 space-y-4">
                            <div>
                                <label className="block text-xs font-semibold text-slate-700 mb-1">Varlık Tipi</label>
                                <div className="grid grid-cols-2 gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setNewType('domain')}
                                        className={`px-3 py-2 rounded-lg text-xs font-semibold border transition ${
                                            newType === 'domain'
                                                ? 'bg-indigo-600 text-white border-indigo-600'
                                                : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                                        }`}
                                    >
                                        Alan Adı (Domain)
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setNewType('ip')}
                                        className={`px-3 py-2 rounded-lg text-xs font-semibold border transition ${
                                            newType === 'ip'
                                                ? 'bg-indigo-600 text-white border-indigo-600'
                                                : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                                        }`}
                                    >
                                        IP Adresi (Public IPv4)
                                    </button>
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-slate-700 mb-1">
                                    {newType === 'domain' ? 'Alan Adı (Örn: mail.sirket.com)' : 'IP Adresi (Örn: 195.175.x.x)'}
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={newTarget}
                                    onChange={(e) => setNewTarget(e.target.value)}
                                    placeholder={newType === 'domain' ? 'ornek.com' : '8.8.8.8'}
                                    className="w-full px-3 py-2 rounded-lg bg-white border border-slate-300 text-slate-900 text-xs font-mono focus:outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-slate-700 mb-1">Varlık Açıklaması / Etiket (Opsiyonel)</label>
                                <input
                                    type="text"
                                    value={newName}
                                    onChange={(e) => setNewName(e.target.value)}
                                    placeholder="Örn: Ana SMTP Çıkış Sunucusu"
                                    className="w-full px-3 py-2 rounded-lg bg-white border border-slate-300 text-slate-900 text-xs focus:outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-semibold text-slate-700 mb-1">Sorgu Döngüsü</label>
                                    <select
                                        value={newFrequency}
                                        onChange={(e) => setNewFrequency(e.target.value as any)}
                                        className="w-full px-3 py-2 rounded-lg bg-white border border-slate-300 text-slate-900 text-xs focus:outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600"
                                    >
                                        <option value="weekly">Haftalık Otomatik</option>
                                        <option value="monthly">Aylık Otomatik</option>
                                        <option value="manual">Yalnızca Manuel</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold text-slate-700 mb-1">E-Posta Uyarısı</label>
                                    <input
                                        type="email"
                                        value={newAlertEmail}
                                        onChange={(e) => setNewAlertEmail(e.target.value)}
                                        placeholder="noc@sirket.com"
                                        className="w-full px-3 py-2 rounded-lg bg-white border border-slate-300 text-slate-900 text-xs focus:outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600"
                                    />
                                </div>
                            </div>

                            <div className="mt-6 flex justify-end gap-2">
                                <button
                                    type="button"
                                    onClick={() => setIsAddModalOpen(false)}
                                    className="px-4 py-2 rounded-lg text-xs font-medium text-slate-600 hover:text-slate-900 transition"
                                >
                                    Vazgeç
                                </button>
                                <button
                                    type="submit"
                                    className="px-4 py-2 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white transition shadow-xs"
                                >
                                    Kaydet ve İlk Sorguyu Yap
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal: Lisans Yönetimi */}
            {isLicenseModalOpen && (
                <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
                    <div className="bg-white border border-slate-200 rounded-2xl p-6 max-w-md w-full shadow-xl relative">
                        <h2 className="text-lg font-bold text-slate-900">Lisans & Servis Paketi</h2>
                        <p className="text-xs text-slate-500 mt-1">
                            Lisans geçerlilik süresi dolarsa sorgu yapılamaz, yalnızca geçmiş görüntüleme yapılabilir.
                        </p>

                        <form onSubmit={handleUpdateLicense} className="mt-5 space-y-4">
                            <div>
                                <label className="block text-xs font-semibold text-slate-700 mb-1">Lisans Anahtarı</label>
                                <input
                                    type="text"
                                    required
                                    value={licenseKey}
                                    onChange={(e) => setLicenseKey(e.target.value)}
                                    className="w-full px-3 py-2 rounded-lg bg-white border border-slate-300 text-slate-900 text-xs font-mono focus:outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-slate-700 mb-1">Paket Adı</label>
                                <input
                                    type="text"
                                    required
                                    value={licensePlan}
                                    onChange={(e) => setLicensePlan(e.target.value)}
                                    className="w-full px-3 py-2 rounded-lg bg-white border border-slate-300 text-slate-900 text-xs focus:outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-slate-700 mb-1">Yetkili İletişim E-Postası</label>
                                <input
                                    type="email"
                                    value={licenseEmail}
                                    onChange={(e) => setLicenseEmail(e.target.value)}
                                    className="w-full px-3 py-2 rounded-lg bg-white border border-slate-300 text-slate-900 text-xs focus:outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600"
                                />
                            </div>

                            <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-[11px] text-slate-600 space-y-1">
                                <div className="flex justify-between">
                                    <span>Durum:</span>
                                    <span className="text-emerald-700 font-semibold">{license?.is_active ? 'Aktif Lisans' : 'Pasif'}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span>Bitiş Tarihi:</span>
                                    <span className="text-slate-800 font-mono">{license?.expires_at ? new Date(license.expires_at).toLocaleDateString('tr-TR') : 'Süresiz'}</span>
                                </div>
                            </div>

                            <div className="mt-6 flex justify-end gap-2">
                                <button
                                    type="button"
                                    onClick={() => setIsLicenseModalOpen(false)}
                                    className="px-4 py-2 rounded-lg text-xs font-medium text-slate-600 hover:text-slate-900 transition"
                                >
                                    Kapat
                                </button>
                                <button
                                    type="submit"
                                    className="px-4 py-2 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white transition"
                                >
                                    Lisansı Kaydet
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
