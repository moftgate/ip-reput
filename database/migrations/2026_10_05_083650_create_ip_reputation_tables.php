<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // Kara liste sağlayıcıları / veritabanları
        Schema::create('blacklist_providers', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('host'); // Örn: zen.spamhaus.org
            $table->enum('threat_level', ['critical', 'high', 'medium', 'low'])->default('medium');
            $table->enum('category', ['spam', 'abuse', 'attack', 'reputation', 'policy', 'informational'])->default('spam');
            $table->boolean('is_counted')->default(true); // PBL ve bilgi amaçlı Tor/Barracuda vb. sayılmaz
            $table->boolean('is_active')->default(true);
            $table->string('delist_url')->nullable(); // Temizleme başvuru URL'si
            $table->text('description')->nullable();
            $table->timestamps();
        });

        // İzlenen Varlıklar (Alan adı veya IP adresi)
        Schema::create('monitored_assets', function (Blueprint $table) {
            $table->id();
            $table->string('name')->nullable(); // Opsiyonel şirket/etiket adı
            $table->enum('type', ['domain', 'ip']); // Alan adı ya da IP adresi
            $table->string('target'); // domain.com veya 192.168.1.1
            $table->enum('frequency', ['manual', 'weekly', 'monthly'])->default('weekly');
            $table->enum('highest_threat_level', ['clean', 'low', 'medium', 'high', 'critical'])->default('clean');
            $table->unsignedInteger('active_listings_count')->default(0);
            $table->timestamp('last_checked_at')->nullable();
            $table->string('alert_email')->nullable(); // Bildirim e-posta adresi
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });

        // Alan adının DNS kayıtları (A ve MX kayıtlarından çözülen IP'ler)
        Schema::create('asset_resolved_ips', function (Blueprint $table) {
            $table->id();
            $table->foreignId('monitored_asset_id')->constrained()->cascadeOnDelete();
            $table->string('ip_address', 45); // IPv4 veya IPv6
            $table->string('record_type', 10); // A, MX, NS vb.
            $table->string('hostname')->nullable(); // MX hedef sunucu adı
            $table->timestamp('last_resolved_at')->nullable();
            $table->timestamps();

            $table->unique(['monitored_asset_id', 'ip_address', 'record_type']);
        });

        // Her sorgulama oturumu (Check Run)
        Schema::create('reputation_checks', function (Blueprint $table) {
            $table->id();
            $table->foreignId('monitored_asset_id')->constrained()->cascadeOnDelete();
            $table->unsignedInteger('total_sources_queried')->default(0);
            $table->unsignedInteger('listed_count')->default(0);
            $table->unsignedInteger('counted_threat_count')->default(0);
            $table->enum('highest_threat_level', ['clean', 'low', 'medium', 'high', 'critical'])->default('clean');
            $table->enum('status', ['pending', 'running', 'completed', 'failed'])->default('completed');
            $table->text('error_message')->nullable();
            $table->timestamps();
        });

        // Sorgu sonuçları detayları (Listing Findings)
        Schema::create('reputation_findings', function (Blueprint $table) {
            $table->id();
            $table->foreignId('reputation_check_id')->constrained()->cascadeOnDelete();
            $table->foreignId('monitored_asset_id')->constrained()->cascadeOnDelete();
            $table->foreignId('blacklist_provider_id')->constrained()->cascadeOnDelete();
            $table->string('ip_address', 45);
            $table->boolean('is_listed')->default(false);
            $table->string('response_code')->nullable(); // Örn: 127.0.0.2
            $table->string('response_text')->nullable(); // TXT kaydı bilgisi
            $table->enum('threat_level', ['clean', 'low', 'medium', 'high', 'critical'])->default('clean');
            $table->boolean('is_counted')->default(true); // Gerçek tehdit sayılanlar
            $table->timestamp('listed_at')->nullable();
            $table->timestamp('delisted_at')->nullable();
            $table->timestamps();
        });

        // Lisans Ayarları & İtibar Servisi Lisansı
        Schema::create('license_settings', function (Blueprint $table) {
            $table->id();
            $table->string('license_key')->nullable();
            $table->string('plan_name')->default('Enterprise Suite');
            $table->boolean('is_active')->default(true);
            $table->timestamp('expires_at')->nullable();
            $table->unsignedInteger('max_assets')->default(50);
            $table->string('contact_email')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('license_settings');
        Schema::dropIfExists('reputation_findings');
        Schema::dropIfExists('reputation_checks');
        Schema::dropIfExists('asset_resolved_ips');
        Schema::dropIfExists('monitored_assets');
        Schema::dropIfExists('blacklist_providers');
    }
};
