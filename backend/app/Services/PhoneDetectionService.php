<?php

namespace App\Services;

/**
 * Deteksi nomor HP dan link bypass dalam pesan chat.
 * Sesuai dokumen: blokir otomatis, peringatan, laporan ke admin setelah 3×+.
 */
class PhoneDetectionService
{
    // Normalisasi karakter visual yang sering dipakai untuk menyamarkan
    private function normalize(string $text): string
    {
        return str_replace(
            ['O', 'o', 'I', 'l', '|', '.', '-', ' ', '(', ')'],
            ['0', '0', '1', '1', '1', '',  '',  '',  '',  '' ],
            $text
        );
    }

    public function containsPhone(string $text): bool
    {
        return $this->detectPhoneNumber($text) !== null
            || $this->detectBypassLink($text) !== null;
    }

    public function detectPhoneNumber(string $text): ?string
    {
        // Format asli: 08xx, +628xx, 628xx dengan berbagai separator
        $patterns = [
            '/\b(0|\+?62)[\s\-\.]?8[\s\-\.]?[0-9][\s\-\.]?[0-9][\s\-\.]?[0-9][\s\-\.]?[0-9][\s\-\.]?[0-9][\s\-\.]{0,2}[0-9]{0,6}\b/',
            // Format disamarkan huruf: O8xx, 0Bxx, dll
        ];

        foreach ($patterns as $pattern) {
            if (preg_match($pattern, $text, $m)) {
                return $m[0];
            }
        }

        // Cek setelah normalisasi karakter
        $normalized = $this->normalize($text);
        if (preg_match('/\b(0|62)8[0-9]{8,11}\b/', $normalized)) {
            return 'nomor HP tersamar';
        }

        return null;
    }

    public function detectBypassLink(string $text): ?string
    {
        $patterns = [
            '/wa\.me/i',
            '/whatsapp/i',
            '/t\.me\//i',
            '/telegram\.me/i',
            '/line\.me/i',
        ];

        foreach ($patterns as $p) {
            if (preg_match($p, $text, $m)) {
                return $m[0];
            }
        }

        return null;
    }

    public function getReason(string $text): string
    {
        if ($this->detectBypassLink($text)) {
            return 'Pesan mengandung link platform eksternal (WA/Telegram/Line).';
        }
        return 'Pesan mengandung nomor HP.';
    }
}
