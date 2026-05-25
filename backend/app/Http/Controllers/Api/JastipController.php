<?php
namespace App\Http\Controllers\Api;
use App\Http\Controllers\Controller;
use App\Models\AdminSetting;
use App\Models\JastipSession;
use App\Services\CorridorService;
use App\Services\JastipService;
use App\Services\OrderService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Redis;
class JastipController extends Controller
{
    public function __construct(
        private JastipService $jastipService,
        private OrderService $orderService,
        private CorridorService $corridorService,
    ) {}
    public function startSession(Request $request): JsonResponse {
        if (!$request->user()->isMitra()) {
            return response()->json(['message'=>'Hanya mitra yang bisa membuka sesi JastipQu.'], 403);
        }
        $data = $request->validate([
            'master_order_id'=>['nullable','exists:orders,id'],
            'origin_lat'=>['required','numeric'],
            'origin_lng'=>['required','numeric'],
            'destination_lat'=>['nullable','numeric'],
            'destination_lng'=>['nullable','numeric'],
            'route_polyline'=>['nullable','array'],
            'corridor_width'=>['nullable','integer','min:100','max:' . (int) (AdminSetting::where('key','corridor_max_meters')->value('value') ?? 2000)],
        ]);

        // Pastikan GPS aktif di Redis sebelum membuka sesi
        $gpsKey = 'gps:mitra:' . $request->user()->id;
        if (!Redis::exists($gpsKey)) {
            return response()->json([
                'message' => 'GPS Anda belum aktif. Aktifkan GPS di halaman GPS terlebih dahulu sebelum membuka sesi JastipQu.',
                'gps_required' => true,
            ], 422);
        }

        // Jika sesi mandiri (tanpa master_order_id), cek apakah mitra ada order yang sedang berjalan aktif
        // Order yang sudah > 2 jam tidak diupdate dianggap macet dan tidak diblokir
        if (empty($data['master_order_id'])) {
            $activeOrder = \App\Models\Order::where('mitra_id', $request->user()->id)
                ->whereNotIn('status', ['completed', 'cancelled'])
                ->where('updated_at', '>=', now()->subHours(2))
                ->first();
            if ($activeOrder) {
                return response()->json([
                    'message'          => 'Anda sedang mengerjakan order aktif (#' . $activeOrder->order_number . '). Selesaikan order dulu atau buka JastipQu dari halaman GPS.',
                    'active_order_id'  => $activeOrder->id,
                    'active_order_num' => $activeOrder->order_number,
                ], 422);
            }
        }

        $session = $this->jastipService->startSession($request->user(), $data);
        return response()->json(['message'=>'Sesi JastipQu berhasil dibuka.','data'=>$session], 201);
    }
    public function closeSession(Request $request): JsonResponse {
        $session = JastipSession::where('mitra_id',$request->user()->id)->where('status','active')->firstOrFail();
        $this->orderService->closeJastipSession($session, 'manual');
        return response()->json(['message'=>'Sesi JastipQu berhasil ditutup.']);
    }
    public function currentSession(Request $request): JsonResponse {
        $session = JastipSession::where('mitra_id',$request->user()->id)->where('status','active')
            ->with(['masterOrder','jastipOrders.customer'])->first();
        return response()->json($session);
    }
    public function availableSessions(Request $request): JsonResponse {
        $data = $request->validate([
            'vehicle_type'=>['required','in:motor,mobil'],
            'lat'=>['nullable','numeric'],
            'lng'=>['nullable','numeric'],
        ]);
        $sessions = $this->jastipService->getActiveSessions(
            $data['vehicle_type'],
            $data['lat'] ?? null,
            $data['lng'] ?? null,
        );
        return response()->json($sessions);
    }
    public function placeJastipOrder(Request $request, int $sessionId): JsonResponse {
        $session = JastipSession::where('status','active')->findOrFail($sessionId);
        $data = $request->validate([
            'pickup_address'=>['required','string'],
            'pickup_lat'=>['required','numeric'],
            'pickup_lng'=>['required','numeric'],
            'dropoff_address'=>['required','string'],
            'dropoff_lat'=>['required','numeric'],
            'dropoff_lng'=>['required','numeric'],
            'item_category_id'=>['nullable','exists:item_categories,id'],
            'item_description'=>['required','string','max:255'],
            'item_value'=>['nullable','numeric','min:0'],
            'shipping_fee'=>['required','numeric','min:1000'],
            'payment_method'=>['required','in:wallet,cod'],
            'requires_disclaimer'=>['boolean'],
            'notes'=>['nullable','string'],
        ]);
        try {
            $order = $this->orderService->createJastipOrder($request->user(), $session, $data, $this->corridorService);
        } catch (\Exception $e) {
            return response()->json(['message'=>$e->getMessage()], 422);
        }
        return response()->json(['message'=>'Order jastip berhasil ditempatkan.','data'=>$order], 201);
    }
}
