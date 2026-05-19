<?php

namespace App\Http\Controllers\Api\Mitra;

use App\Http\Controllers\Controller;
use App\Models\MitraDocument;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class OnboardingController extends Controller
{
    private const DOC_TYPES = ['ktp', 'sim', 'stnk', 'vehicle_photo'];

    private const DOC_LABELS = [
        'ktp'           => 'KTP (Kartu Tanda Penduduk)',
        'sim'           => 'SIM (Surat Izin Mengemudi)',
        'stnk'          => 'STNK (Surat Tanda Nomor Kendaraan)',
        'vehicle_photo' => 'Foto Kendaraan',
    ];

    public function status(Request $request): JsonResponse
    {
        $user  = $request->user();
        $docs  = MitraDocument::where('user_id', $user->id)->get()->keyBy('type');

        $checklist = collect(self::DOC_TYPES)->map(fn($type) => [
            'type'             => $type,
            'label'            => self::DOC_LABELS[$type],
            'uploaded'         => $docs->has($type),
            'status'           => $docs[$type]?->status ?? null,
            'rejection_reason' => $docs[$type]?->rejection_reason ?? null,
        ]);

        $allUploaded  = $checklist->every(fn($d) => $d['uploaded']);
        $anyRejected  = $checklist->some(fn($d) => $d['status'] === 'rejected');

        return response()->json([
            'account_status' => $user->status,
            'all_uploaded'   => $allUploaded,
            'any_rejected'   => $anyRejected,
            'documents'      => $checklist->values(),
            'mitra_detail'   => $user->mitraDetail,
        ]);
    }

    public function uploadDocument(Request $request): JsonResponse
    {
        $data = $request->validate([
            'type'  => ['required', 'in:ktp,sim,stnk,vehicle_photo'],
            'file'  => ['required', 'image', 'max:10240'],
        ]);

        $user = $request->user();
        if (!$user->isMitra()) {
            return response()->json(['message' => 'Hanya mitra yang bisa upload dokumen.'], 403);
        }

        $dir      = storage_path("app/public/mitra-docs/{$user->id}");
        if (!is_dir($dir)) mkdir($dir, 0755, true);

        $filename = $data['type'] . '_' . Str::random(10) . '.jpg';
        $fullPath = "{$dir}/{$filename}";
        $file     = $request->file('file');

        // Simpan dengan kompresi GD jika tersedia
        if (extension_loaded('gd')) {
            $src = $this->openImage($file->getRealPath(), $file->getMimeType());
            if ($src) {
                [$w, $h] = getimagesize($file->getRealPath());
                $ratio = min(1600 / $w, 1200 / $h, 1.0);
                $nw = (int) round($w * $ratio);
                $nh = (int) round($h * $ratio);
                $dst = imagecreatetruecolor($nw, $nh);
                imagecopyresampled($dst, $src, 0, 0, 0, 0, $nw, $nh, $w, $h);
                imagejpeg($dst, $fullPath, 85);
                imagedestroy($src); imagedestroy($dst);
            } else {
                copy($file->getRealPath(), $fullPath);
            }
        } else {
            $file->storeAs("mitra-docs/{$user->id}", $filename, 'public');
        }

        $storagePath = "mitra-docs/{$user->id}/{$filename}";

        // Upsert dokumen — ganti file lama jika sudah ada
        $doc = MitraDocument::updateOrCreate(
            ['user_id' => $user->id, 'type' => $data['type']],
            [
                'file_path'        => $storagePath,
                'status'           => 'pending',
                'rejection_reason' => null,
                'reviewed_by'      => null,
                'reviewed_at'      => null,
            ]
        );

        return response()->json([
            'message' => self::DOC_LABELS[$data['type']] . ' berhasil diupload.',
            'data'    => $doc,
        ], 201);
    }

    private function openImage(string $path, string $mime): mixed
    {
        return match (true) {
            str_contains($mime, 'jpeg'), str_contains($mime, 'jpg') => imagecreatefromjpeg($path),
            str_contains($mime, 'png')  => imagecreatefrompng($path),
            str_contains($mime, 'webp') => function_exists('imagecreatefromwebp') ? imagecreatefromwebp($path) : null,
            default => null,
        };
    }
}
