<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AuditLogController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $logs = AuditLog::with('user')
            ->when($request->action, fn($q) => $q->where('action', $request->action))
            ->latest()
            ->paginate(30);

        return response()->json($logs);
    }
}
