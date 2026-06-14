<?php

use App\Models\ChatRoom;
use App\Models\FoodOrder;
use App\Models\MartOrder;
use App\Models\Order;
use App\Models\RideOrder;
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
    $room = ChatRoom::find($roomId);
    if (!$room) return false;
    $order = $room->resolveOrder();
    if (!$order) return false;
    return $user->id === $order->customer_id || $user->id === $order->mitra_id;
});

// Ride order tracking channel
Broadcast::channel('ride.orders.{orderId}', function ($user, $orderId) {
    if ($user->role === 'admin') return true;
    return RideOrder::where('id', $orderId)
        ->where(fn($q) => $q->where('customer_id', $user->id)->orWhere('mitra_id', $user->id))
        ->exists();
});

// Ride available — semua mitra aktif subscribe untuk terima order baru
Broadcast::channel('ride.available', function ($user) {
    return in_array($user->role, ['mitra_motor', 'mitra_mobil', 'admin']);
});

// WebRTC call channel — hanya customer & mitra order tersebut
Broadcast::channel('call.{orderType}.{orderId}', function ($user, $orderType, $orderId) {
    $order = match($orderType) {
        'zasafood'  => FoodOrder::find($orderId),
        'zasamart'  => MartOrder::find($orderId),
        'zasaride'  => RideOrder::find($orderId),
        default     => Order::find($orderId),
    };
    if (!$order) return false;
    return $user->id === $order->customer_id || $user->id === $order->mitra_id;
});

// Personal call channel — menerima ring/offer meski tidak di ChatPage
// Nama sengaja TIDAK dimulai dengan "call." agar tidak konflik dengan pattern call.{orderType}.{orderId}
Broadcast::channel('user.{userId}', function ($user, $userId) {
    return (int) $user->id === (int) $userId;
});
