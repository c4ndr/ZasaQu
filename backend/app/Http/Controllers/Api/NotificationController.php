<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Notification;
use App\Services\NotificationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class NotificationController extends Controller
{
    public function __construct(private NotificationService $notifService) {}

    public function index(Request $request): JsonResponse
    {
        $notifs = Notification::where('user_id', $request->user()->id)
            ->latest()
            ->paginate(30);

        return response()->json([
            'data'         => $notifs,
            'unread_count' => $this->notifService->unreadCount($request->user()),
        ]);
    }

    public function markRead(Request $request): JsonResponse
    {
        $data = $request->validate([
            'id' => ['nullable', 'integer', 'exists:notifications,id'],
        ]);

        $this->notifService->markRead($request->user(), $data['id'] ?? null);

        return response()->json(['message' => 'Notifikasi ditandai sudah dibaca.']);
    }

    public function unreadCount(Request $request): JsonResponse
    {
        return response()->json([
            'unread_count' => $this->notifService->unreadCount($request->user()),
        ]);
    }
}
