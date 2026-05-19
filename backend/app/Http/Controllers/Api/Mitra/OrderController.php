<?php
namespace App\Http\Controllers\Api\Mitra;
use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Services\OrderService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
class OrderController extends Controller
{
    public function __construct(private OrderService $orderService) {}
    public function available(Request $request): JsonResponse {
        $vehicleType = str_contains($request->user()->role,'motor') ? 'motor' : 'mobil';
        $orders = Order::where('status','pending')
            ->where('type','master')
            ->where('vehicle_type',$vehicleType)
            ->whereNull('mitra_id')
            ->with(['customer','itemCategory'])
            ->latest()->get();
        return response()->json($orders);
    }
    public function myOrders(Request $request): JsonResponse {
        $mitraId = $request->user()->id;
        $orders  = Order::where('mitra_id', $mitraId)
            ->with(['customer:id,name,phone','itemCategory','photos','jastipSession'])
            ->latest()->paginate(20);

        // Tandai apakah mitra sudah rating pelanggan di tiap order
        $orders->getCollection()->transform(function (Order $order) use ($mitraId) {
            $order->mitra_rating = $order->ratings()->where('rater_id', $mitraId)->first()?->only(['score','comment']);
            return $order;
        });

        return response()->json($orders);
    }
    public function accept(Request $request, int $id): JsonResponse {
        $mitra       = $request->user();
        $vehicleType = str_contains($mitra->role, 'motor') ? 'motor' : 'mobil';

        try {
            DB::transaction(function () use ($mitra, $id, $vehicleType) {
                // Lock baris order agar tidak bisa di-accept dua mitra sekaligus
                $order = Order::where('vehicle_type', $vehicleType)
                    ->where('status', 'pending')
                    ->whereNull('mitra_id')
                    ->lockForUpdate()
                    ->findOrFail($id);

                // Lock & cek active order mitra dalam satu transaksi
                $activeOrder = Order::where('mitra_id', $mitra->id)
                    ->whereNotIn('status', ['completed', 'cancelled'])
                    ->lockForUpdate()
                    ->first();

                if ($activeOrder) {
                    throw new \Exception(
                        'Anda masih memiliki order aktif (' . $activeOrder->order_number
                        . '). Selesaikan terlebih dahulu sebelum menerima order baru.'
                    );
                }

                $this->orderService->acceptOrder($order, $mitra);
            });
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException) {
            return response()->json(['message' => 'Order tidak tersedia atau sudah diambil mitra lain.'], 404);
        } catch (\Exception $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }

        return response()->json([
            'message' => 'Order berhasil diterima.',
            'data'    => Order::with(['customer', 'itemCategory'])->find($id),
        ]);
    }
    public function updateStatus(Request $request, int $id): JsonResponse {
        $order = Order::where('mitra_id',$request->user()->id)->findOrFail($id);
        $data = $request->validate(['status'=>['required','string']]);
        try {
            $this->orderService->updateStatus($order, $data['status']);
        } catch (\Exception $e) {
            return response()->json(['message'=>$e->getMessage()], 422);
        }
        return response()->json(['message'=>'Status order diperbarui.','data'=>$order->fresh()]);
    }
}
