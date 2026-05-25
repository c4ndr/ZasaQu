<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\AdminSetting;
use App\Services\AuditLogService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class SettingController extends Controller
{
    public function __construct(private AuditLogService $auditLogService) {}

    public function index(): JsonResponse
    {
        return response()->json(AdminSetting::orderBy('key')->get());
    }

    public function update(Request $request, string $key): JsonResponse
    {
        $setting = AdminSetting::where('key', $key)->firstOrFail();
        $data    = $request->validate(['value' => ['required']]);

        $this->validateByType($setting->type, $data['value']);

        $old = $setting->value;
        $setting->update(['value' => $data['value'], 'updated_by' => $request->user()->id]);

        $this->auditLogService->log(
            $request->user(), 'update_setting', $setting,
            ['value' => $old], ['value' => $data['value']]
        );

        return response()->json(['message' => 'Pengaturan berhasil diperbarui.', 'data' => $setting->fresh()]);
    }

    public function uploadLogo(Request $request): JsonResponse
    {
        $request->validate(['logo' => ['required', 'image', 'max:2048']]);

        $setting = AdminSetting::where('key', 'app_logo_path')->firstOrFail();

        // Hapus logo lama jika ada
        if ($setting->value && Storage::disk('public')->exists($setting->value)) {
            Storage::disk('public')->delete($setting->value);
        }

        $path = $request->file('logo')->store('logos', 'public');

        $old = $setting->value;
        $setting->update(['value' => $path, 'updated_by' => $request->user()->id]);

        $this->auditLogService->log(
            $request->user(), 'update_setting', $setting,
            ['value' => $old], ['value' => $path]
        );

        return response()->json([
            'message' => 'Logo berhasil diperbarui.',
            'data'    => $setting->fresh(),
            'url'     => asset('storage/' . $path),
        ]);
    }

    public function uploadLogoBase64(Request $request): JsonResponse
    {
        $request->validate([
            'data' => ['required', 'string'],
            'mime' => ['required', 'in:image/jpeg,image/jpg,image/png,image/webp'],
        ]);

        $setting = AdminSetting::where('key', 'app_logo_path')->firstOrFail();

        if ($setting->value && Storage::disk('public')->exists($setting->value)) {
            Storage::disk('public')->delete($setting->value);
        }

        $b64       = preg_replace('/^data:image\/\w+;base64,/', '', $request->input('data'));
        $imageData = base64_decode($b64);
        $ext       = $request->input('mime') === 'image/png' ? 'png' : 'jpg';
        $filename  = 'logos/' . Str::random(40) . '.' . $ext;

        Storage::disk('public')->put($filename, $imageData);

        $old = $setting->value;
        $setting->update(['value' => $filename, 'updated_by' => $request->user()->id]);

        $this->auditLogService->log(
            $request->user(), 'update_setting', $setting,
            ['value' => $old], ['value' => $filename]
        );

        return response()->json([
            'message' => 'Logo berhasil diperbarui.',
            'data'    => $setting->fresh(),
            'url'     => asset('storage/' . $filename),
        ]);
    }

    private function validateByType(string $type, mixed $value): void
    {
        match ($type) {
            'integer' => throw_if(!is_numeric($value) || (int) $value < 0, \InvalidArgumentException::class, 'Nilai harus berupa angka bulat positif.'),
            'decimal' => throw_if(!is_numeric($value) || (float) $value < 0, \InvalidArgumentException::class, 'Nilai harus berupa angka positif.'),
            'boolean' => throw_if(!in_array($value, ['0', '1', 'true', 'false', true, false], true), \InvalidArgumentException::class, 'Nilai harus true atau false.'),
            default   => null,
        };
    }
}
