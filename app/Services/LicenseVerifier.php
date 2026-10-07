<?php

namespace App\Services;

use Carbon\CarbonInterface;

/**
 * Offline license keys: "IPREP1.<base64url payload>.<base64url Ed25519 signature>".
 */
class LicenseVerifier
{
    public const PREFIX = 'IPREP1';

    /**
     * @return array{plan: string, max_assets: int, expires_at: ?string, issued_to: ?string}|null
     */
    public function verify(string $licenseKey): ?array
    {
        $publicKey = base64_decode((string) config('iprep.license_public_key'), true);

        if ($publicKey === false || strlen($publicKey) !== SODIUM_CRYPTO_SIGN_PUBLICKEYBYTES) {
            return null;
        }

        $parts = explode('.', trim($licenseKey));

        if (count($parts) !== 3 || $parts[0] !== self::PREFIX) {
            return null;
        }

        $payload = $this->base64UrlDecode($parts[1]);
        $signature = $this->base64UrlDecode($parts[2]);

        if ($payload === null || $signature === null || strlen($signature) !== SODIUM_CRYPTO_SIGN_BYTES) {
            return null;
        }

        if (! sodium_crypto_sign_verify_detached($signature, $payload, $publicKey)) {
            return null;
        }

        $data = json_decode($payload, true);

        if (! is_array($data) || ! isset($data['plan'], $data['max_assets'])) {
            return null;
        }

        return [
            'plan' => (string) $data['plan'],
            'max_assets' => (int) $data['max_assets'],
            'expires_at' => isset($data['expires_at']) ? (string) $data['expires_at'] : null,
            'issued_to' => isset($data['issued_to']) ? (string) $data['issued_to'] : null,
        ];
    }

    public function issue(string $plan, int $maxAssets, ?CarbonInterface $expiresAt, ?string $issuedTo, string $privateKeyBase64): string
    {
        $privateKey = base64_decode($privateKeyBase64, true);

        if ($privateKey === false || strlen($privateKey) !== SODIUM_CRYPTO_SIGN_SECRETKEYBYTES) {
            throw new \InvalidArgumentException('Geçersiz lisans özel anahtarı.');
        }

        $payload = (string) json_encode([
            'plan' => $plan,
            'max_assets' => $maxAssets,
            'expires_at' => $expiresAt?->toIso8601String(),
            'issued_to' => $issuedTo,
        ]);

        return implode('.', [
            self::PREFIX,
            $this->base64UrlEncode($payload),
            $this->base64UrlEncode(sodium_crypto_sign_detached($payload, $privateKey)),
        ]);
    }

    /**
     * @return array{public: string, private: string}
     */
    public function generateKeyPair(): array
    {
        $keyPair = sodium_crypto_sign_keypair();

        return [
            'public' => base64_encode(sodium_crypto_sign_publickey($keyPair)),
            'private' => base64_encode(sodium_crypto_sign_secretkey($keyPair)),
        ];
    }

    protected function base64UrlEncode(string $value): string
    {
        return rtrim(strtr(base64_encode($value), '+/', '-_'), '=');
    }

    protected function base64UrlDecode(string $value): ?string
    {
        $decoded = base64_decode(strtr($value, '-_', '+/'), true);

        return $decoded === false ? null : $decoded;
    }
}
