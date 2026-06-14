<?php

namespace App\Http\Controllers\Api\Ride;

use App\Http\Controllers\Controller;
use App\Models\RideSavedPlace;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SavedPlaceController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $places = RideSavedPlace::where('user_id', $request->user()->id)
            ->orderBy('sort_order')->orderBy('id')
            ->get();
        return response()->json($places);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name'  => ['required', 'string', 'max:50'],
            'emoji' => ['nullable', 'string', 'max:10'],
            'address' => ['required', 'string', 'max:255'],
            'lat'   => ['required', 'numeric', 'between:-90,90'],
            'lng'   => ['required', 'numeric', 'between:-180,180'],
        ]);

        $count = RideSavedPlace::where('user_id', $request->user()->id)->count();
        if ($count >= 10) {
            return response()->json(['message' => 'Maksimal 10 lokasi tersimpan.'], 422);
        }

        $place = RideSavedPlace::create([
            ...$data,
            'user_id'    => $request->user()->id,
            'emoji'      => $data['emoji'] ?? '📍',
            'sort_order' => $count,
        ]);

        return response()->json($place, 201);
    }

    public function destroy(Request $request, int $id): JsonResponse
    {
        RideSavedPlace::where('user_id', $request->user()->id)->findOrFail($id)->delete();
        return response()->json(['message' => 'Lokasi dihapus.']);
    }
}
