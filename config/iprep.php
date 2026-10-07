<?php

return [

    /*
    |--------------------------------------------------------------------------
    | License Public Key
    |--------------------------------------------------------------------------
    |
    | Base64 Ed25519 public key used to verify license keys. Only the vendor
    | holds the matching private key (IPREP_LICENSE_PRIVATE_KEY), which is
    | needed to issue new keys with `php artisan iprep:license`.
    |
    */

    'license_public_key' => env('IPREP_LICENSE_PUBLIC_KEY'),

    'license_private_key' => env('IPREP_LICENSE_PRIVATE_KEY'),

];
