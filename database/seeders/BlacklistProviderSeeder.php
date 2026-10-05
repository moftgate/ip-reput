<?php

namespace Database\Seeders;

use App\Models\BlacklistProvider;
use App\Models\LicenseSetting;
use App\Models\MonitoredAsset;
use App\Services\BlacklistCheckerService;
use Illuminate\Database\Seeder;

class BlacklistProviderSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // 1. Blacklist / RBL Providers Catalogue
        $providers = [
            // Sayılan Gerçek Tehdit Kaynakları (Spam, Saldırı, Kötüye Kullanım)
            [
                'name' => 'Spamhaus SBL (Spamhaus Block List)',
                'host' => 'sbl.spamhaus.org',
                'threat_level' => 'critical',
                'category' => 'spam',
                'is_counted' => true,
                'delist_url' => 'https://check.spamhaus.org/',
                'description' => 'Aktif spam kaynakları, spam botnetleri ve kurallara uymayan e-posta göndericileri.',
            ],
            [
                'name' => 'Spamhaus XBL (Exploits Block List)',
                'host' => 'xbl.spamhaus.org',
                'threat_level' => 'critical',
                'category' => 'attack',
                'is_counted' => true,
                'delist_url' => 'https://check.spamhaus.org/',
                'description' => 'Zararlı yazılım, truva atı, solucan ve ele geçirilmiş zombi sunucu/cihaz IP adresleri.',
            ],
            [
                'name' => 'Spamhaus CSS (Composite Snowshoe)',
                'host' => 'css.spamhaus.org',
                'threat_level' => 'high',
                'category' => 'spam',
                'is_counted' => true,
                'delist_url' => 'https://check.spamhaus.org/',
                'description' => 'Snowshoe spam teknikleri kullanan, IP aralıklarına dağıtılmış spam göndericileri.',
            ],
            [
                'name' => 'SpamCop Blocking List (SCBL)',
                'host' => 'bl.spamcop.net',
                'threat_level' => 'high',
                'category' => 'spam',
                'is_counted' => true,
                'delist_url' => 'https://www.spamcop.net/bl.shtml',
                'description' => 'Kullanıcı şikayetleri ve spam trap bal küpleri ile tespit edilmiş SMTP spam IP adresleri.',
            ],
            [
                'name' => 'Composite Blocking List (CBL)',
                'host' => 'cbl.abuseat.org',
                'threat_level' => 'critical',
                'category' => 'abuse',
                'is_counted' => true,
                'delist_url' => 'https://www.abuseat.org/lookup.cgi',
                'description' => 'Açık proxyler, trojan enfekte olmuş makineler ve spam gönderen botnetler.',
            ],
            [
                'name' => 'DroneBL (Abuse Botnets & Exploits)',
                'host' => 'dnsbl.dronebl.org',
                'threat_level' => 'high',
                'category' => 'attack',
                'is_counted' => true,
                'delist_url' => 'https://dronebl.org/lookup',
                'description' => 'Botnet aktivitesi, IRC saldırıları ve açık port kötüye kullanımı gerçekleştiren IP adresleri.',
            ],
            [
                'name' => 'SORBS Spam List',
                'host' => 'spam.dnsbl.sorbs.net',
                'threat_level' => 'medium',
                'category' => 'spam',
                'is_counted' => true,
                'delist_url' => 'http://www.sorbs.net/delisting/overview.shtml',
                'description' => 'Geçmişte veya yakın zamanda spam gönderdiği teyit edilmiş IP adresleri.',
            ],
            [
                'name' => 'SORBS New (Recent Spam)',
                'host' => 'new.spam.dnsbl.sorbs.net',
                'threat_level' => 'medium',
                'category' => 'spam',
                'is_counted' => true,
                'delist_url' => 'http://www.sorbs.net/delisting/overview.shtml',
                'description' => 'Son 48 saat içerisinde tespit edilen yeni spam aktiviteleri.',
            ],
            [
                'name' => 'UCEPROTECT Network - Level 1',
                'host' => 'dnsbl-1.uceprotect.net',
                'threat_level' => 'high',
                'category' => 'spam',
                'is_counted' => true,
                'delist_url' => 'http://www.uceprotect.net/en/rblcheck.php',
                'description' => 'Doğrudan spam gönderen tekil IP adresleri.',
            ],
            [
                'name' => 'Mailspike IP Reputation (Z)',
                'host' => 'z.mailspike.net',
                'threat_level' => 'medium',
                'category' => 'reputation',
                'is_counted' => true,
                'delist_url' => 'https://mailspike.org/iplookup.html',
                'description' => 'Kötü e-posta itibar puanına sahip ve teslimat riski taşıyan IP blokları.',
            ],

            // Sayılmayan / Bilgilendirme / Politika Amaçlı Kaynaklar (Kural: Riski artırmaz)
            [
                'name' => 'Spamhaus PBL (Policy Block List)',
                'host' => 'pbl.spamhaus.org',
                'threat_level' => 'low',
                'category' => 'policy',
                'is_counted' => false, // Politika listesi sayılmaz!
                'delist_url' => 'https://check.spamhaus.org/',
                'description' => 'Son kullanıcı dinamik IP aralıkları (ADSL, Fiber vb.). E-posta sunucusu barındırmaması gereken aralıklar, tehdit değildir.',
            ],
            [
                'name' => 'Tor Exit Nodes (Dan.me.uk)',
                'host' => 'tor.dan.me.uk',
                'threat_level' => 'low',
                'category' => 'informational',
                'is_counted' => false, // Tor/Bilgi amaçlı sayılmaz!
                'delist_url' => 'https://dan.me.uk/torlist/',
                'description' => 'Tor çıkış düğümü listesi. E-posta teslimat güvenliğini doğrudan bozmaz, bilgi amaçlıdır.',
            ],
            [
                'name' => 'Barracuda Reputation (BBQ Informational)',
                'host' => 'b.barracudacentral.org',
                'threat_level' => 'low',
                'category' => 'informational',
                'is_counted' => false, // Barracuda bilgi/genel sayılmaz
                'delist_url' => 'https://www.barracudacentral.org/lookups',
                'description' => 'Genel itibar ve bilgi referans kontrolü.',
            ],
        ];

        foreach ($providers as $providerData) {
            BlacklistProvider::updateOrCreate(
                ['host' => $providerData['host']],
                $providerData
            );
        }

        // 2. License Default Setting
        LicenseSetting::updateOrCreate(
            ['id' => 1],
            [
                'license_key' => 'IPREP-PRO-9842-7194-GLOBAL',
                'plan_name' => 'Kurumsal Paket Lisansı',
                'is_active' => true,
                'expires_at' => now()->addYears(1),
                'max_assets' => 100,
                'contact_email' => 'noc@sirketiniz.com',
            ]
        );

        // 3. Demo İzlenen Varlıklar
        $assets = [
            [
                'name' => 'Şirket Ana Posta Sunucusu',
                'type' => 'domain',
                'target' => 'mail.google.com',
                'frequency' => 'weekly',
                'alert_email' => 'sistem@sirketiniz.com',
            ],
            [
                'name' => 'Dış Statik Çıkış IP',
                'type' => 'ip',
                'target' => '1.1.1.1',
                'frequency' => 'weekly',
                'alert_email' => 'noc@sirketiniz.com',
            ],
            [
                'name' => 'Kurumsal Web ve MX Alan Adı',
                'type' => 'domain',
                'target' => 'github.com',
                'frequency' => 'monthly',
                'alert_email' => 'admin@sirketiniz.com',
            ],
        ];

        $checker = app(BlacklistCheckerService::class);

        foreach ($assets as $assetData) {
            $asset = MonitoredAsset::updateOrCreate(
                ['target' => $assetData['target']],
                $assetData
            );

            // İlk sorguyu çalıştır (Kural 02 & Nasıl çalışır gereği)
            try {
                $checker->checkAsset($asset);
            } catch (\Throwable $e) {
                // Ignore initial network timeout in offline test
            }
        }
    }
}
