<?php

use App\Models\ChatRoom;
use App\Models\FoodOrder;
use App\Models\Order;
use Illuminate\Support\Facades\Broadcast;

Broadcast::channel('App.Models.User.{id}', function ($user, $id) {
    return (int) $user->id === (int) $id;
});

// ZasaGo order tracking — customer, mitra, atau admin
Broadcast::channel('orders.{orderId}', function ($user, $orderId) {
    if ($user->role === 'admin') return true;
    return Order::where('id', $orderId)
        ->where(fn($q) => $q->where('customer_id', $user->id)->orWhere('mitra_id', $user->id))
        ->exists();
});

// ZasaFood order tracking — customer, mitra, merchant, atau admin
Broadcast::channel('food.{foodOrderId}', function ($user, $foodOrderId) {
    if ($user->role === 'admin') return true;
    $order = FoodOrder::with('merchant:id,user_id')->find($foodOrderId);
    if (!$order) return false;
    return $user->id === $order->customer_id
        || $user->id === $order->mitra_id
        || $user->id === $order->merchant?->user_id;
});

// Mitra channel — notifikasi order baru ZasaGo
Broadcast::channel('mitra.{vehicleType}', function ($user, $vehicleType) {
    return $user->role === "mitra_{$vehicleType}";
});

Broadcast::channel('chat.{roomId}', function ($user, $roomId) {
    $room = ChatRoom::with('order:id,customer_id,mitra_id')->find($roomId);
    if (!$room) return false;
    return $user->id === $room->order->customer_id
        || $user->id === $room->order->mitra_id;
});
