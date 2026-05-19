<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Services\AuditLogService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class UserController extends Controller
{
    public function __construct(private AuditLogService $auditLogService) {}

    public function index(Request $request): JsonResponse
    {
        $users = User::with(['wallet', 'mitraDetail'])
            ->where('role', '!=', 'admin')
            ->when($request->role, fn($q) => $q->where('role', $request->role))
            ->when($request->status, fn($q) => $q->where('status', $request->status))
            ->when($request->search, fn($q) => $q->where(fn($q2) =>
                $q2->where('name', 'like', "%{$request->search}%")
                   ->orWhere('email', 'like', "%{$request->search}%")))
            ->latest()
            ->paginate(20);

        return response()->json($users);
    }

    public function show(int $id): JsonResponse
    {
        $user = User::with(['wallet', 'mitraDetail'])->findOrFail($id);

        $orders = \App\Models\Order::where(function($q) use ($user) {
                $q->where('customer_id', $user->id)->orWhere('mitra_id', $user->id);
            })
            ->latest()->limit(10)->get(['id','order_number','status','shipping_fee','created_at','type']);

        $transactions = \App\Models\WalletTransaction::where('wallet_id', $user->wallet?->id)
            ->latest()->limit(10)->get(['type','amount','created_at','description']);

        $topups = \App\Models\TopUpRequest::where('user_id', $user->id)
            ->latest()->limit(5)->get(['method','amount','status','created_at']);

        $withdraws = \App\Models\WithdrawRequest::where('user_id', $user->id)
            ->latest()->limit(5)->get(['destination_type','amount','status','created_at']);

        $stats = [
            'total_orders'  => \App\Models\Order::where('customer_id', $user->id)->count(),
            'total_income'  => \App\Models\Order::where('mitra_id', $user->id)->where('status','completed')->sum('mitra_income'),
            'total_spend'   => \App\Models\WalletTransaction::where('wallet_id', $user->wallet?->id)->where('type','order_payment')->sum('amount'),
            'total_topup'   => \App\Models\TopUpRequest::where('user_id', $user->id)->where('status','confirmed')->sum('amount'),
            'total_withdraw'=> \App\Models\WithdrawRequest::where('user_id', $user->id)->where('status','completed')->sum('amount'),
        ];

        return response()->json(array_merge($user->toArray(), [
            'recent_orders'    => $orders,
            'recent_transactions' => $transactions,
            'recent_topups'    => $topups,
            'recent_withdraws' => $withdraws,
            'stats'            => $stats,
        ]));
    }

    public function addBalance(Request $request, int $id): JsonResponse
    {
        $data = $request->validate([
            'amount' => ['required', 'numeric', 'min:1000'],
            'note'   => ['nullable', 'string', 'max:255'],
        ]);
        $user = User::where('role', '!=', 'admin')->findOrFail($id);
        app(\App\Services\WalletService::class)->credit(
            $user, (float) $data['amount'], 'topup',
            $data['note'] ?? 'Penambahan saldo oleh admin', null
        );
        $this->auditLogService->log($request->user(), 'add_balance', $user, [], $data);
        return response()->json(['message' => 'Saldo berhasil ditambahkan.']);
    }

    public function updateStatus(Request $request, int $id): JsonResponse
    {
        $data = $request->validate([
            'status' => ['required', 'in:active,suspended,banned'],
            'notes'  => ['nullable', 'string', 'max:255'],
        ]);

        $user = User::where('role', '!=', 'admin')->findOrFail($id);
        $old  = $user->status;

        $user->update(['status' => $data['status']]);

        $actionMap = ['active' => 'activate_user', 'suspended' => 'suspend_user', 'banned' => 'ban_user'];
        $this->auditLogService->log(
            $request->user(), $actionMap[$data['status']], $user,
            ['status' => $old], ['status' => $data['status'], 'notes' => $data['notes'] ?? null]
        );

        $labelMap = ['active' => 'diaktifkan', 'suspended' => 'disuspend', 'banned' => 'dibanned'];

        return response()->json(['message' => "User berhasil {$labelMap[$data['status']]}."]);
    }
}
