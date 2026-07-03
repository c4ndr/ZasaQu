<?php

namespace App\Http\Controllers\Api;

use App\Events\ChatInboxNotification;
use App\Events\NewChatMessage;
use App\Http\Controllers\Controller;
use App\Models\ChatMessage;
use App\Models\ChatRoom;
use App\Models\FoodOrder;
use App\Models\HomeOrder;
use App\Models\MartOrder;
use App\Models\MartSeller;
use App\Models\Order;
use App\Models\RideOrder;
use App\Models\ServProvider;
use App\Models\User;
use App\Services\NotificationService;
use App\Services\PhoneDetectionService;
use App\Services\ViolationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

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
            'zasaride'  => RideOrder::with(['customer', 'mitra'])->findOrFail($orderId),
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
        $type = $request->get('type', 'zasago');
        $user = $request->user();

        // ── Consultation: customer → serv_provider (pre-order) ───────────────
        if ($type === 'zasaserv_consult') {
            $provider = ServProvider::with('user')->findOrFail($orderId);

            $room = DB::transaction(fn() => ChatRoom::firstOrCreate([
                'order_type'  => 'zasaserv_consult',
                'provider_id' => $provider->id,
                'customer_id' => $user->id,
            ]));

            if ($room->wasRecentlyCreated && $provider->user) {
                $this->notifService->send(
                    $provider->user, 'serv_consultation',
                    'Pesan Konsultasi Baru',
                    "{$user->name} ingin berkonsultasi tentang layanan Anda.",
                    ['room_id' => $room->id, 'type' => 'zasaserv_consult']
                );
            }

            return response()->json([
                'room'           => $room,
                'messages'       => $room->messages()->with('sender:id,name,role')->get(),
                'templates'      => self::TEMPLATES,
                'room_suspended' => $room->is_suspended,
            ]);
        }

        // ── Mart consult: customer → seller (pre-order, no order_id) ─────────
        if ($type === 'mart_consult') {
            $seller = MartSeller::with('user')->findOrFail($orderId);

            $room = DB::transaction(fn() => ChatRoom::firstOrCreate([
                'order_type'  => 'mart_consult',
                'merchant_id' => $seller->id,
                'customer_id' => $user->id,
            ]));

            if ($room->wasRecentlyCreated && $seller->user) {
                $this->notifService->send(
                    $seller->user, 'mart_chat',
                    '💬 Pesan dari Pembeli',
                    "{$user->name} ingin bertanya tentang produk Anda.",
                    ['room_id' => $room->id, 'type' => 'mart_consult']
                );
            }

            return response()->json([
                'room'           => $room->loadCount('messages'),
                'messages'       => $room->messages()->with('sender:id,name,role')->get(),
                'templates'      => self::TEMPLATES,
                'room_suspended' => $room->is_suspended,
                'seller'         => ['id' => $seller->id, 'name' => $seller->name, 'logo_path' => $seller->logo_path],
            ]);
        }

        // ── Seller accesses mart consult room by roomId ───────────────────────
        if ($type === 'mart_seller_consult') {
            $room   = ChatRoom::where('id', $orderId)->where('order_type', 'mart_consult')->firstOrFail();
            $seller = MartSeller::where('user_id', $user->id)->first();

            if (!$seller || $room->merchant_id !== $seller->id) {
                return response()->json(['message' => 'Akses ditolak.'], 403);
            }

            $customer = User::find($room->customer_id);
            return response()->json([
                'room'           => $room,
                'messages'       => $room->messages()->with('sender:id,name,role')->get(),
                'templates'      => self::TEMPLATES,
                'room_suspended' => $room->is_suspended,
                'customer'       => $customer ? ['id' => $customer->id, 'name' => $customer->name] : null,
            ]);
        }

        // ── Provider accesses consultation room by roomId ────────────────────
        if ($type === 'zasaserv_provider_consult') {
            $room     = ChatRoom::where('id', $orderId)->where('order_type', 'zasaserv_consult')->firstOrFail();
            $provider = ServProvider::where('user_id', $user->id)->first();

            if (!$provider || $room->provider_id !== $provider->id) {
                return response()->json(['message' => 'Akses ditolak.'], 403);
            }

            return response()->json([
                'room'           => $room,
                'messages'       => $room->messages()->with('sender:id,name,role')->get(),
                'templates'      => self::TEMPLATES,
                'room_suspended' => $room->is_suspended,
            ]);
        }

        // ── Normal order-based chat ──────────────────────────────────────────
        $order = $this->resolveOrder($orderId, $type);

        if ($order->customer_id !== $user->id && $this->getProviderUserId($order) !== $user->id) {
            return response()->json(['message' => 'Akses ditolak.'], 403);
        }

        $room = DB::transaction(function () use ($orderId, $type) {
            return ChatRoom::firstOrCreate(['order_id' => $orderId, 'order_type' => $type]);
        });

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

        // ── Consultation room ────────────────────────────────────────────────
        if ($room->order_type === 'zasaserv_consult') {
            $providerUserId = ServProvider::find($room->provider_id)?->user_id;

            if ($room->customer_id !== $user->id && $providerUserId !== $user->id) {
                return response()->json(['message' => 'Akses ditolak.'], 403);
            }

            if ($room->isSuspended()) {
                return response()->json(['message' => 'Chat disuspend karena pelanggaran berulang.', 'room_suspended' => true], 403);
            }

            $data    = $request->validate(['content' => ['nullable', 'string', 'max:1000'], 'type' => ['in:text,template,image']]);
            $imagePath = $this->storeImage($request);
            $content   = $data['content'] ?? '';
            $msgType   = $imagePath ? 'image' : ($data['type'] ?? 'text');

            if (!$imagePath && !trim($content)) {
                return response()->json(['message' => 'Pesan tidak boleh kosong.'], 422);
            }

            $isBlocked = false;
            if ($msgType !== 'template' && $msgType !== 'image' && $this->phoneDetector->containsPhone($content)) {
                $isBlocked = true;
                $this->violationService->record($user);
                $room->increment('violation_count');
                $room->refresh();
                if ($room->violation_count >= 5 && !$room->is_suspended) {
                    $room->update(['is_suspended' => true, 'suspended_at' => now()]);
                }
            }

            $message = ChatMessage::create([
                'room_id'    => $room->id,
                'sender_id'  => $user->id,
                'content'    => $content,
                'image_path' => $imagePath,
                'type'       => $msgType,
                'is_blocked' => $isBlocked,
            ]);
            $message->load('sender:id,name,role');
            broadcast(new NewChatMessage($message));

            if (!$isBlocked) {
                $recipientId = ($user->id === $room->customer_id) ? $providerUserId : $room->customer_id;
                if ($recipientId) {
                    broadcast(new ChatInboxNotification($message, $recipientId, $room));
                    $recipient = User::find($recipientId);
                    if ($recipient) {
                        $this->notifService->send(
                            $recipient, 'serv_consultation_reply', 'Pesan Konsultasi',
                            "{$user->name}: {$content}",
                            ['room_id' => $room->id, 'type' => 'zasaserv_consult']
                        );
                    }
                }
            }

            $response = ['message' => 'Pesan terkirim.', 'data' => $message];
            if ($isBlocked) {
                $response['message'] = $room->fresh()->is_suspended ? 'Chat disuspend.' : 'Pesan diblokir.';
                $response['room_suspended'] = $room->fresh()->is_suspended;
            }
            return response()->json($response, $isBlocked ? 422 : 201);
        }

        // ── Mart consult room (pre-order chat) ───────────────────────────────
        if ($room->order_type === 'mart_consult') {
            $sellerUserId = MartSeller::find($room->merchant_id)?->user_id;

            if ($room->customer_id !== $user->id && $sellerUserId !== $user->id) {
                return response()->json(['message' => 'Akses ditolak.'], 403);
            }

            if ($room->isSuspended()) {
                return response()->json(['message' => 'Chat disuspend karena pelanggaran berulang.', 'room_suspended' => true], 403);
            }

            $data    = $request->validate(['content' => ['nullable', 'string', 'max:1000'], 'type' => ['in:text,template,image']]);
            $imagePath = $this->storeImage($request);
            $content   = $data['content'] ?? '';
            $msgType   = $imagePath ? 'image' : ($data['type'] ?? 'text');

            if (!$imagePath && !trim($content)) {
                return response()->json(['message' => 'Pesan tidak boleh kosong.'], 422);
            }

            $isBlocked = false;
            if ($msgType !== 'template' && $msgType !== 'image' && $this->phoneDetector->containsPhone($content)) {
                $isBlocked = true;
                $this->violationService->record($user);
                $room->increment('violation_count');
                $room->refresh();
                if ($room->violation_count >= 5 && !$room->is_suspended) {
                    $room->update(['is_suspended' => true, 'suspended_at' => now()]);
                }
            }

            $message = ChatMessage::create([
                'room_id'    => $room->id,
                'sender_id'  => $user->id,
                'content'    => $content,
                'image_path' => $imagePath,
                'type'       => $msgType,
                'is_blocked' => $isBlocked,
            ]);
            $message->load('sender:id,name,role');
            broadcast(new NewChatMessage($message));

            if (!$isBlocked) {
                $recipientId = ($user->id === $room->customer_id) ? $sellerUserId : $room->customer_id;
                if ($recipientId) {
                    broadcast(new ChatInboxNotification($message, $recipientId, $room));
                    $recipient = User::find($recipientId);
                    if ($recipient) {
                        $this->notifService->newChatMessage($recipient, $user->name, 'chat', $room->id, 'mart_consult');
                    }
                }
            }

            $response = ['message' => 'Pesan terkirim.', 'data' => $message];
            if ($isBlocked) {
                $response['message'] = $room->fresh()->is_suspended ? 'Chat disuspend.' : 'Pesan diblokir.';
                $response['room_suspended'] = $room->fresh()->is_suspended;
            }
            return response()->json($response, $isBlocked ? 422 : 201);
        }

        // ── Normal order chat ────────────────────────────────────────────────
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
            'content' => ['nullable', 'string', 'max:1000'],
            'type'    => ['in:text,template,image'],
        ]);

        $imagePath     = $this->storeImage($request);
        $content       = $data['content'] ?? '';
        $type          = $imagePath ? 'image' : ($data['type'] ?? 'text');
        $isBlocked     = false;
        $blockedReason = null;
        $violation     = null;

        if (!$imagePath && !trim($content)) {
            return response()->json(['message' => 'Pesan tidak boleh kosong.'], 422);
        }

        if ($type !== 'template' && $type !== 'image' && $this->phoneDetector->containsPhone($content)) {
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
            'image_path'     => $imagePath,
            'type'           => $type,
            'is_blocked'     => $isBlocked,
            'blocked_reason' => $blockedReason,
        ]);

        $message->load('sender:id,name,role');

        broadcast(new NewChatMessage($message));

        if (!$isBlocked) {
            if ($user->id === $order->customer_id) {
                $recipientId = $this->getProviderUserId($order);
                $recipient   = $recipientId ? User::find($recipientId) : null;
            } else {
                $recipient = $order->customer;
            }
            if ($recipient) {
                broadcast(new ChatInboxNotification($message, $recipient->id, $room));
                $this->notifService->newChatMessage($recipient, $user->name, $order->order_number, $order->id, $room->order_type ?? 'zasago');
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

    /** Seller: daftar semua room chat dari pembeli (mart_consult inbox) */
    public function sellerInbox(Request $request): JsonResponse
    {
        $seller = MartSeller::where('user_id', $request->user()->id)->firstOrFail();

        $rooms = ChatRoom::where('order_type', 'mart_consult')
            ->where('merchant_id', $seller->id)
            ->with(['messages' => fn($q) => $q->latest()->limit(1)])
            ->withCount(['messages as unread_count' => fn($q) => $q->where('sender_id', '!=', $request->user()->id)])
            ->latest('updated_at')
            ->get()
            ->map(function ($room) {
                $customer = User::select('id', 'name', 'photo_url', 'avatar_preset')->find($room->customer_id);
                return [
                    'room_id'      => $room->id,
                    'customer'     => $customer,
                    'last_message' => $room->messages->first(),
                    'unread_count' => $room->unread_count,
                    'updated_at'   => $room->updated_at,
                ];
            });

        return response()->json(['data' => $rooms]);
    }

    /** Simpan gambar upload ke storage dan kembalikan path-nya */
    private function storeImage(Request $request): ?string
    {
        if (!$request->hasFile('image')) return null;
        $request->validate(['image' => ['image', 'max:5120']]);
        return $request->file('image')->store('chat-images', 'public');
    }
}
