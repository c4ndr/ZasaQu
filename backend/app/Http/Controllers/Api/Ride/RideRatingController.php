<?php

namespace App\Http\Controllers\Api\Ride;

use App\Http\Controllers\Controller;
use App\Models\RideOrder;
use App\Services\RatingService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class RideRatingController extends Controller
{
    public function __construct(private RatingService $ratingService) {}

    public function store(Request $request, int $id): JsonResponse
    {
        $order = RideOrder::where('customer_id', $request->user()->id)->findOrFail($id);

        $data = $request->validate([
            'score'   => ['required', 'integer', 'min:1', 'max:5'],
            'comment' => ['nullable', 'string', 'max:500'],
        ]);

        try {
            $rating = $this->ratingService->submitRideRating($order, $request->user(), $data['score'], $data['comment'] ?? null);
        } catch (\Exception $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }

        return response()->json($rating, 201);
    }

    public function show(Request $request, int $id): JsonResponse
    {
        $order  = RideOrder::where('customer_id', $request->user()->id)->findOrFail($id);
        $rating = $this->ratingService->getRideOrderRating($order, $request->user());

        return response()->json($rating);
    }
}
