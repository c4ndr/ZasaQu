<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Services\RatingService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class RatingController extends Controller
{
    public function __construct(private RatingService $ratingService) {}

    public function store(Request $request, int $orderId): JsonResponse
    {
        $data = $request->validate([
            'score'   => ['required', 'integer', 'min:1', 'max:5'],
            'comment' => ['nullable', 'string', 'max:500'],
        ]);

        $order = Order::findOrFail($orderId);
        $user  = $request->user();

        // Pastikan user terlibat dalam order ini
        if ($user->id !== $order->customer_id && $user->id !== $order->mitra_id) {
            return response()->json(['message' => 'Tidak diizinkan.'], 403);
        }

        $rating = $this->ratingService->submitRating($order, $user, $data['score'], $data['comment'] ?? null);

        return response()->json([
            'message' => 'Rating berhasil dikirim.',
            'data'    => $rating,
        ], 201);
    }

    public function show(Request $request, int $orderId): JsonResponse
    {
        $order  = Order::findOrFail($orderId);
        $rating = $this->ratingService->getOrderRating($order, $request->user());

        return response()->json(['data' => $rating]);
    }
}
