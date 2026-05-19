<?php

namespace App\Http\Controllers\Api;

use App\Events\NewChatMessage;
use App\Http\Controllers\Controller;
use App\Models\ChatMessage;
use App\Models\ChatRoom;
use App\Models\Order;
use App\Services\PhoneDetectionService;
use App\Services\ViolationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ChatController extends Controller
{
    // Template pesan siap pakai
    const TEMPLATES = [
        ['id' => 1, 'text' => 'Saya sudah menuju lokasi pickup.'],
        ['id' => 2, 'text' => 'Barang sudah diambil, sedang dalam perjalanan.'],
        ['id' => 3, 'text' => 'Saya sudah tiba di depan lokasi.'],
        ['id' => 4, 'text' => 'Mohon siapkan barang untuk diambil.'],
        ['id' => 5, 'text' => 'Apakah ada perubahan alamat atau catatan tambahan?'],
        ['id' => 6, 'text' => 'Barang sudah sampai, mohon konfirmasi penerimaan.'],
        ['id' => 7, 'text' => 'Terima kasih sudah menggunakan ZasaQu!'],
        ['id' => 8, 'text' => 'Ada kendala di jalan, estimasi terlambat beberapa menit.'],
    ];

    public function __construct(
        private PhoneDetectionService $phoneDetector,
        private ViolationService      $violationService,
    ) {}

    public function getOrCreateRoom(int $orderId, Request $request): JsonResponse
    {
        $order = Order::findOrFail($orderId);
        $user  = $request->user();

        if ($order->customer_id !== $user->id && $order->mitra_id !== $user->id) {
            return response()->json(['message' => 'Akses ditolak.'], 403);
        }

        $room = ChatRoom::firstOrCreate(['order_id' => $orderId]);

        return response()->json([
            'room'           => $room,
            'messages'       => $room->messages()->with('sender:id,name,role')->get(),
            'templates'      => self::TEMPLATES,
            'room_suspended' => $room->is_suspended,
        ]);
    }

    public function sendMessage(Request $request, int $roomId): JsonResponse
    {
        $room = ChatRoom::findOrFail($roomId);
        $user = $request->user();
        $order = $room->order;

        if ($order->customer_id !== $user->id && $order->mitra_id !== $user->id) {
            return response()->json(['message' => 'Akses ditolak.'], 403);
        }

        // Cek apakah chat room sudah disuspend
        if ($room->isSuspended()) {
            return response()->json([
                'message' => 'Chat room ini disuspend karena pelanggaran berulang. Hubungi admin.',
                'room_suspended' => true,
            ], 403);
        }

        $data = $request->validate([
            'content' => ['required', 'string', 'max:1000'],
            'type'    => ['in:text,template'],
        ]);

        $content       = $data['content'];
        $type          = $data['type'] ?? 'text';
        $isBlocked     = false;
        $blockedReason = null;
        $violation     = null;

        // Deteksi nomor HP / link bypass
        if ($type !== 'template' && $this->phoneDetector->containsPhone($content)) {
            $isBlocked     = true;
            $blockedReason = $this->phoneDetector->getReason($content);
            $violation     = $this->violationService->record($user);

            // Eskalasi pelanggaran di room ini
            $room->increment('violation_count');
            $room->refresh();

            // Suspend room setelah 5 pelanggaran kumulatif
            if ($room->violation_count >= 5 && !$room->is_suspended) {
                $room->update(['is_suspended' => true, 'suspended_at' => now()]);
            }
        }

        $message = ChatMessage::create([
            'room_id'        => $room->id,
            'sender_id'      => $user->id,
            'content'        => $content,
            'type'           => $type,
            'is_blocked'     => $isBlocked,
            'blocked_reason' => $blockedReason,
        ]);

        $message->load('sender:id,name,role');

        // Broadcast ke channel chat room
        broadcast(new NewChatMessage($message));

        $response = ['message' => 'Pesan terkirim.', 'data' => $message];

        if ($isBlocked) {
            $isSuspendedNow = $room->fresh()->is_suspended;
            $response['message']      = $isSuspendedNow ? 'Chat disuspend karena pelanggaran berulang.' : 'Pesan diblokir.';
            $response['warning']      = $violation['message'];
            $response['violation']    = $violation;
            $response['room_suspended'] = $isSuspendedNow;
        }

        return response()->json($response, $isBlocked ? 422 : 201);
    }

    public function templates(): JsonResponse
    {
        return response()->json(self::TEMPLATES);
    }
}
