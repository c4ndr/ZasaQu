<?php

namespace App\Http\Controllers\Api;

use App\Events\CallSignal;
use App\Http\Controllers\Controller;
use App\Models\ChatRoom;
use App\Models\FoodOrder;
use App\Models\HomeOrder;
use App\Models\MartOrder;
use App\Models\Order;
use App\Models\RideOrder;
use App\Models\ServOrder;
use App\Models\User;
use App\Services\FcmService;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CallController extends Controller
{
    /** Relay sinyal WebRTC antar dua pihak tanpa menyimpan nomor HP */
    public function signal(Request $request): JsonResponse
    {
        $data = $request->validate([
            'order_id'    => ['required', 'integer'],
            'order_type'  => ['required', 'in:zasago,zasafood,zasamart,zasaride,zasahome,zasaserv,zasaserv_consult,zasaserv_provider_consult'],
            'signal_type' => ['required', 'in:offer,answer,ice-candidate,end,ring'],
            'data'        => ['nullable'],
        ]);

        $user  = $request->user();
        $order = $this->resolveOrder($data['order_id'], $data['order_type']);

        [$customerId, $mitraid] = $this->resolveParties($order, $data['order_type']);

        if ($customerId !== $user->id && $mitraid !== $user->id) {
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

        // ring/offer/end juga dikirim ke channel personal penerima
        $receiverId = ($customerId === $user->id) ? $mitraid : $customerId;

        if ($receiverId && in_array($data['signal_type'], ['ring', 'offer', 'end'])) {
            $callerLabel = $this->formatCallerName($user);

            $ctxData = [
                'order_id'    => $data['order_id'],
                'order_type'  => $data['order_type'],
                'caller_name' => $callerLabel,
            ];
            if ($data['signal_type'] === 'offer') {
                $ctxData['sdp'] = $data['data'];
            }
            broadcast(new CallSignal(
                "user.{$receiverId}",
                $data['signal_type'],
                $ctxData,
                $user->id,
            ));

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

    private function resolveOrder(int $orderId, string $type): Model
    {
        return match($type) {
            'zasafood'                   => FoodOrder::findOrFail($orderId),
            'zasamart'                   => MartOrder::findOrFail($orderId),
            'zasaride'                   => RideOrder::findOrFail($orderId),
            'zasahome'                   => HomeOrder::findOrFail($orderId),
            'zasaserv'                   => ServOrder::findOrFail($orderId),
            'zasaserv_consult',
            'zasaserv_provider_consult'  => ChatRoom::findOrFail($orderId),
            default                      => Order::findOrFail($orderId),
        };
    }

    /** Kembalikan [customer_id, mitra/provider_id] dari model order apapun */
    private function resolveParties(Model $order, string $type): array
    {
        if (in_array($type, ['zasaserv_consult', 'zasaserv_provider_consult'])) {
            // ChatRoom memakai provider_id bukan mitra_id
            return [$order->customer_id, $order->provider_id];
        }
        return [$order->customer_id, $order->mitra_id];
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
