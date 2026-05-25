<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Promo;
use App\Services\AuditLogService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class PromoController extends Controller
{
    public function __construct(private AuditLogService $auditLogService) {}

    public function index(): JsonResponse
    {
        return response()->json(Promo::orderBy('sort_order')->orderBy('id')->get());
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'title'       => ['required', 'string', 'max:120'],
            'subtitle'    => ['nullable', 'string', 'max:200'],
            'description' => ['nullable', 'string'],
            'gradient'    => ['nullable', 'string', 'max:200'],
            'emoji'       => ['nullable', 'string', 'max:8'],
            'link_url'    => ['nullable', 'url', 'max:500'],
            'sort_order'  => ['nullable', 'integer', 'min:0'],
            'is_active'   => ['nullable', 'boolean'],
            'image'       => ['nullable', 'image', 'max:3072'],
        ]);

        if ($request->hasFile('image')) {
            $data['image_path'] = $request->file('image')->store('promos', 'public');
        }

        $promo = Promo::create($data);

        $this->auditLogService->log($request->user(), 'create_promo', $promo, [], $promo->toArray());

        return response()->json(['message' => 'Promo berhasil dibuat.', 'data' => $promo], 201);
    }

    public function update(Request $request, int $id): JsonResponse
    {
        $promo = Promo::findOrFail($id);

        $data = $request->validate([
            'title'       => ['sometimes', 'required', 'string', 'max:120'],
            'subtitle'    => ['nullable', 'string', 'max:200'],
            'description' => ['nullable', 'string'],
            'gradient'    => ['nullable', 'string', 'max:200'],
            'emoji'       => ['nullable', 'string', 'max:8'],
            'link_url'    => ['nullable', 'url', 'max:500'],
            'sort_order'  => ['nullable', 'integer', 'min:0'],
            'is_active'   => ['nullable', 'boolean'],
            'image'       => ['nullable', 'image', 'max:3072'],
        ]);

        if ($request->hasFile('image')) {
            if ($promo->image_path) {
                Storage::disk('public')->delete($promo->image_path);
            }
            $data['image_path'] = $request->file('image')->store('promos', 'public');
        }

        $old = $promo->toArray();
        $promo->update($data);

        $this->auditLogService->log($request->user(), 'update_promo', $promo, $old, $promo->fresh()->toArray());

        return response()->json(['message' => 'Promo berhasil diperbarui.', 'data' => $promo->fresh()]);
    }

    public function destroy(Request $request, int $id): JsonResponse
    {
        $promo = Promo::findOrFail($id);

        if ($promo->image_path) {
            Storage::disk('public')->delete($promo->image_path);
        }

        $this->auditLogService->log($request->user(), 'delete_promo', $promo, $promo->toArray(), []);
        $promo->delete();

        return response()->json(['message' => 'Promo berhasil dihapus.']);
    }
}
