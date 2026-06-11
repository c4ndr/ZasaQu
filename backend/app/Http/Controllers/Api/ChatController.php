<?php

namespace App\Http\Controllers\Api;

use App\Events\NewChatMessage;
use App\Http\Controllers\Controller;
use App\Models\ChatMessage;
use App\Models\ChatRoom;
use App\Models\FoodOrder;
use App\Models\HomeOrder;
use App\Models\MartOrder;
use App\Models\Order;
use App\Services\NotificationService;
use App\Services\PhoneDetectionService;
use App\Services\ViolationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ChatController extends Controller
{
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
        private NotificationService   $notifService,
    ) {}

    /** Resolve order lintas modul berdasarkan type */
    private function resolveOrder(int $orderId, string $type): \Illuminate\Database\Eloquent\Model
    {
        return match($type) {
            'zasafood'  => FoodOrder::with(['customer', 'mitra'])->findOrFail($orderId),
            'zasamart'  => MartOrder::with(['customer', 'mitra'])->findOrFail($orderId),
            'zasahome'  => HomeOrder::with(['customer', 'provider.user'])->findOrFail($orderId),
            default     => Order::with(['customer', 'mitra'])->findOrFail($orderId),
        };
    }

    /** Ambil user ID pihak provider/mitra dari order (berbeda antara HomeOrder dan lainnya) */
    private function getProviderUserId(\Illuminate\Database\Eloquent\Model $order): ?int
    {
        if ($order instanceof HomeOrder) {
            return $order->provider?->user_id;
        }
        return $order->mitra_id ?? null;
    }

    public function getOrCreateRoom(int $orderId, Request $request): JsonResponse
    {
        $type  = $request->get('type', 'zasago');
        $order = $this->resolveOrder($orderId, $type);
        $user  = $request->user();

        if ($order->customer_id !== $user->id && $this->getProviderUserId($order) !== $user->id) {
            return response()->json(['message' => 'Akses ditolak.'], 403);
        }

        $room = ChatRoom::firstOrCreate(['order_id' => $orderId, 'order_type' => $type]);

        return response()->json([
            'room'           => $room,
            'messages'       => $room->messages()->with('sender:id,name,role')->get(),
            'templates'      => self::TEMPLATES,
            'room_suspended' => $room->is_suspended,
        ]);
    }

    public function sendMessage(Request $request, int $roomId): JsonResponse
    {
        $room  = ChatRoom::findOrFail($roomId);
        $user  = $request->user();
        $order = $this->resolveOrder($room->order_id, $room->order_type ?? 'zasago');

        if ($order->customer_id !== $user->id && $this->getProviderUserId($order) !== $user->id) {
            return response()->json(['message' => 'Akses ditolak.'], 403);
        }

        if ($room->isSuspended()) {
            return response()->json([
                'message'        => 'Chat room ini disuspend karena pelanggaran berulang. Hubungi admin.',
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

        if ($type !== 'template' && $this->phoneDetector->containsPhone($content)) {
            $isBlocked     = true;
            $blockedReason = $this->phoneDetector->getReason($content);
            $violation     = $this->violationService->record($user);

            $room->increment('violation_count');
            $room->refresh();

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

        broadcast(new NewChatMessage($message));

        if (!$isBlocked) {
            $recipient = ($user->id === $order->customer_id) ? $order->mitra : $order->customer;
            if ($recipient) {
                $this->notifService->newChatMessage($recipient, $user->name, $order->order_number, $order->id);
            }
        }

        $response = ['message' => 'Pesan terkirim.', 'data' => $message];

        if ($isBlocked) {
            $isSuspendedNow        = $room->fresh()->is_suspended;
            $response['message']   = $isSuspendedNow ? 'Chat disuspend karena pelanggaran berulang.' : 'Pesan diblokir.';
            $response['warning']   = $violation['message'];
            $response['violation'] = $violation;
            $response['room_suspended'] = $isSuspendedNow;
        }

        return response()->json($response, $isBlocked ? 422 : 201);
    }

    public function templates(): JsonResponse
    {
        return response()->json(self::TEMPLATES);
    }
}
