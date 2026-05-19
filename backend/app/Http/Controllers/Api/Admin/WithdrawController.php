<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\WithdrawRequest;
use App\Services\AuditLogService;
use App\Services\PaymentService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class WithdrawController extends Controller
{
    public function __construct(
        private PaymentService $paymentService,
        private AuditLogService $auditLogService,
    ) {}

    public function index(Request $request): JsonResponse
    {
        $status = $request->query('status', 'pending');

        $requests = WithdrawRequest::with(['user.wallet'])
            ->when($status !== 'all', fn($q) => $q->where('status', $status))
            ->latest()
            ->paginate(20);

        return response()->json($requests);
    }

    public function process(Request $request, int $id): JsonResponse
    {
        $data = $request->validate([
            'status' => ['required', 'in:completed,rejected'],
            'notes'  => ['nullable', 'string', 'max:255'],
        ]);

        $withdraw = WithdrawRequest::where('id', $id)
            ->whereIn('status', ['pending', 'processing'])
            ->firstOrFail();

        $this->paymentService->processWithdraw($withdraw, $request->user(), $data['status'], $data['notes']);

        $this->auditLogService->log($request->user(), 'process_withdraw', $withdraw, null, $data);

        $label = $data['status'] === 'completed' ? 'selesai' : 'ditolak';

        return response()->json(['message' => "Withdraw berhasil di{$label}."]);
    }
}
