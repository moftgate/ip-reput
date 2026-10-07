import React, { useState } from 'react';
import { Head, router, usePage } from '@inertiajs/react';

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

interface TrendItem {
    provider: string;
    ip_address: string;
    threat_level: 'clean' | 'low' | 'medium' | 'high' | 'critical';
}

interface Trend {
    added: TrendItem[];
    removed: TrendItem[];
}

interface Props {
    assets: MonitoredAsset[];
    selectedAsset?: MonitoredAsset | null;
    history: ReputationCheck[];
    latestFindings: ReputationFinding[];
    trend: Trend;
    providers: BlacklistProvider[];
    license?: LicenseSetting | null;
    stats: Stats;
}

export default function Welcome({
    assets = [],
    selectedAsset = null,
    history = [],
    latestFindings = [],
    trend = { added: [], removed: [] },
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

    const { flash, errors } = usePage().props as unknown as {
        flash: { success?: string | null; error?: string | null };
        errors: Record<string, string>;
    };
    const errorMessages = Object.values(errors ?? {});

    const [licenseKey, setLicenseKey] = useState('');
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
            contact_email: licenseEmail,
        }, {
            onSuccess: () => {
                setIsLicenseModalOpen(false);
                setLicenseKey('');
            },
        });
    };

    const getThreatBadge = (level: string) => {
        switch (level) {
            case 'critical':
                return (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-[9999px] text-xs font-medium bg-[#fef2f2] text-[#dc2626] border border-[#fecaca]">
                        <span className="w-1.5 h-1.5 rounded-[9999px] bg-[#dc2626] animate-pulse"></span>
                        Kritik Tehdit
                    </span>
                );
            case 'high':
                return (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-[9999px] text-xs font-medium bg-[#fffbeb] text-[#b45309] border border-[#fde68a]">
                        <span className="w-1.5 h-1.5 rounded-[9999px] bg-[#b45309]"></span>
                        Yüksek Risk
                    </span>
                );
            case 'medium':
                return (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-[9999px] text-xs font-medium bg-[#fefce8] text-[#854d0e] border border-[#fef08a]">
                        <span className="w-1.5 h-1.5 rounded-[9999px] bg-[#854d0e]"></span>
                        Orta Seviye
                    </span>
                );
            case 'low':
                return (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-[9999px] text-xs font-medium bg-[#f0fdf4] text-[#166534] border border-[#bbf7d0]">
                        <span className="w-1.5 h-1.5 rounded-[9999px] bg-[#166534]"></span>
                        Düşük (Bilgi)
                    </span>
                );
            case 'clean':
            default:
                return (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-[9999px] text-xs font-medium bg-[#d2f2e7] text-[#007a55] border border-[#a7f3d0]">
                        <span className="w-1.5 h-1.5 rounded-[9999px] bg-[#00bc7d]"></span>
                        Temiz (Listede Yok)
                    </span>
                );
        }
    };

    return (
        <div className="min-h-screen bg-[#ffffff] text-[#022c22] flex flex-col font-['Inter',sans-serif] selection:bg-[#00bc7d] selection:text-white">
            <Head title="IPREP — IP İtibar & Kara Liste İzleme Platformu" />

            {/* Announcement Bar (DESIGN.md specification: 40px height, #000000 background, white text) */}
            <div className="bg-[#000000] text-white text-[13px] h-10 px-4 flex items-center justify-between z-50">
                <div className="max-w-[1200px] mx-auto w-full flex items-center justify-between">
                    <div className="flex items-center gap-2 truncate">
                        <span className="inline-block w-2 h-2 rounded-[9999px] bg-[#00bc7d]"></span>
                        <span className="font-medium text-[#d2f2e7]">İtibar & Erişim Kontrolü:</span>
                        <span className="text-slate-300 text-xs truncate">
                            Bu ürün zafiyet taraması DEĞİLDİR — dış kara liste ve SMTP teslimat kontrolüdür. PBL/Bilgi kaynakları riski artırmaz.
                        </span>
                    </div>
                    <div className="hidden md:flex items-center gap-3 font-['ui-monospace'] text-[11px] text-[#e5e7eb]">
                        <span>Lisans: {license?.plan_name ?? 'Yok'}</span>
                        <span className="text-[#3d3d3f]">•</span>
                        <span className={license?.is_active ? 'text-[#34d399] font-medium' : 'text-[#f87171] font-medium'}>{license?.is_active ? 'Aktif' : 'Geçersiz'}</span>
                    </div>
                </div>
            </div>

            {/* Navigation Bar (DESIGN.md: 64px height, max-width 1200px, 1px Hairline #e5e7eb border, no shadow) */}
            <header className="border-b border-[#e5e7eb] bg-[#ffffff] sticky top-0 z-40">
                <div className="max-w-[1200px] mx-auto px-6 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        {/* Logo Wordmark (Emerald Pulse spiral + Forest Ink wordmark) */}
                        <div className="w-8 h-8 rounded-[9999px] bg-[#00bc7d] flex items-center justify-center text-white shadow-[rgba(0,0,0,0.05)_0px_1px_2px_0px]">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                            </svg>
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <span className="font-['Inter_Tight',sans-serif] font-bold text-xl tracking-tight text-[#022c22]">
                                    iprep
                                </span>
                                <span className="text-[11px] font-medium px-2 py-0.5 rounded-[9999px] bg-[#d2f2e7] text-[#007a55] border border-[#a7f3d0]">
                                    reputation engine
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        {/* Ghost Outline Button (DESIGN.md: 9999px pill, 1px Jade Wash / Emerald Pulse border, transparent bg) */}
                        <button
                            onClick={handleCheckAll}
                            disabled={isCheckingAll}
                            className="inline-flex items-center gap-2 px-5 py-2 rounded-[9999px] text-[14px] font-medium text-[#007a55] bg-transparent border border-[#10b981] hover:bg-[#d2f2e7]/40 transition shadow-[rgba(0,0,0,0.05)_0px_1px_2px_0px] disabled:opacity-50"
                        >
                            <svg className={`w-4 h-4 text-[#00bc7d] ${isCheckingAll ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                            </svg>
                            {isCheckingAll ? 'Sorgulanıyor...' : 'Tümünü Kontrol Et'}
                        </button>

                        {/* Primary Pill Button (DESIGN.md: 9999px pill, #00bc7d Emerald Pulse, white text, 10px 20px padding) */}
                        <button
                            onClick={() => setIsAddModalOpen(true)}
                            className="inline-flex items-center gap-2 px-5 py-2 rounded-[9999px] text-[14px] font-medium bg-[#00bc7d] hover:bg-[#007a55] text-white transition shadow-[rgba(0,0,0,0.05)_0px_1px_2px_0px]"
                        >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                            </svg>
                            Yeni Varlık Ekle
                        </button>

                        {/* License Button */}
                        <button
                            onClick={() => setIsLicenseModalOpen(true)}
                            className="p-2.5 rounded-[9999px] bg-[#ffffff] hover:bg-[#f5f5f5] border border-[#e5e7eb] text-[#71717a] hover:text-[#022c22] transition shadow-[rgba(0,0,0,0.05)_0px_1px_2px_0px]"
                            title="Lisans ve Paket Durumu"
                        >
                            <svg className="w-4 h-4 text-[#007a55]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                            </svg>
                        </button>

                        <button
                            onClick={() => router.post('/logout')}
                            className="px-4 py-2 rounded-[9999px] text-[13px] font-medium text-[#71717a] hover:text-[#022c22] border border-[#e5e7eb] hover:bg-[#f5f5f5] transition"
                        >
                            Çıkış
                        </button>
                    </div>
                </div>
            </header>

            {/* Main Content (max-width 1200px, 32px padding, 8px base units, 1px #e5e7eb borders) */}
            <main className="max-w-[1200px] mx-auto px-6 py-10 flex-1 w-full space-y-10">
                {flash?.success && (
                    <div className="p-4 rounded-[12px] bg-[#d2f2e7] border border-[#a7f3d0] text-[13px] text-[#007a55]">{flash.success}</div>
                )}
                {flash?.error && (
                    <div className="p-4 rounded-[12px] bg-[#fef2f2] border border-[#fecaca] text-[13px] text-[#dc2626]">{flash.error}</div>
                )}


                {/* Hero / Header Section with Upstash Headline aesthetics */}
                <div className="py-2">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-[9999px] bg-[#d2f2e7] text-[#007a55] text-xs font-semibold mb-3 border border-[#a7f3d0]">
                        <span>Dış Kara Liste & Teslimat Takibi</span>
                    </div>
                    <h1 className="font-['Inter_Tight',sans-serif] text-3xl sm:text-4xl font-semibold tracking-[-0.75px] text-[#022c22] leading-tight">
                        E-posta Sunucu & IP İtibar Kontrolü
                    </h1>
                    <p className="mt-2 text-[14px] text-[#71717a] max-w-2xl leading-relaxed">
                        Sunucularınızın ve alan adlarınızın dış kara listeler (DNSBL/RBL) tarafından nasıl görüldüğünü tam zamanında tespit edin. A ve MX kayıtları dinamik çözümlenir, teslimat riskleri erkenden temizlenir.
                    </p>
                </div>

                {/* Stats Grid (DESIGN.md: 16px radius, 1px Hairline #e5e7eb border, #ffffff background, subtle shadow) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="bg-[#ffffff] border border-[#e5e7eb] rounded-[16px] p-6 shadow-[rgba(0,0,0,0.05)_0px_1px_2px_0px]">
                        <div className="text-[12px] uppercase tracking-wider font-semibold text-[#71717a]">Toplam İzlenen Varlık</div>
                        <div className="mt-3 flex items-baseline gap-2">
                            <span className="font-['Inter_Tight',sans-serif] text-3xl font-bold tracking-tight text-[#022c22]">{stats.total_assets}</span>
                            <span className="text-[12px] text-[#71717a] font-['ui-monospace']">({stats.clean_assets} Temiz)</span>
                        </div>
                        <div className="mt-4 text-[12px] text-[#007a55] font-medium flex items-center gap-1.5">
                            <svg className="w-3.5 h-3.5 text-[#10b981]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                            </svg>
                            A ve MX kayıtları dinamik çözümlenir
                        </div>
                    </div>

                    <div className="bg-[#ffffff] border border-[#e5e7eb] rounded-[16px] p-6 shadow-[rgba(0,0,0,0.05)_0px_1px_2px_0px]">
                        <div className="text-[12px] uppercase tracking-wider font-semibold text-[#71717a]">Risk Taşıyan Varlıklar</div>
                        <div className="mt-3 flex items-baseline gap-2">
                            <span className="font-['Inter_Tight',sans-serif] text-3xl font-bold tracking-tight text-[#dc2626]">{stats.at_risk_assets}</span>
                            <span className="text-[12px] text-[#71717a] font-['ui-monospace']">/ {stats.total_assets}</span>
                        </div>
                        <div className="mt-4 text-[12px] text-[#71717a] flex items-center gap-2">
                            <span className="text-[#dc2626] font-semibold">{stats.critical_count} Kritik</span>
                            <span className="text-[#b45309] font-semibold">{stats.high_count} Yüksek</span>
                            <span className="text-[#854d0e] font-semibold">{stats.medium_count} Orta</span>
                        </div>
                    </div>

                    <div className="bg-[#ffffff] border border-[#e5e7eb] rounded-[16px] p-6 shadow-[rgba(0,0,0,0.05)_0px_1px_2px_0px]">
                        <div className="text-[12px] uppercase tracking-wider font-semibold text-[#71717a]">Kara Liste Kaynakları</div>
                        <div className="mt-3 flex items-baseline gap-2">
                            <span className="font-['Inter_Tight',sans-serif] text-3xl font-bold tracking-tight text-[#007a55]">{stats.total_providers}</span>
                            <span className="text-[12px] text-[#71717a] font-['ui-monospace']">DNSBL/RBL</span>
                        </div>
                        <div className="mt-4 text-[12px] text-[#71717a]">
                            <span className="text-[#007a55] font-semibold">{stats.counted_providers} Sayılan Tehdit</span>, {stats.policy_providers} Politika/Bilgi
                        </div>
                    </div>

                    <div className="bg-[#ffffff] border border-[#e5e7eb] rounded-[16px] p-6 shadow-[rgba(0,0,0,0.05)_0px_1px_2px_0px]">
                        <div className="text-[12px] uppercase tracking-wider font-semibold text-[#71717a]">Otomatik Döngü</div>
                        <div className="mt-3 flex items-baseline gap-2">
                            <span className="font-['Inter_Tight',sans-serif] text-2xl font-bold tracking-tight text-[#022c22]">Haftalık / Cron</span>
                        </div>
                        <div className="mt-4 text-[12px] text-[#007a55] font-medium flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-[9999px] bg-[#00bc7d]"></span>
                            E-posta yönlendirme uyarısı devrede
                        </div>
                    </div>
                </div>

                {/* Workflow Cards (Nasıl Çalışır - 01 to 05) with DESIGN.md 16px radius, hairline borders */}
                <div className="rounded-[16px] bg-[#ffffff] border border-[#e5e7eb] p-8 shadow-[rgba(0,0,0,0.05)_0px_1px_2px_0px]">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                        <div>
                            <h2 className="font-['Inter_Tight',sans-serif] text-lg font-semibold text-[#022c22] tracking-tight">
                                Nasıl Çalışır? Kurulumdan Rapora
                            </h2>
                            <p className="text-[13px] text-[#71717a]">
                                Alan adı/IP seçiminden delist temizleme kılavuzuna adım adım süreç
                            </p>
                        </div>
                        <div className="flex items-center gap-2 text-[12px] font-['ui-monospace'] text-[#007a55] bg-[#d2f2e7] px-3 py-1.5 rounded-[9999px] border border-[#a7f3d0]">
                            <span className="font-bold">DNSBL / RBL</span>
                            <span>Standardı</span>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                        <div className="p-5 rounded-[12px] bg-[#f5f5f5] border border-[#e5e7eb] flex flex-col justify-between">
                            <div>
                                <span className="text-xs font-['ui-monospace'] font-bold text-[#007a55]">01</span>
                                <h3 className="text-[14px] font-semibold text-[#022c22] mt-1">İzlenecek Varlık</h3>
                                <p className="text-[12px] text-[#71717a] mt-1 leading-normal">
                                    Alan adı veya IP seçilir. Alan adında A ve MX kayıtları her sorguda otomatik çözülür.
                                </p>
                            </div>
                        </div>

                        <div className="p-5 rounded-[12px] bg-[#f5f5f5] border border-[#e5e7eb] flex flex-col justify-between">
                            <div>
                                <span className="text-xs font-['ui-monospace'] font-bold text-[#007a55]">02</span>
                                <h3 className="text-[14px] font-semibold text-[#022c22] mt-1">Sorgu Başlar</h3>
                                <p className="text-[12px] text-[#71717a] mt-1 leading-normal">
                                    Harici kara liste kaynakları sırayla sorgulanır. Tehdit seviyesi, yanıt kodu kaydedilir.
                                </p>
                            </div>
                        </div>

                        <div className="p-5 rounded-[12px] bg-[#f5f5f5] border border-[#e5e7eb] flex flex-col justify-between">
                            <div>
                                <span className="text-xs font-['ui-monospace'] font-bold text-[#007a55]">03</span>
                                <h3 className="text-[14px] font-semibold text-[#022c22] mt-1">Sonuç Tablosu</h3>
                                <p className="text-[12px] text-[#71717a] mt-1 leading-normal">
                                    Kaç kaynak listeledi, en yüksek tehdit seviyesi ve listeleme yoksa temiz rapor görünür.
                                </p>
                            </div>
                        </div>

                        <div className="p-5 rounded-[12px] bg-[#f5f5f5] border border-[#e5e7eb] flex flex-col justify-between">
                            <div>
                                <span className="text-xs font-['ui-monospace'] font-bold text-[#007a55]">04</span>
                                <h3 className="text-[14px] font-semibold text-[#022c22] mt-1">Tarihçe & Trend</h3>
                                <p className="text-[12px] text-[#71717a] mt-1 leading-normal">
                                    Önceki sorgular ile karşılaştırılır. Yeni eklenen ya da sizi bırakan listeler izlenir.
                                </p>
                            </div>
                        </div>

                        <div className="p-5 rounded-[12px] bg-[#f5f5f5] border border-[#e5e7eb] flex flex-col justify-between">
                            <div>
                                <span className="text-xs font-['ui-monospace'] font-bold text-[#007a55]">05</span>
                                <h3 className="text-[14px] font-semibold text-[#022c22] mt-1">Listenin Temizlenmesi</h3>
                                <p className="text-[12px] text-[#71717a] mt-1 leading-normal">
                                    Tespit edilirse temizleme (delist) bağlantısı verilir. Çözülünce e-posta bildirimi gider.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Workspace Split Layout: Asset Selection & Detailed Findings */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                    {/* Left Column: Asset Selection Table */}
                    <div className="lg:col-span-4 space-y-4">
                        <div className="flex items-center justify-between">
                            <h2 className="text-[12px] font-semibold text-[#71717a] uppercase tracking-wider">
                                İzlenen Varlıklar ({assets.length})
                            </h2>
                            <span className="text-[11px] text-[#71717a] font-['ui-monospace']">Dinamik DNS</span>
                        </div>

                        <div className="bg-[#ffffff] border border-[#e5e7eb] rounded-[16px] overflow-hidden shadow-[rgba(0,0,0,0.05)_0px_1px_2px_0px] divide-y divide-[#e5e7eb]">
                            {assets.length === 0 ? (
                                <div className="p-8 text-center">
                                    <p className="text-sm text-[#71717a]">Henüz izlenen varlık bulunmuyor.</p>
                                    <button
                                        onClick={() => setIsAddModalOpen(true)}
                                        className="mt-3 text-xs text-[#007a55] hover:underline font-semibold"
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
                                                    ? 'bg-[#f5f5f5] border-l-4 border-[#00bc7d] pl-3'
                                                    : 'hover:bg-[#f5f5f5]/60'
                                            }`}
                                        >
                                            <div className="space-y-1 min-w-0 pr-3">
                                                <div className="flex items-center gap-2">
                                                    <span className={`text-[10px] font-['ui-monospace'] uppercase px-2 py-0.5 rounded-[9999px] font-semibold ${
                                                        asset.type === 'domain'
                                                            ? 'bg-[#d2f2e7] text-[#007a55]'
                                                            : 'bg-[#e9d5ff] text-[#6b21a8]'
                                                    }`}>
                                                        {asset.type}
                                                    </span>
                                                    <span className="text-[14px] font-semibold text-[#022c22] truncate max-w-[180px]">
                                                        {asset.target}
                                                    </span>
                                                </div>

                                                <div className="text-[12px] text-[#71717a] flex items-center gap-2">
                                                    {asset.name && <span>{asset.name} • </span>}
                                                    <span>{asset.resolved_ips?.length || 0} Çözülen IP</span>
                                                </div>
                                            </div>

                                            <div className="text-right flex flex-col items-end gap-1">
                                                {getThreatBadge(asset.highest_threat_level)}
                                                <span className="text-[11px] text-[#71717a] font-['ui-monospace']">
                                                    {asset.active_listings_count > 0 ? `${asset.active_listings_count} Tehdit` : 'Temiz'}
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
                                <div className="bg-[#ffffff] border border-[#e5e7eb] rounded-[16px] p-6 shadow-[rgba(0,0,0,0.05)_0px_1px_2px_0px]">
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <span className="text-[11px] font-['ui-monospace'] uppercase px-2 py-0.5 rounded-[9999px] bg-[#d2f2e7] text-[#007a55] font-semibold">
                                                    {selectedAsset.type === 'domain' ? 'Alan Adı' : 'IP Adresi'}
                                                </span>
                                                <h1 className="font-['Inter_Tight',sans-serif] text-xl font-bold text-[#022c22] tracking-tight">
                                                    {selectedAsset.target}
                                                </h1>
                                            </div>
                                            <p className="text-[12px] text-[#71717a] mt-1">
                                                {selectedAsset.name ? `${selectedAsset.name} • ` : ''}
                                                Son Kontrol: {selectedAsset.last_checked_at ? new Date(selectedAsset.last_checked_at).toLocaleString('tr-TR') : 'Henüz yapılmadı'} • 
                                                Döngü: <span className="capitalize text-[#022c22] font-medium">{selectedAsset.frequency}</span>
                                            </p>
                                        </div>

                                        <div className="flex items-center gap-2">
                                            {/* Primary Action Button (DESIGN.md: 9999px pill, #00bc7d Emerald Pulse, white text) */}
                                            <button
                                                onClick={() => handleCheckSingle(selectedAsset.id)}
                                                disabled={isCheckingCurrent}
                                                className="inline-flex items-center gap-2 px-4 py-2 rounded-[9999px] text-[13px] font-medium bg-[#00bc7d] hover:bg-[#007a55] text-white transition shadow-[rgba(0,0,0,0.05)_0px_1px_2px_0px] disabled:opacity-50"
                                            >
                                                <svg className={`w-3.5 h-3.5 ${isCheckingCurrent ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                                </svg>
                                                {isCheckingCurrent ? 'Sorgulanıyor...' : 'Yeniden Sorgula'}
                                            </button>

                                            <button
                                                onClick={() => handleDeleteAsset(selectedAsset.id)}
                                                className="p-2 rounded-[9999px] bg-[#ffffff] hover:bg-[#fef2f2] text-[#71717a] hover:text-[#dc2626] border border-[#e5e7eb] transition"
                                                title="Varlığı Sil"
                                            >
                                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                </svg>
                                            </button>
                                        </div>
                                    </div>

                                    {/* Resolved IPs Chips */}
                                    <div className="mt-5 pt-4 border-t border-[#e5e7eb]">
                                        <div className="text-[12px] font-semibold text-[#71717a] mb-2 flex items-center gap-1.5">
                                            <svg className="w-3.5 h-3.5 text-[#007a55]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                            </svg>
                                            Dinamik DNS Çözümleme (A ve MX Kayıtları):
                                        </div>
                                        <div className="flex flex-wrap gap-2">
                                            {selectedAsset.resolved_ips && selectedAsset.resolved_ips.length > 0 ? (
                                                selectedAsset.resolved_ips.map((item) => (
                                                    <div key={item.id} className="inline-flex items-center gap-2 px-3 py-1 rounded-[6px] bg-[#f5f5f5] border border-[#e5e7eb] text-xs font-['ui-monospace'] text-[#022c22]">
                                                        <span className="text-[10px] px-1.5 py-0.5 rounded-[4px] bg-[#d2f2e7] text-[#007a55] font-bold">{item.record_type}</span>
                                                        <span>{item.ip_address}</span>
                                                        {item.hostname && <span className="text-[10px] text-[#71717a]">({item.hostname})</span>}
                                                    </div>
                                                ))
                                            ) : (
                                                <span className="text-xs text-[#71717a] italic">Henüz çözülmüş DNS kaydı bulunamadı.</span>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Findings Table (Tespit Edilen Listelemeler ve Delist Kılavuzu) */}
                                <div className="bg-[#ffffff] border border-[#e5e7eb] rounded-[16px] overflow-hidden shadow-[rgba(0,0,0,0.05)_0px_1px_2px_0px]">
                                    <div className="px-6 py-4 border-b border-[#e5e7eb] flex items-center justify-between">
                                        <div>
                                            <h3 className="font-['Inter_Tight',sans-serif] text-sm font-semibold text-[#022c22]">
                                                Tespit Edilen Kara Liste Kayıtları & Delist Başvurusu
                                            </h3>
                                            <p className="text-[12px] text-[#71717a]">
                                                SMTP teslimatını ve itibarını etkileyen aktif listelemeler
                                            </p>
                                        </div>
                                        <div className="text-[12px] font-['ui-monospace'] text-[#022c22] bg-[#f5f5f5] px-2.5 py-1 rounded-[9999px] border border-[#e5e7eb]">
                                            {latestFindings.filter(f => f.is_listed).length} Aktif Listeleme
                                        </div>
                                    </div>

                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left text-xs">
                                            <thead className="bg-[#f5f5f5] text-[#71717a] font-['ui-monospace'] uppercase text-[11px] border-b border-[#e5e7eb]">
                                                <tr>
                                                    <th className="px-6 py-3">Kaynak Adı / Host</th>
                                                    <th className="px-4 py-3">IP Adresi</th>
                                                    <th className="px-4 py-3">Tehdit Seviyesi</th>
                                                    <th className="px-4 py-3">Kategori</th>
                                                    <th className="px-4 py-3">Durum</th>
                                                    <th className="px-6 py-3 text-right">Temizleme Yönlendirmesi (Delist)</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-[#e5e7eb]">
                                                {latestFindings.filter(f => f.is_listed).length === 0 ? (
                                                    <tr>
                                                        <td colSpan={6} className="px-6 py-12 text-center">
                                                            <div className="flex flex-col items-center justify-center gap-2">
                                                                <div className="w-10 h-10 rounded-[9999px] bg-[#d2f2e7] flex items-center justify-center text-[#007a55]">
                                                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                                                                    </svg>
                                                                </div>
                                                                <span className="font-['Inter_Tight',sans-serif] text-[15px] font-semibold text-[#007a55]">Tebrikler! Temiz Rapor</span>
                                                                <span className="text-[12px] text-[#71717a] max-w-sm">
                                                                    Sorgulanan hiçbir kara listede bu varlığa ait IP adresi tespit edilmedi. E-posta teslimatınız ve itibarınız güvende.
                                                                </span>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ) : (
                                                    latestFindings.filter(f => f.is_listed).map((finding) => (
                                                        <tr key={finding.id} className="hover:bg-[#f5f5f5]/60 transition">
                                                            <td className="px-6 py-4">
                                                                <div className="font-semibold text-[#022c22]">{finding.provider?.name}</div>
                                                                <div className="text-[11px] font-['ui-monospace'] text-[#71717a]">{finding.provider?.host}</div>
                                                            </td>
                                                            <td className="px-4 py-4 font-['ui-monospace'] text-[#022c22]">
                                                                {finding.ip_address}
                                                            </td>
                                                            <td className="px-4 py-4">
                                                                {getThreatBadge(finding.threat_level)}
                                                            </td>
                                                            <td className="px-4 py-4">
                                                                <span className="font-['ui-monospace'] text-[11px] uppercase text-[#71717a]">
                                                                    {finding.provider?.category}
                                                                </span>
                                                            </td>
                                                            <td className="px-4 py-4">
                                                                <div className="flex items-center gap-1.5 text-[#dc2626] font-semibold">
                                                                    <span className="w-1.5 h-1.5 rounded-[9999px] bg-[#dc2626] animate-pulse"></span>
                                                                    <span>Listede ({finding.response_code || '127.0.0.x'})</span>
                                                                </div>
                                                                {finding.response_text && (
                                                                    <p className="text-[11px] text-[#71717a] mt-0.5 line-clamp-1">{finding.response_text}</p>
                                                                )}
                                                            </td>
                                                            <td className="px-6 py-4 text-right">
                                                                {finding.provider?.delist_url ? (
                                                                    <a
                                                                        href={finding.provider.delist_url}
                                                                        target="_blank"
                                                                        rel="noreferrer"
                                                                        className="inline-flex items-center gap-1 px-3 py-1 rounded-[9999px] bg-[#f5f5f5] hover:bg-[#d2f2e7] text-[#007a55] border border-[#e5e7eb] font-semibold transition"
                                                                    >
                                                                        <span>Delist Başvurusu</span>
                                                                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                                                        </svg>
                                                                    </a>
                                                                ) : (
                                                                    <span className="text-[#71717a] italic">Doğrudan başvuru yok</span>
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
                                <div className="bg-[#ffffff] border border-[#e5e7eb] rounded-[16px] p-6 shadow-[rgba(0,0,0,0.05)_0px_1px_2px_0px] space-y-4">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <h3 className="font-['Inter_Tight',sans-serif] text-sm font-semibold text-[#022c22]">
                                                Sorgu Geçmişi ve Eğilim (Trend)
                                            </h3>
                                            <p className="text-[12px] text-[#71717a]">
                                                Zaman içindeki sorgulama turları ve tespit edilen tehdit değişimi
                                            </p>
                                        </div>
                                        <span className="text-[11px] font-['ui-monospace'] text-[#71717a] bg-[#f5f5f5] px-2.5 py-1 rounded-[9999px] border border-[#e5e7eb]">
                                            {history.length} Kayıt
                                        </span>
                                    </div>

                                    {(trend.added.length > 0 || trend.removed.length > 0) && (
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                                            <div className="p-3 rounded-[12px] bg-[#fef2f2] border border-[#fecaca]">
                                                <div className="font-semibold text-[#dc2626] mb-1">Son sorguda eklenen kaynaklar ({trend.added.length})</div>
                                                {trend.added.length === 0 ? (
                                                    <p className="text-[#71717a]">Yok</p>
                                                ) : (
                                                    trend.added.map((item) => (
                                                        <p key={`${item.provider}-${item.ip_address}`} className="text-[#022c22]">
                                                            {item.provider} <span className="font-['ui-monospace'] text-[#71717a]">{item.ip_address}</span>
                                                        </p>
                                                    ))
                                                )}
                                            </div>
                                            <div className="p-3 rounded-[12px] bg-[#d2f2e7] border border-[#a7f3d0]">
                                                <div className="font-semibold text-[#007a55] mb-1">Listeden çıkaran kaynaklar ({trend.removed.length})</div>
                                                {trend.removed.length === 0 ? (
                                                    <p className="text-[#71717a]">Yok</p>
                                                ) : (
                                                    trend.removed.map((item) => (
                                                        <p key={`${item.provider}-${item.ip_address}`} className="text-[#022c22]">
                                                            {item.provider} <span className="font-['ui-monospace'] text-[#71717a]">{item.ip_address}</span>
                                                        </p>
                                                    ))
                                                )}
                                            </div>
                                        </div>
                                    )}

                                    <div className="divide-y divide-[#e5e7eb]">
                                        {history.length === 0 ? (
                                            <p className="text-xs text-[#71717a] italic py-4">Bu varlık için henüz sorgu geçmişi bulunmuyor.</p>
                                        ) : (
                                            history.map((check) => (
                                                <div key={check.id} className="py-3.5 flex items-center justify-between text-xs">
                                                    <div className="space-y-0.5">
                                                        <div className="flex items-center gap-2">
                                                            <span className="font-['ui-monospace'] text-[#022c22]">
                                                                {new Date(check.created_at).toLocaleString('tr-TR')}
                                                            </span>
                                                            <span className="text-[#e5e7eb]">•</span>
                                                            <span className="text-[#71717a]">{check.total_sources_queried} Kaynak Sorgulandı</span>
                                                        </div>
                                                        {check.error_message && (
                                                            <p className="text-[#dc2626] text-[11px]">{check.error_message}</p>
                                                        )}
                                                    </div>

                                                    <div className="flex items-center gap-3">
                                                        <span className="font-['ui-monospace'] text-[#71717a]">
                                                            {check.status !== 'completed' ? '—' : check.counted_threat_count > 0 ? `${check.counted_threat_count} Tehdit` : 'Temiz'}
                                                        </span>
                                                        {check.status === 'completed' ? (
                                                            getThreatBadge(check.highest_threat_level)
                                                        ) : (
                                                            <span className="inline-flex items-center px-3 py-1 rounded-[9999px] text-xs font-medium bg-[#f5f5f5] text-[#71717a] border border-[#e5e7eb]">
                                                                {check.status === 'failed' ? 'Başarısız' : 'Çalışıyor'}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>
                            </>
                        ) : (
                            <div className="bg-[#ffffff] border border-[#e5e7eb] rounded-[16px] p-12 text-center text-[#71717a] shadow-[rgba(0,0,0,0.05)_0px_1px_2px_0px]">
                                Seçili bir varlık bulunmuyor.
                            </div>
                        )}
                    </div>
                </div>
            </main>

            {/* Modal: Yeni Varlık Ekle (DESIGN.md: 16px radius, #ffffff surface, 1px Hairline border, pill buttons) */}
            {isAddModalOpen && (
                <div className="fixed inset-0 z-50 bg-[#000000]/40 backdrop-blur-[2px] flex items-center justify-center p-4">
                    <div className="bg-[#ffffff] border border-[#e5e7eb] rounded-[16px] p-6 max-w-md w-full shadow-lg relative">
                        <h2 className="font-['Inter_Tight',sans-serif] text-lg font-bold text-[#022c22]">
                            İzlenecek Yeni Varlık Ekle
                        </h2>
                        <p className="text-[12px] text-[#71717a] mt-1">
                            Alan adı girildiğinde A ve MX kayıtları her sorgu turunda otomatik çözümlenir.
                        </p>

                        <form onSubmit={handleCreateAsset} className="mt-5 space-y-4">
                            {errorMessages.length > 0 && (
                                <div className="p-3 rounded-[12px] bg-[#fef2f2] border border-[#fecaca] text-[12px] text-[#dc2626] space-y-1">
                                    {errorMessages.map((message) => (
                                        <p key={message}>{message}</p>
                                    ))}
                                </div>
                            )}
                            <div>
                                <label className="block text-[12px] font-semibold text-[#022c22] mb-1">Varlık Tipi</label>
                                <div className="grid grid-cols-2 gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setNewType('domain')}
                                        className={`px-3 py-2 rounded-[9999px] text-[13px] font-medium border transition ${
                                            newType === 'domain'
                                                ? 'bg-[#00bc7d] text-white border-[#00bc7d]'
                                                : 'bg-[#ffffff] text-[#71717a] border-[#e5e7eb] hover:bg-[#f5f5f5]'
                                        }`}
                                    >
                                        Alan Adı (Domain)
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setNewType('ip')}
                                        className={`px-3 py-2 rounded-[9999px] text-[13px] font-medium border transition ${
                                            newType === 'ip'
                                                ? 'bg-[#00bc7d] text-white border-[#00bc7d]'
                                                : 'bg-[#ffffff] text-[#71717a] border-[#e5e7eb] hover:bg-[#f5f5f5]'
                                        }`}
                                    >
                                        IP Adresi (Public IPv4)
                                    </button>
                                </div>
                            </div>

                            <div>
                                <label className="block text-[12px] font-semibold text-[#022c22] mb-1">
                                    {newType === 'domain' ? 'Alan Adı (Örn: mail.sirket.com)' : 'IP Adresi (Örn: 195.175.x.x)'}
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={newTarget}
                                    onChange={(e) => setNewTarget(e.target.value)}
                                    placeholder={newType === 'domain' ? 'ornek.com' : '8.8.8.8'}
                                    className="w-full px-3.5 py-2 rounded-[8px] bg-[#ffffff] border border-[#e5e7eb] text-[#022c22] text-[13px] font-['ui-monospace'] focus:outline-none focus:border-[#10b981]"
                                />
                            </div>

                            <div>
                                <label className="block text-[12px] font-semibold text-[#022c22] mb-1">Açıklama / Etiket (Opsiyonel)</label>
                                <input
                                    type="text"
                                    value={newName}
                                    onChange={(e) => setNewName(e.target.value)}
                                    placeholder="Örn: Ana Posta Sunucusu"
                                    className="w-full px-3.5 py-2 rounded-[8px] bg-[#ffffff] border border-[#e5e7eb] text-[#022c22] text-[13px] focus:outline-none focus:border-[#10b981]"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-[12px] font-semibold text-[#022c22] mb-1">Sorgu Döngüsü</label>
                                    <select
                                        value={newFrequency}
                                        onChange={(e) => setNewFrequency(e.target.value as any)}
                                        className="w-full px-3 py-2 rounded-[8px] bg-[#ffffff] border border-[#e5e7eb] text-[#022c22] text-[13px] focus:outline-none focus:border-[#10b981]"
                                    >
                                        <option value="weekly">Haftalık Otomatik</option>
                                        <option value="monthly">Aylık Otomatik</option>
                                        <option value="manual">Yalnızca Manuel</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-[12px] font-semibold text-[#022c22] mb-1">E-Posta Uyarısı</label>
                                    <input
                                        type="email"
                                        value={newAlertEmail}
                                        onChange={(e) => setNewAlertEmail(e.target.value)}
                                        placeholder="noc@sirket.com"
                                        className="w-full px-3.5 py-2 rounded-[8px] bg-[#ffffff] border border-[#e5e7eb] text-[#022c22] text-[13px] focus:outline-none focus:border-[#10b981]"
                                    />
                                </div>
                            </div>

                            <div className="mt-6 flex justify-end gap-2">
                                <button
                                    type="button"
                                    onClick={() => setIsAddModalOpen(false)}
                                    className="px-4 py-2 rounded-[9999px] text-[13px] font-medium text-[#71717a] hover:text-[#022c22] transition"
                                >
                                    Vazgeç
                                </button>
                                <button
                                    type="submit"
                                    className="px-5 py-2 rounded-[9999px] text-[13px] font-medium bg-[#00bc7d] hover:bg-[#007a55] text-white transition shadow-[rgba(0,0,0,0.05)_0px_1px_2px_0px]"
                                >
                                    Kaydet ve Sorgula
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal: Lisans Yönetimi */}
            {isLicenseModalOpen && (
                <div className="fixed inset-0 z-50 bg-[#000000]/40 backdrop-blur-[2px] flex items-center justify-center p-4">
                    <div className="bg-[#ffffff] border border-[#e5e7eb] rounded-[16px] p-6 max-w-md w-full shadow-lg relative">
                        <h2 className="font-['Inter_Tight',sans-serif] text-lg font-bold text-[#022c22]">
                            Lisans & Servis Paketi
                        </h2>
                        <p className="text-[12px] text-[#71717a] mt-1">
                            Lisans geçerlilik süresi dolarsa sorgu yapılamaz, yalnızca geçmiş görüntüleme yapılabilir.
                        </p>

                        <form onSubmit={handleUpdateLicense} className="mt-5 space-y-4">
                            {errorMessages.length > 0 && (
                                <div className="p-3 rounded-[12px] bg-[#fef2f2] border border-[#fecaca] text-[12px] text-[#dc2626] space-y-1">
                                    {errorMessages.map((message) => (
                                        <p key={message}>{message}</p>
                                    ))}
                                </div>
                            )}
                            <div>
                                <label className="block text-[12px] font-semibold text-[#022c22] mb-1">Lisans Anahtarı</label>
                                <input
                                    type="text"
                                    required
                                    value={licenseKey}
                                    onChange={(e) => setLicenseKey(e.target.value)}
                                    className="w-full px-3.5 py-2 rounded-[8px] bg-[#ffffff] border border-[#e5e7eb] text-[#022c22] text-[13px] font-['ui-monospace'] focus:outline-none focus:border-[#10b981]"
                                />
                            </div>

                            <div className="flex justify-between text-[12px] text-[#71717a]">
                                <span>Paket:</span>
                                <span className="text-[#022c22] font-medium">{license?.plan_name ?? 'Lisans yok'}</span>
                            </div>

                            <div>
                                <label className="block text-[12px] font-semibold text-[#022c22] mb-1">Yetkili İletişim E-Postası</label>
                                <input
                                    type="email"
                                    value={licenseEmail}
                                    onChange={(e) => setLicenseEmail(e.target.value)}
                                    className="w-full px-3.5 py-2 rounded-[8px] bg-[#ffffff] border border-[#e5e7eb] text-[#022c22] text-[13px] focus:outline-none focus:border-[#10b981]"
                                />
                            </div>

                            <div className="p-3.5 rounded-[12px] bg-[#f5f5f5] border border-[#e5e7eb] text-[12px] text-[#71717a] space-y-1.5">
                                <div className="flex justify-between">
                                    <span>Durum:</span>
                                    <span className={license?.is_active ? 'text-[#007a55] font-semibold' : 'text-[#dc2626] font-semibold'}>{license?.is_active ? 'Aktif Lisans' : 'Geçersiz / Yok'}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span>Bitiş Tarihi:</span>
                                    <span className="text-[#022c22] font-['ui-monospace']">{license?.expires_at ? new Date(license.expires_at).toLocaleDateString('tr-TR') : 'Süresiz'}</span>
                                </div>
                            </div>

                            <div className="mt-6 flex justify-end gap-2">
                                <button
                                    type="button"
                                    onClick={() => setIsLicenseModalOpen(false)}
                                    className="px-4 py-2 rounded-[9999px] text-[13px] font-medium text-[#71717a] hover:text-[#022c22] transition"
                                >
                                    Kapat
                                </button>
                                <button
                                    type="submit"
                                    className="px-5 py-2 rounded-[9999px] text-[13px] font-medium bg-[#00bc7d] hover:bg-[#007a55] text-white transition"
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
