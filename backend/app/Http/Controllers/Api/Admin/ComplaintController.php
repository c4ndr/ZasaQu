<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\OrderComplaint;
use App\Services\AuditLogService;
use App\Services\NotificationService;
use App\Services\WalletService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class ComplaintController extends Controller
{
    public function __construct(
        private AuditLogService     $auditLogService,
        private NotificationService $notifService,
        private WalletService       $walletService,
    ) {}

    public function index(Request $request): JsonResponse
    {
        $status = $request->query('status', 'pending');

        $complaints = OrderComplaint::with(['customer:id,name,phone', 'resolver:id,name'])
            ->when($status !== 'all', fn($q) => $q->where('status', $status))
            ->latest()
            ->paginate(20);

        return response()->json($complaints);
    }

    public function show(int $id): JsonResponse
    {
        $complaint = OrderComplaint::with(['customer:id,name,phone', 'resolver:id,name'])->findOrFail($id);

        return response()->json([
            'complaint' => $complaint,
            'order'     => $complaint->order(),
        ]);
    }

    public function resolve(Request $request, int $id): JsonResponse
    {
        $data = $request->validate([
            'resolution_note' => ['required', 'string', 'max:500'],
            'refund_amount'   => ['nullable', 'numeric', 'min:0'],
        ]);

        $complaint = OrderComplaint::whereIn('status', ['pending', 'reviewing'])->findOrFail($id);
        $admin     = $request->user();

        DB::transaction(function () use ($complaint, $data, $admin) {
            if (!empty($data['refund_amount']) && $data['refund_amount'] > 0) {
                $this->walletService->credit(
                    $complaint->customer,
                    (float) $data['refund_amount'],
                    'refund',
                    "Refund komplain #{$complaint->id} ({$complaint->order_type})",
                    $complaint,
                    $complaint->order_type
                );
            }

            $complaint->update([
                'status'           => 'resolved',
                'resolution_note'  => $data['resolution_note'],
                'refund_amount'    => $data['refund_amount'] ?? null,
                'resolved_by'      => $admin->id,
                'resolved_at'      => now(),
            ]);
        });

        $this->auditLogService->log($admin, 'resolve_complaint', $complaint, [], $data);

        try {
            $this->notifService->complaintResolved(
                $complaint->customer,
                $complaint->id,
                (float) ($data['refund_amount'] ?? 0),
                $data['resolution_note']
            );
        } catch (\Throwable) {}

        return response()->json(['message' => 'Komplain berhasil diselesaikan.', 'data' => $complaint->fresh()]);
    }

    public function reject(Request $request, int $id): JsonResponse
    {
        $data = $request->validate(['resolution_note' => ['required', 'string', 'max:500']]);

        $complaint = OrderComplaint::whereIn('status', ['pending', 'reviewing'])->findOrFail($id);
        $admin     = $request->user();

        $complaint->update([
            'status'          => 'rejected',
            'resolution_note' => $data['resolution_note'],
            'resolved_by'     => $admin->id,
            'resolved_at'     => now(),
        ]);

        $this->auditLogService->log($admin, 'reject_complaint', $complaint, [], $data);

        try {
            $this->notifService->complaintResolved($complaint->customer, $complaint->id, 0, $data['resolution_note']);
        } catch (\Throwable) {}

        return response()->json(['message' => 'Komplain ditolak.', 'data' => $complaint->fresh()]);
    }
}
