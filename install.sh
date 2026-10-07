#!/usr/bin/env bash
# ==============================================================================
# 🛡️ IP & Domain Reputation Monitor (ip-reput) - Ubuntu Kurulum Scripti
# ==============================================================================
# Bu script Ubuntu 20.04 / 22.04 / 24.04 LTS sunucularda PHP 8.3, Composer,
# Node.js, Nginx, Supervisor ve Laravel ortamını otomatik kurar ve yapılandırır.
# ==============================================================================

set -euo pipefail
IFS=$'\n\t'

# --- Renk ve Biçimlendirme ---
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m' # No Color

# --- Yardımcı Fonksiyonlar ---
log_info() {
    echo -e "${BLUE}[BİLGİ]${NC} $1"
}

log_step() {
    echo -e "\n${CYAN}${BOLD}==>${NC} ${BOLD}$1${NC}"
}

log_success() {
    echo -e "${GREEN}[BAŞARILI]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[UYARI]${NC} $1"
}

log_error() {
    echo -e "${RED}[HATA]${NC} $1" >&2
}

# Hata yakalama
trap_error() {
    local exit_code=$?
    local line_no=$1
    log_error "Kurulum ${line_no}. satırda beklenmeyen bir hata ile durdu (Çıkış kodu: ${exit_code})."
    exit "${exit_code}"
}
trap 'trap_error ${LINENO}' ERR

# --- Ön Tanımlı Değişkenler ---
PHP_VERSION="${PHP_VERSION:-8.3}"
NODE_VERSION="${NODE_VERSION:-20}"
WEB_USER="${WEB_USER:-www-data}"
WEB_GROUP="${WEB_GROUP:-www-data}"
APP_NAME="iprep"

# Scriptin çalıştırıldığı dizin veya hedef dizin
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TARGET_DIR="${APP_DIR:-$SCRIPT_DIR}"
DOMAIN="${APP_DOMAIN:-localhost}"
NON_INTERACTIVE="${NON_INTERACTIVE:-0}"

# Parametre işleme
while [[ $# -gt 0 ]]; do
    case "$1" in
        -d|--domain)
            DOMAIN="$2"
            shift 2
            ;;
        --path)
            TARGET_DIR="$2"
            shift 2
            ;;
        -y|--non-interactive|--yes)
            NON_INTERACTIVE=1
            shift
            ;;
        -h|--help)
            echo -e "${BOLD}Kullanım:${NC} sudo bash install.sh [seçenekler]"
            echo ""
            echo "Seçenekler:"
            echo "  -d, --domain <domain>     Sunucu alan adı veya IP adresi (Varsayılan: localhost)"
            echo "  --path <dizin>            Kurulum yapılacak proje dizini (Varsayılan: mevcut dizin)"
            echo "  -y, --yes                 Etkileşimsiz otomatik kurulum modu"
            echo "  -h, --help                Bu yardım mesajını gösterir"
            exit 0
            ;;
        *)
            log_warn "Bilinmeyen parametre: $1"
            shift
            ;;
    esac
done

# --- Başlık ---
clear 2>/dev/null || true
echo -e "${CYAN}${BOLD}"
echo "=================================================================="
echo "   🛡️  IP & Domain Reputation Monitor (ip-reput) Installer       "
echo "=================================================================="
echo -e "${NC}"

# 1. Yetki Kontrolü
if [[ "${EUID}" -ne 0 ]]; then
    log_error "Bu script root yetkisi ile çalıştırılmalıdır. Lütfen 'sudo bash install.sh' olarak çalıştırın."
    exit 1
fi

# 2. İşletim Sistemi Kontrolü
log_step "İşletim sistemi kontrol ediliyor..."
if [ -f /etc/os-release ]; then
    . /etc/os-release
    if [[ "${ID}" != "ubuntu" && "${ID_LIKE:-}" != *"ubuntu"* && "${ID}" != "debian" ]]; then
        log_warn "Bu script Ubuntu/Debian sistemler için test edilmiştir. Algılanan sistem: ${NAME}"
    else
        log_success "İşletim sistemi: ${NAME} ${VERSION_ID:-}"
    fi
else
    log_error "/etc/os-release dosyası bulunamadı. Desteklenmeyen dağıtım."
    exit 1
fi

# 3. Parametreleri Onaylama
if [[ "${NON_INTERACTIVE}" -eq 0 ]]; then
    echo -e "\nKurulum Yapılandırması:"
    echo -e "  - Proje Dizini: ${BOLD}${TARGET_DIR}${NC}"
    echo -e "  - PHP Sürümü:   ${BOLD}${PHP_VERSION}${NC}"
    echo -e "  - Node Sürümü:  ${BOLD}${NODE_VERSION}.x LTS${NC}"
    echo -e "  - Domain/Host:   ${BOLD}${DOMAIN}${NC}"
    echo ""
    read -rp "Kuruluma devam etmek istiyor musunuz? [E/h]: " CONFIRM
    CONFIRM=${CONFIRM:-E}
    if [[ ! "${CONFIRM}" =~ ^[eEyY]$ ]]; then
        log_info "Kurulum iptal edildi."
        exit 0
    fi
fi

# 4. Paket Listesi Güncelleme ve Temel Araçlar
log_step "Sistem paketleri güncelleniyor ve temel araçlar yükleniyor..."
export DEBIAN_FRONTEND=noninteractive
apt-get update -y
apt-get install -y --no-install-recommends \
    curl \
    git \
    unzip \
    zip \
    software-properties-common \
    ca-certificates \
    gnupg \
    lsb-release \
    cron \
    supervisor \
    nginx \
    sqlite3 \
    libsqlite3-dev

# 5. PHP 8.3 Kurulumu
log_step "PHP ${PHP_VERSION} ve gerekli eklentiler kuruluyor..."
if ! grep -q "^deb .*ondrej/php" /etc/apt/sources.list /etc/apt/sources.list.d/* 2>/dev/null; then
    log_info "Ondřej Surý PHP PPA deposu ekleniyor..."
    add-apt-repository -y ppa:ondrej/php
    apt-get update -y
fi

apt-get install -y \
    "php${PHP_VERSION}-fpm" \
    "php${PHP_VERSION}-cli" \
    "php${PHP_VERSION}-common" \
    "php${PHP_VERSION}-sqlite3" \
    "php${PHP_VERSION}-curl" \
    "php${PHP_VERSION}-mbstring" \
    "php${PHP_VERSION}-xml" \
    "php${PHP_VERSION}-zip" \
    "php${PHP_VERSION}-bcmath" \
    "php${PHP_VERSION}-intl" \
    "php${PHP_VERSION}-readline" \
    "php${PHP_VERSION}-redis" || true

log_success "PHP ${PHP_VERSION} kuruldu: $(php -v | head -n 1)"

# 6. Composer Kurulumu
log_step "Composer kontrol ediliyor..."
if ! command -v composer &>/dev/null; then
    log_info "Composer indiriliyor ve kuruluyor..."
    EXPECTED_CHECKSUM="$(curl -sS https://composer.github.io/installer.sig)"
    php -r "copy('https://getcomposer.org/installer', 'composer-setup.php');"
    ACTUAL_CHECKSUM="$(php -r "echo hash_file('sha384', 'composer-setup.php');")"

    if [ "$EXPECTED_CHECKSUM" != "$ACTUAL_CHECKSUM" ]; then
        rm composer-setup.php
        log_error "Composer kurulum dosyası bütünlük doğrulaması başarısız oldu!"
        exit 1
    fi

    php composer-setup.php --quiet --install-dir=/usr/local/bin --filename=composer
    rm composer-setup.php
    log_success "Composer kuruldu: $(composer --version | head -n 1)"
else
    log_success "Composer mevcut: $(composer --version | head -n 1)"
fi

# 7. Node.js & NPM Kurulumu
log_step "Node.js ${NODE_VERSION}.x kontrol ediliyor..."
CURRENT_NODE_VER=""
if command -v node &>/dev/null; then
    CURRENT_NODE_VER="$(node -v | cut -d'v' -f2 | cut -d'.' -f1)"
fi

if [[ -z "${CURRENT_NODE_VER}" || "${CURRENT_NODE_VER}" -lt 18 ]]; then
    log_info "NodeSource Node.js ${NODE_VERSION}.x deposu ekleniyor..."
    mkdir -p /etc/apt/keyrings
    curl -fsSL https://deb.nodesource.com/gpgkey/nodesource-repo.gpg.key | gpg --dearmor -o /etc/apt/keyrings/nodesource.gpg --yes
    echo "deb [signed-by=/etc/apt/keyrings/nodesource.gpg] https://deb.nodesource.com/node_${NODE_VERSION}.x nodistro main" | tee /etc/apt/sources.list.d/nodesource.list
    apt-get update -y
    apt-get install -y nodejs
    log_success "Node.js kuruldu: $(node -v) / NPM: $(npm -v)"
else
    log_success "Node.js zaten mevcut: $(node -v)"
fi

# 8. Proje Dizin Yapılandırması
log_step "Proje dosyaları ve ortam değişkenleri hazırlanıyor..."
if [[ ! -d "${TARGET_DIR}" ]]; then
    log_info "Hedef dizin oluşturuluyor: ${TARGET_DIR}"
    mkdir -p "${TARGET_DIR}"
fi

cd "${TARGET_DIR}"

# .env Dosyası
if [[ ! -f .env ]]; then
    if [[ -f .env.example ]]; then
        log_info ".env.example dosyasından .env oluşturuluyor..."
        cp .env.example .env
    else
        log_error ".env.example dosyası bulunamadı!"
        exit 1
    fi
fi

# .env içindeki temel ayarlar
sed -i "s|^APP_ENV=.*|APP_ENV=production|" .env
sed -i "s|^APP_DEBUG=.*|APP_DEBUG=false|" .env
if [[ "${DOMAIN}" != "localhost" ]]; then
    sed -i "s|^APP_URL=.*|APP_URL=http://${DOMAIN}|" .env
fi
sed -i "s|^DB_CONNECTION=.*|DB_CONNECTION=sqlite|" .env
sed -i "s|^QUEUE_CONNECTION=.*|QUEUE_CONNECTION=database|" .env
sed -i "s|^SESSION_DRIVER=.*|SESSION_DRIVER=database|" .env
sed -i "s|^CACHE_STORE=.*|CACHE_STORE=database|" .env

# SQLite Veritabanı Dosyası
mkdir -p "${TARGET_DIR}/database"
if [[ ! -f "${TARGET_DIR}/database/database.sqlite" ]]; then
    log_info "SQLite veritabanı oluşturuluyor..."
    touch "${TARGET_DIR}/database/database.sqlite"
fi

# 9. PHP ve JS Bağımlılıklarının Kurulumu
log_step "PHP bağımlılıkları kuruluyor (Composer)..."
export COMPOSER_ALLOW_SUPERUSER=1
composer install --no-interaction --prefer-dist --optimize-autoloader --no-dev

log_step "Uygulama anahtarı üretiliyor ve veritabanı hazırlanıyor..."
php artisan key:generate --force --ansi
php artisan migrate --force --ansi
php artisan db:seed --force --ansi

log_step "Frontend bağımlılıkları yükleniyor ve derleniyor (Vite)..."
npm install --no-audit --prefer-offline || npm install
npm run build

log_step "Önbellekler optimize ediliyor..."
php artisan config:cache || true
php artisan route:cache || true
php artisan view:cache || true

# 10. İzin ve Sahiplik Ayarları
log_step "Dosya izinleri ve sahiplik ayarlanıyor (${WEB_USER}:${WEB_GROUP})..."
chown -R "${WEB_USER}:${WEB_GROUP}" "${TARGET_DIR}"
find "${TARGET_DIR}" -type d -exec chmod 755 {} \;
find "${TARGET_DIR}" -type f -exec chmod 644 {} \;

chmod -R 775 "${TARGET_DIR}/storage"
chmod -R 775 "${TARGET_DIR}/bootstrap/cache"
chmod -R 775 "${TARGET_DIR}/database"
chmod 664 "${TARGET_DIR}/database/database.sqlite"

# 11. Nginx Yapılandırması
log_step "Nginx web sunucusu yapılandırılıyor..."
NGINX_CONF="/etc/nginx/sites-available/${APP_NAME}.conf"
PHP_FPM_SOCK="/run/php/php${PHP_VERSION}-fpm.sock"

cat > "${NGINX_CONF}" <<EOF
server {
    listen 80;
    listen [::]:80;
    server_name ${DOMAIN};
    root ${TARGET_DIR}/public;

    add_header X-Frame-Options "SAMEORIGIN";
    add_header X-Content-Type-Options "nosniff";
    add_header X-XSS-Protection "1; mode=block";

    index index.php;
    charset utf-8;

    location / {
        try_files \$uri \$uri/ /index.php?\$query_string;
    }

    location = /favicon.ico { access_log off; log_not_found off; }
    location = /robots.txt  { access_log off; log_not_found off; }

    error_page 404 /index.php;

    location ~ \.php$ {
        fastcgi_pass unix:${PHP_FPM_SOCK};
        fastcgi_param SCRIPT_FILENAME \$realpath_root\$fastcgi_script_name;
        include fastcgi_params;
        fastcgi_hide_header X-Powered-By;
    }

    location ~ /\.(?!well-known).* {
        deny all;
    }

    client_max_body_size 20M;
}
EOF

# Nginx sitesini etkinleştir
if [[ ! -f "/etc/nginx/sites-enabled/${APP_NAME}.conf" ]]; then
    ln -sf "${NGINX_CONF}" "/etc/nginx/sites-enabled/${APP_NAME}.conf"
fi

# Çakışmayı önlemek için varsayılan siteyi devre dışı bırak (eğer domain _ veya localhost ise)
if [[ "${DOMAIN}" == "_" || "${DOMAIN}" == "localhost" ]] && [[ -f "/etc/nginx/sites-enabled/default" ]]; then
    rm -f "/etc/nginx/sites-enabled/default"
fi

nginx -t
systemctl reload nginx
systemctl enable nginx

# 12. Supervisor Kuyruk Yöneticisi (Queue Worker) Yapılandırması
log_step "Supervisor Queue Worker yapılandırılıyor..."
SUPERVISOR_CONF="/etc/supervisor/conf.d/${APP_NAME}-worker.conf"

cat > "${SUPERVISOR_CONF}" <<EOF
[program:${APP_NAME}-worker]
process_name=%(program_name)s_%(process_num)02d
command=php ${TARGET_DIR}/artisan queue:work --sleep=3 --tries=3 --max-time=3600
autostart=true
autorestart=true
stopasgroup=true
killasgroup=true
user=${WEB_USER}
numprocs=2
redirect_stderr=true
stdout_logfile=/var/log/supervisor/${APP_NAME}-worker.log
stopwaitsecs=3600
EOF

supervisorctl reread
supervisorctl update
supervisorctl restart "${APP_NAME}-worker:*" || supervisorctl start "${APP_NAME}-worker:*"
systemctl enable supervisor

# 13. Crontab (Laravel Scheduler) Yapılandırması
log_step "Otomatik arka plan zamanlayıcısı (Cron) tanımlanıyor..."
CRON_FILE="/etc/cron.d/${APP_NAME}"
cat > "${CRON_FILE}" <<EOF
* * * * * ${WEB_USER} php ${TARGET_DIR}/artisan schedule:run >> /dev/null 2>&1
EOF
chmod 0644 "${CRON_FILE}"

# PHP-FPM servisinin çalıştığından emin ol
systemctl restart "php${PHP_VERSION}-fpm"
systemctl enable "php${PHP_VERSION}-fpm"

# 14. Panel Kullanıcısı Oluşturma
log_step "Panel yöneticisi kullanıcı kurulumu..."
if [[ "${NON_INTERACTIVE}" -eq 0 ]]; then
    echo ""
    read -rp "Şimdi bir panel yönetici kullanıcısı oluşturmak ister misiniz? [E/h]: " CREATE_ADMIN
    CREATE_ADMIN=${CREATE_ADMIN:-E}
    if [[ "${CREATE_ADMIN}" =~ ^[eEyY]$ ]]; then
        read -rp "Yönetici E-posta Adresi: " ADMIN_EMAIL
        if [[ -n "${ADMIN_EMAIL}" ]]; then
            php "${TARGET_DIR}/artisan" iprep:user "${ADMIN_EMAIL}" || true
        fi
    fi
else
    log_info "Non-interactive mod: Panel kullanıcısını daha sonra 'php artisan iprep:user <email>' ile oluşturabilirsiniz."
fi

# --- Tamamlanma Özeti ---
echo -e "\n${GREEN}${BOLD}==================================================================${NC}"
echo -e "${GREEN}${BOLD}   🎉 Tebrikler! ip-reput Kurulumu Başarıyla Tamamlandı!         ${NC}"
echo -e "${GREEN}${BOLD}==================================================================${NC}\n"

echo -e "📌 ${BOLD}Önemli Bilgiler & Sonraki Adımlar:${NC}"
echo -e "  1. ${CYAN}Web Erişimi:${NC} http://${DOMAIN}"
echo -e "  2. ${CYAN}Yönetici Kullanıcısı:${NC}"
echo -e "     Yeni kullanıcı eklemek veya şifre sıfırlamak için:"
echo -e "     ${BOLD}cd ${TARGET_DIR} && sudo -u ${WEB_USER} php artisan iprep:user admin@sirket.com${NC}"
echo -e "  3. ${CYAN}Lisans Tanımlama:${NC}"
echo -e "     ${TARGET_DIR}/.env dosyasında ${BOLD}IPREP_LICENSE_PUBLIC_KEY${NC} anahtarınızı kontrol edin"
echo -e "     veya web arayüzündeki lisans penceresinden lisansınızı girin."
echo -e "  4. ${CYAN}SSL / HTTPS Sertifikası (Certbot):${NC}"
echo -e "     ${BOLD}sudo apt-get install -y certbot python3-certbot-nginx${NC}"
echo -e "     ${BOLD}sudo certbot --nginx -d ${DOMAIN}${NC}"
echo -e "  5. ${CYAN}Kuyruk ve Servis Durumları:${NC}"
echo -e "     - Supervisor: ${BOLD}sudo supervisorctl status${NC}"
echo -e "     - Nginx:      ${BOLD}sudo systemctl status nginx${NC}"
echo -e "     - PHP-FPM:    ${BOLD}sudo systemctl status php${PHP_VERSION}-fpm${NC}"
echo ""
