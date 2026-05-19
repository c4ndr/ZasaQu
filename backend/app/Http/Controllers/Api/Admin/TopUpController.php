<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\TopUpRequest;
use App\Services\AuditLogService;
use App\Services\PaymentService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class TopUpController extends Controller
{
    public function __construct(
        private PaymentService $paymentService,
        private AuditLogService $auditLogService,
    ) {}

    public function index(Request $request): JsonResponse
    {
        $status = $request->query('status', 'pending');

        $requests = TopUpRequest::with(['user', 'bankAccount', 'virtualAccount', 'qrisTransaction'])
            ->when($status !== 'all', fn($q) => $q->where('status', $status))
            ->latest()
            ->paginate(20);

        return response()->json($requests);
    }

    public function confirm(Request $request, int $id): JsonResponse
    {
        $topUp = TopUpRequest::where('id', $id)
            ->where('status', 'pending')
            ->where('method', 'bank_manual')
            ->firstOrFail();

        $this->paymentService->confirmManualTopUp($topUp, $request->user());

        $this->auditLogService->log($request->user(), 'confirm_topup', $topUp, null, ['status' => 'confirmed']);

        return response()->json(['message' => 'Top up berhasil dikonfirmasi. Saldo user sudah ditambahkan.']);
    }

    public function reject(Request $request, int $id): JsonResponse
    {
        $data  = $request->validate(['notes' => ['required', 'string', 'max:255']]);
        $topUp = TopUpRequest::where('id', $id)
            ->where('status', 'pending')
            ->where('method', 'bank_manual')
            ->firstOrFail();

        $this->paymentService->rejectManualTopUp($topUp, $request->user(), $data['notes']);

        $this->auditLogService->log($request->user(), 'reject_topup', $topUp, null, ['status' => 'rejected', 'notes' => $data['notes']]);

        return response()->json(['message' => 'Top up berhasil ditolak.']);
    }
}
