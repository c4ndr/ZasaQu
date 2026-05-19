<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\AdminSetting;
use App\Services\AuditLogService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

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

    private function validateByType(string $type, mixed $value): void
    {
        match ($type) {
            'integer' => throw_if(!is_numeric($value) || (int) $value < 0, \InvalidArgumentException::class, 'Nilai harus berupa angka bulat positif.'),
            'decimal' => throw_if(!is_numeric($value) || (float) $value < 0, \InvalidArgumentException::class, 'Nilai harus berupa angka positif.'),
            'boolean' => throw_if(!in_array($value, ['0', '1', 'true', 'false']), \InvalidArgumentException::class, 'Nilai harus true atau false.'),
            default   => null,
        };
    }
}
