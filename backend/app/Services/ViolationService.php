<?php

namespace App\Services;

use App\Models\User;

class ViolationService
{
    const WARN_THRESHOLD   = 1; // pertama langsung peringatan
    const REPORT_THRESHOLD = 3; // lapor admin setelah 3×

    public function record(User $user): array
    {
        $user->increment('violation_count');
        $user->refresh();

        $count  = $user->violation_count;
        $status = 'warning';

        if ($count >= self::REPORT_THRESHOLD) {
            // Auto-suspend jika 5× pelanggaran
            if ($count >= 5 && $user->status === 'active') {
                $user->update(['status' => 'suspended']);
                $status = 'suspended';
            } else {
                $status = 'reported'; // tercatat untuk review admin
            }
        }

        return [
            'count'   => $count,
            'status'  => $status,
            'message' => $this->getMessage($count, $status),
        ];
    }

    private function getMessage(int $count, string $status): string
    {
        return match (true) {
            $status === 'suspended' => "Akun Anda disuspend karena {$count}× pelanggaran. Hubungi admin.",
            $count >= self::REPORT_THRESHOLD => "Peringatan ke-{$count}: Aktivitas Anda dilaporkan ke admin.",
            default => "Peringatan: Jangan bagikan nomor HP atau link eksternal di chat. ({$count}× pelanggaran)",
        };
    }
}
