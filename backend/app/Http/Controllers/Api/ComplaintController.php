<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Models\FoodOrder;
use App\Models\MartOrder;
use App\Models\HomeOrder;
use App\Models\ServOrder;
use App\Models\RideOrder;
use App\Models\OrderComplaint;
use App\Models\User;
use App\Services\ImageCompressService;
use App\Services\NotificationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class ComplaintController extends Controller
{
    private const WINDOW_HOURS = 24;

    private const ORDER_TYPES = ['zasago', 'zasafood', 'zasamart', 'zasahome', 'zasaserv', 'zasaride'];

    public function __construct(
        private ImageCompressService $imageCompress,
        private NotificationService  $notifService,
    ) {}

    public function index(Request $request): JsonResponse
    {
        $complaints = OrderComplaint::where('customer_id', $request->user()->id)
            ->latest()
            ->paginate(20);

        return response()->json($complaints);
    }

    public function show(Request $request, int $id): JsonResponse
    {
        $complaint = OrderComplaint::where('customer_id', $request->user()->id)->findOrFail($id);
        return response()->json($complaint);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'order_type'  => ['required', Rule::in(self::ORDER_TYPES)],
            'order_id'    => ['required', 'integer'],
            'reason'      => ['required', 'string', 'max:100'],
            'description' => ['nullable', 'string', 'max:1000'],
            'photo'       => ['nullable', 'image', 'max:20480'],
        ]);

        $user  = $request->user();
        $order = $this->resolveOrder($data['order_type'], $data['order_id']);

        if (!$order || $order->customer_id !== $user->id) {
            return response()->json(['message' => 'Pesanan tidak ditemukan.'], 404);
        }

        if ($order->status !== 'completed') {
            return response()->json(['message' => 'Hanya pesanan yang sudah selesai yang bisa dilaporkan.'], 422);
        }

        $completedAt = $order->completed_at;
        if (!$completedAt || $completedAt->diffInHours(now()) > self::WINDOW_HOURS) {
            return response()->json([
                'message' => 'Batas waktu pelaporan (' . self::WINDOW_HOURS . ' jam setelah selesai) sudah lewat.',
            ], 422);
        }

        $exists = OrderComplaint::where('order_type', $data['order_type'])
            ->where('order_id', $data['order_id'])
            ->exists();
        if ($exists) {
            return response()->json(['message' => 'Pesanan ini sudah pernah dilaporkan.'], 422);
        }

        $photoPath = null;
        if ($request->hasFile('photo')) {
            $file     = $request->file('photo');
            $filename = Str::random(40) . '.jpg';
            $dir      = 'complaint-photos';
            $fullPath = storage_path("app/public/{$dir}/{$filename}");

            if (!is_dir(storage_path("app/public/{$dir}"))) {
                mkdir(storage_path("app/public/{$dir}"), 0755, true);
            }

            $this->imageCompress->compressAndSave($file->getRealPath(), $fullPath, $file->getMimeType());
            $photoPath = "{$dir}/{$filename}";
        }

        $complaint = OrderComplaint::create([
            'order_type'  => $data['order_type'],
            'order_id'    => $data['order_id'],
            'customer_id' => $user->id,
            'reason'      => $data['reason'],
            'description' => $data['description'] ?? null,
            'photo_path'  => $photoPath,
            'status'      => 'pending',
        ]);

        User::where('role', 'admin')->get()->each(function ($admin) use ($complaint, $user, $order) {
            try {
                $this->notifService->complaintCreated($admin, $user->name, $order->order_number, $complaint->id);
            } catch (\Throwable) {}
        });

        return response()->json(['message' => 'Laporan berhasil dikirim.', 'data' => $complaint], 201);
    }

    private function resolveOrder(string $type, int $orderId): ?\Illuminate\Database\Eloquent\Model
    {
        return match ($type) {
            'zasafood' => FoodOrder::find($orderId),
            'zasamart' => MartOrder::find($orderId),
            'zasahome' => HomeOrder::find($orderId),
            'zasaserv' => ServOrder::find($orderId),
            'zasaride' => RideOrder::find($orderId),
            default    => Order::find($orderId),
        };
    }
}
