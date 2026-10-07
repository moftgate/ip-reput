<?php

namespace Database\Seeders;

use App\Models\BlacklistProvider;
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
                'name' => 'DroneBL (Abuse Botnets & Exploits)',
                'host' => 'dnsbl.dronebl.org',
                'threat_level' => 'high',
                'category' => 'attack',
                'is_counted' => true,
                'delist_url' => 'https://dronebl.org/lookup',
                'description' => 'Botnet aktivitesi, IRC saldırıları ve açık port kötüye kullanımı gerçekleştiren IP adresleri.',
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

        // Kapanan veya başka listeye taşınan kaynakları kaldır (SORBS, CBL)
        BlacklistProvider::whereNotIn('host', array_column($providers, 'host'))->delete();
    }
}
