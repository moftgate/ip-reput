<?php

namespace App\Console\Commands;

use App\Models\User;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Validator;

class CreateUserCommand extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'iprep:user {email : Kullanıcı e-postası} {--name= : Görünen ad}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Panele giriş yapacak kullanıcıyı oluşturur veya şifresini günceller';

    /**
     * Execute the console command.
     */
    public function handle(): int
    {
        $email = (string) $this->argument('email');
        $password = (string) $this->secret('Şifre (en az 12 karakter)');

        $validator = Validator::make(
            ['email' => $email, 'password' => $password],
            ['email' => 'required|email', 'password' => 'required|string|min:12'],
        );

        if ($validator->fails()) {
            foreach ($validator->errors()->all() as $error) {
                $this->error($error);
            }

            return self::FAILURE;
        }

        User::updateOrCreate(
            ['email' => $email],
            ['name' => $this->option('name') ?: $email, 'password' => $password],
        );

        $this->info("{$email} kullanıcısı kaydedildi.");

        return self::SUCCESS;
    }
}
