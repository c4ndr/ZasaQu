<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Promo;
use App\Services\AuditLogService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class VoucherController extends Controller
{
    public function __construct(private AuditLogService $auditLogService) {}

    public function index(): JsonResponse
    {
        $vouchers = Promo::whereNotNull('code')
            ->orderByDesc('id')
            ->get();

        return response()->json($vouchers);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'code'               => ['required', 'string', 'max:50', 'unique:promos,code'],
            'title'              => ['required', 'string', 'max:120'],
            'discount_type'      => ['required', 'in:flat,percent'],
            'discount_value'     => ['required', 'integer', 'min:1'],
            'max_discount'       => ['nullable', 'integer', 'min:0'],
            'min_order_amount'   => ['nullable', 'integer', 'min:0'],
            'max_uses'           => ['nullable', 'integer', 'min:1'],
            'expires_at'         => ['nullable', 'date', 'after:now'],
            'applicable_modules' => ['nullable', 'array'],
            'applicable_modules.*' => ['string', 'in:zasago,zasafood,zasamart,zasaride,zasaserv'],
            'is_active'          => ['boolean'],
        ]);

        $data['code'] = strtoupper($data['code']);
        $voucher = Promo::create($data);

        $this->auditLogService->log($request->user(), 'create_voucher', $voucher, [], $voucher->toArray());

        return response()->json(['message' => 'Voucher berhasil dibuat.', 'data' => $voucher], 201);
    }

    public function update(Request $request, int $id): JsonResponse
    {
        $voucher = Promo::whereNotNull('code')->findOrFail($id);

        $data = $request->validate([
            'code'               => ['sometimes', 'required', 'string', 'max:50', "unique:promos,code,{$id}"],
            'title'              => ['sometimes', 'required', 'string', 'max:120'],
            'discount_type'      => ['sometimes', 'required', 'in:flat,percent'],
            'discount_value'     => ['sometimes', 'required', 'integer', 'min:1'],
            'max_discount'       => ['nullable', 'integer', 'min:0'],
            'min_order_amount'   => ['nullable', 'integer', 'min:0'],
            'max_uses'           => ['nullable', 'integer', 'min:1'],
            'expires_at'         => ['nullable', 'date'],
            'applicable_modules' => ['nullable', 'array'],
            'applicable_modules.*' => ['string', 'in:zasago,zasafood,zasamart,zasaride,zasaserv'],
            'is_active'          => ['boolean'],
        ]);

        if (isset($data['code'])) {
            $data['code'] = strtoupper($data['code']);
        }

        $old = $voucher->toArray();
        $voucher->update($data);

        $this->auditLogService->log($request->user(), 'update_voucher', $voucher, $old, $voucher->fresh()->toArray());

        return response()->json(['message' => 'Voucher berhasil diperbarui.', 'data' => $voucher->fresh()]);
    }

    public function destroy(Request $request, int $id): JsonResponse
    {
        $voucher = Promo::whereNotNull('code')->findOrFail($id);

        $this->auditLogService->log($request->user(), 'delete_voucher', $voucher, $voucher->toArray(), []);
        $voucher->delete();

        return response()->json(['message' => 'Voucher berhasil dihapus.']);
    }
}
