<?php

namespace App\Http\Controllers\Api;

use App\Events\CallSignal;
use App\Http\Controllers\Controller;
use App\Models\ChatRoom;
use App\Models\FoodOrder;
use App\Models\MartOrder;
use App\Models\Order;
use App\Models\User;
use App\Services\FcmService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CallController extends Controller
{
    /** Relay sinyal WebRTC antar dua pihak tanpa menyimpan nomor HP */
    public function signal(Request $request): JsonResponse
    {
        $data = $request->validate([
            'order_id'    => ['required', 'integer'],
            'order_type'  => ['required', 'in:zasago,zasafood,zasamart'],
            'signal_type' => ['required', 'in:offer,answer,ice-candidate,end,ring'],
            'data'        => ['nullable'],
        ]);

        $user  = $request->user();
        $order = $this->resolveOrder($data['order_id'], $data['order_type']);

        // Hanya pelanggan dan mitra order ini yang boleh sinyal
        if ($order->customer_id !== $user->id && $order->mitra_id !== $user->id) {
            return response()->json(['message' => 'Akses ditolak.'], 403);
        }

        // Channel: private call.{order_type}.{order_id}
        $channelName = "call.{$data['order_type']}.{$data['order_id']}";

        broadcast(new CallSignal(
            $channelName,
            $data['signal_type'],
            $data['data'] ?? null,
            $user->id,
        ));

        // ring/offer/end juga dikirim ke channel personal penerima agar bisa diterima
        // meski penerima tidak sedang berada di halaman ChatPage
        $receiverId = ($order->customer_id === $user->id)
            ? $order->mitra_id
            : $order->customer_id;

        if ($receiverId && in_array($data['signal_type'], ['ring', 'offer', 'end'])) {
            // Format nama pemanggil — mitra mendapat label agar penerima tahu konteksnya
            $callerLabel = $this->formatCallerName($user);

            $ctxData = [
                'order_id'    => $data['order_id'],
                'order_type'  => $data['order_type'],
                'caller_name' => $callerLabel,
            ];
            // Sertakan SDP offer agar callee tidak perlu berlangganan order channel dulu
            if ($data['signal_type'] === 'offer') {
                $ctxData['sdp'] = $data['data'];
            }
            broadcast(new CallSignal(
                "user.{$receiverId}",
                $data['signal_type'],
                $ctxData,
                $user->id,
            ));

            // Data-only FCM → ZasaQuFcmService tampilkan layar penuh incoming call
            if ($data['signal_type'] === 'ring') {
                try {
                    $receiver = User::find($receiverId);
                    if ($receiver && !empty($receiver->fcm_token)) {
                        app(FcmService::class)->sendDataOnly(
                            $receiver->fcm_token,
                            [
                                'type'        => 'incoming_call',
                                'order_id'    => (string) $data['order_id'],
                                'order_type'  => $data['order_type'],
                                'caller_id'   => (string) $user->id,
                                'caller_name' => $callerLabel,
                            ]
                        );
                    }
                } catch (\Throwable) {}
            }
        }

        return response()->json(['ok' => true]);
    }

    private function resolveOrder(int $orderId, string $type): \Illuminate\Database\Eloquent\Model
    {
        return match($type) {
            'zasafood' => FoodOrder::findOrFail($orderId),
            'zasamart' => MartOrder::findOrFail($orderId),
            default    => Order::findOrFail($orderId),
        };
    }

    /** Format nama pemanggil — mitra mendapat label "(Mitra ZasaQu)" */
    private function formatCallerName(User $user): string
    {
        $role = $user->role ?? '';
        if (str_starts_with($role, 'mitra')) {
            return $user->name . ' (Mitra ZasaQu)';
        }
        return $user->name;
    }
}
