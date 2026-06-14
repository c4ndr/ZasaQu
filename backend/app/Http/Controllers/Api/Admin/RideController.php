<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\RideFare;
use App\Models\RideOrder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class RideController extends Controller
{
    // Daftar semua order
    public function orders(Request $request): JsonResponse
    {
        $query = RideOrder::with(['customer', 'mitra'])->latest();

        if ($request->filled('status'))       $query->where('status', $request->status);
        if ($request->filled('vehicle_type')) $query->where('vehicle_type', $request->vehicle_type);

        return response()->json($query->paginate(30));
    }

    // Get semua tarif
    public function fares(): JsonResponse
    {
        return response()->json(RideFare::all());
    }

    // Update tarif
    public function updateFare(Request $request, int $id): JsonResponse
    {
        $fare = RideFare::findOrFail($id);

        $data = $request->validate([
            'base_fare'       => ['required', 'numeric', 'min:0'],
            'per_km_fare'     => ['required', 'numeric', 'min:0'],
            'minimum_fare'    => ['required', 'numeric', 'min:0'],
            'commission_rate' => ['required', 'numeric', 'min:0', 'max:100'],
            'road_factor'     => ['required', 'numeric', 'min:1', 'max:3'],
            'is_active'       => ['required', 'boolean'],
        ]);

        $fare->update($data);
        return response()->json($fare);
    }

    // Statistik singkat untuk dashboard
    public function stats(): JsonResponse
    {
        return response()->json([
            'total'     => RideOrder::count(),
            'today'     => RideOrder::whereDate('created_at', today())->count(),
            'active'    => RideOrder::whereIn('status', ['pending','accepted','on_pickup','on_ride'])->count(),
            'completed' => RideOrder::where('status', 'completed')->count(),
            'cancelled' => RideOrder::where('status', 'cancelled')->count(),
            'revenue'   => (float) RideOrder::where('status', 'completed')->sum('platform_commission'),
        ]);
    }
}
