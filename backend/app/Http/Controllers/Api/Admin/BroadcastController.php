<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Services\NotificationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class BroadcastController extends Controller
{
    public function __construct(private NotificationService $notifService) {}

    public function send(Request $request): JsonResponse
    {
        $data = $request->validate([
            'title'   => ['required', 'string', 'max:100'],
            'body'    => ['required', 'string', 'max:500'],
            'target'  => ['required', 'in:all,customer,mitra,merchant,seller,home_provider,serv_provider'],
        ]);

        $query = User::query();

        if ($data['target'] !== 'all') {
            if ($data['target'] === 'mitra') {
                $query->where('role', 'like', 'mitra_%');
            } else {
                $query->where('role', $data['target']);
            }
        }

        $users = $query->get();
        $count = 0;

        foreach ($users as $user) {
            $this->notifService->send($user, 'broadcast', $data['title'], $data['body']);
            $count++;
        }

        return response()->json([
            'message' => "Notifikasi berhasil dikirim ke {$count} pengguna.",
            'count'   => $count,
        ]);
    }
}
