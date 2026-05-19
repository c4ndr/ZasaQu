<?php
namespace App\Http\Controllers\Api;
use App\Http\Controllers\Controller;
use App\Models\ItemCategory;
use App\Models\Order;
use App\Services\OrderService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
class OrderController extends Controller
{
    public function __construct(private OrderService $orderService) {}
    public function categories(): JsonResponse {
        return response()->json(ItemCategory::active()->get());
    }
    public function index(Request $request): JsonResponse {
        $userId = $request->user()->id;
        $query  = Order::where('customer_id', $userId)
            ->with(['mitra','itemCategory','photos']);

        // Filter opsional
        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }
        if ($request->filled('type')) {
            $query->where('type', $request->type);
        }
        if ($request->filled('payment_method')) {
            $query->where('payment_method', $request->payment_method);
        }

        $orders = $query->latest()->paginate(20);

        // Tandai apakah user sudah rating tiap order
        $orders->getCollection()->transform(function (Order $order) use ($userId) {
            $order->user_rating = $order->ratings()->where('rater_id', $userId)->first()?->only(['score','comment']);
            return $order;
        });

        return response()->json($orders);
    }
    public function show(Request $request, int $id): JsonResponse {
        $userId = $request->user()->id;
        $order  = Order::where('customer_id', $userId)
            ->with(['mitra','itemCategory','photos','jastipSession'])->findOrFail($id);
        $order->user_rating = $order->ratings()->where('rater_id', $userId)->first()?->only(['score','comment']);
        return response()->json($order);
    }
    public function store(Request $request): JsonResponse {
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
            'vehicle_type'=>['required','in:motor,mobil'],
            'shipping_fee'=>['required','numeric','min:1000'],
            'payment_method'=>['required','in:wallet,cod'],
            'is_jastip_enabled'=>['boolean'],
            'requires_disclaimer'=>['boolean'],
            'require_photo'=>['boolean'],
            'notes'=>['nullable','string'],
        ]);
        try {
            $order = $this->orderService->createMasterOrder($request->user(), $data);
        } catch (\Exception $e) {
            return response()->json(['message'=>$e->getMessage()], 422);
        }
        return response()->json(['message'=>'Order berhasil dibuat.','data'=>$order->load('itemCategory')], 201);
    }
    public function cancel(Request $request, int $id): JsonResponse {
        $order = Order::where('customer_id', $request->user()->id)->findOrFail($id);
        $data = $request->validate(['reason'=>['required','string','max:255']]);
        try {
            $this->orderService->cancelOrder($order, $data['reason']);
        } catch (\Exception $e) {
            return response()->json(['message'=>$e->getMessage()], 422);
        }
        return response()->json(['message'=>'Order berhasil dibatalkan.']);
    }

    public function confirmCod(Request $request, int $id): JsonResponse {
        try {
            DB::transaction(function () use ($request, $id) {
                $order = Order::where('customer_id', $request->user()->id)
                    ->where('payment_method', 'cod')
                    ->where('status', 'delivered')
                    ->whereNull('cod_confirmed_at')
                    ->lockForUpdate()
                    ->findOrFail($id);

                $order->update(['cod_confirmed_at' => now()]);
                $this->orderService->updateStatus($order->fresh(), 'completed');
            });
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException) {
            return response()->json(['message' => 'Order tidak ditemukan atau sudah dikonfirmasi.'], 404);
        } catch (\Exception $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }

        return response()->json(['message' => 'Penerimaan COD dikonfirmasi. Order selesai.']);
    }
}
