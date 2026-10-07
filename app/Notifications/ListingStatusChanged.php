<?php

namespace App\Notifications;

use App\Models\MonitoredAsset;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

/**
 * Short alert: no listing details, only a pointer to who must act.
 */
class ListingStatusChanged extends Notification implements ShouldQueue
{
    use Queueable;

    public function __construct(
        public MonitoredAsset $asset,
        public bool $isListed
    ) {}

    /**
     * @return array<int, string>
     */
    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        $target = $this->asset->target;
        $url = route('home', ['asset_id' => $this->asset->id]);

        if ($this->isListed) {
            return (new MailMessage)
                ->subject("[IPREP] {$target} kara listede tespit edildi")
                ->greeting('Kara liste uyarısı')
                ->line("{$target} bir veya daha fazla kara liste kaynağında görünüyor. E-posta teslimatı etkilenebilir.")
                ->line('Bu uyarıyı posta sunucusundan sorumlu sistem/NOC ekibine iletin. Temizleme başvurusu ilgili kaynağın sayfasından yapılır.')
                ->action('Paneli aç', $url);
        }

        return (new MailMessage)
            ->subject("[IPREP] {$target} kara listeden çıktı")
            ->greeting('Listeleme çözüldü')
            ->line("{$target} için son sorguda sayılan kara liste kaydı bulunmadı.")
            ->action('Paneli aç', $url);
    }
}
