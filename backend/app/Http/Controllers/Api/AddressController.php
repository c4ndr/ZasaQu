<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\CustomerAddress;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class AddressController extends Controller
{
    public function index(Request $request)
    {
        $addresses = CustomerAddress::where('user_id', $request->user()->id)
            ->orderByDesc('is_default')
            ->orderBy('created_at')
            ->get();

        return response()->json($addresses);
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'label'           => 'sometimes|string|max:50',
            'recipient_name'  => 'required|string|max:100',
            'recipient_phone' => 'required|string|max:20',
            'address'         => 'required|string',
            'lat'             => 'nullable|numeric|between:-90,90',
            'lng'             => 'nullable|numeric|between:-180,180',
            'notes'           => 'nullable|string',
            'is_default'      => 'sometimes|boolean',
        ]);

        $data['user_id'] = $request->user()->id;

        if (!empty($data['is_default'])) {
            CustomerAddress::where('user_id', $data['user_id'])->update(['is_default' => false]);
        }

        // If this is the first address, make it default automatically
        $count = CustomerAddress::where('user_id', $data['user_id'])->count();
        if ($count === 0) {
            $data['is_default'] = true;
        }

        $address = CustomerAddress::create($data);

        return response()->json($address, 201);
    }

    public function update(Request $request, $id)
    {
        $address = CustomerAddress::where('user_id', $request->user()->id)
            ->findOrFail($id);

        $data = $request->validate([
            'label'           => 'sometimes|string|max:50',
            'recipient_name'  => 'sometimes|required|string|max:100',
            'recipient_phone' => 'sometimes|required|string|max:20',
            'address'         => 'sometimes|required|string',
            'lat'             => 'nullable|numeric|between:-90,90',
            'lng'             => 'nullable|numeric|between:-180,180',
            'notes'           => 'nullable|string',
            'is_default'      => 'sometimes|boolean',
        ]);

        if (!empty($data['is_default'])) {
            CustomerAddress::where('user_id', $request->user()->id)
                ->where('id', '!=', $id)
                ->update(['is_default' => false]);
        }

        $address->update($data);

        return response()->json($address);
    }

    public function destroy(Request $request, $id)
    {
        $address = CustomerAddress::where('user_id', $request->user()->id)
            ->findOrFail($id);

        $wasDefault = $address->is_default;
        $address->delete();

        // If deleted address was default, set the first remaining address as default
        if ($wasDefault) {
            $first = CustomerAddress::where('user_id', $request->user()->id)
                ->orderBy('created_at')
                ->first();
            if ($first) {
                $first->update(['is_default' => true]);
            }
        }

        return response()->json(['message' => 'Alamat dihapus.']);
    }

    public function setDefault(Request $request, $id)
    {
        $userId = $request->user()->id;

        abort_if(
            !CustomerAddress::where('user_id', $userId)->where('id', $id)->exists(),
            404,
            'Alamat tidak ditemukan.'
        );

        DB::transaction(function () use ($userId, $id) {
            CustomerAddress::where('user_id', $userId)->update(['is_default' => false]);
            CustomerAddress::where('user_id', $userId)->where('id', $id)->update(['is_default' => true]);
        });

        return response()->json(['message' => 'Alamat default berhasil diperbarui.']);
    }
}
