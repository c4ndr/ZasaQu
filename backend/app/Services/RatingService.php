<?php

namespace App\Services;

use App\Models\Order;
use App\Models\Rating;
use App\Models\RideOrder;
use App\Models\User;

class RatingService
{
    public function submitRating(Order $order, User $rater, int $score, ?string $comment): Rating
    {
        if (!in_array($order->status, ['delivered', 'completed'])) {
            throw new \Exception('Rating hanya bisa diberikan untuk order yang sudah selesai.');
        }

        if ($rater->id === $order->customer_id) {
            $ratee     = $order->mitra;
            $raterRole = 'customer';
        } elseif ($rater->id === $order->mitra_id) {
            $ratee     = $order->customer;
            $raterRole = 'mitra';
        } else {
            throw new \Exception('Anda tidak terlibat dalam order ini.');
        }

        if (!$ratee) throw new \Exception('Tidak dapat menemukan penerima rating.');

        if (Rating::where('order_id', $order->id)->where('rater_id', $rater->id)->where('rater_role', $raterRole)->exists()) {
            throw new \Exception('Anda sudah memberikan rating untuk order ini.');
        }

        $rating = Rating::create([
            'order_id'   => $order->id,
            'rater_id'   => $rater->id,
            'ratee_id'   => $ratee->id,
            'rater_role' => $raterRole,
            'score'      => $score,
            'comment'    => $comment,
        ]);

        if ($raterRole === 'customer') $this->recalculateMitraRating($ratee);

        return $rating;
    }

    public function submitRideRating(RideOrder $order, User $rater, int $score, ?string $comment): Rating
    {
        if ($order->status !== 'completed') {
            throw new \Exception('Rating hanya bisa diberikan untuk perjalanan yang sudah selesai.');
        }

        if ($rater->id === $order->customer_id) {
            $ratee     = $order->mitra;
            $raterRole = 'customer';
        } elseif ($rater->id === $order->mitra_id) {
            $ratee     = $order->customer;
            $raterRole = 'mitra';
        } else {
            throw new \Exception('Anda tidak terlibat dalam perjalanan ini.');
        }

        if (!$ratee) throw new \Exception('Tidak dapat menemukan penerima rating.');

        if (Rating::where('ride_order_id', $order->id)->where('rater_id', $rater->id)->where('rater_role', $raterRole)->exists()) {
            throw new \Exception('Anda sudah memberikan rating untuk perjalanan ini.');
        }

        $rating = Rating::create([
            'ride_order_id' => $order->id,
            'rater_id'      => $rater->id,
            'ratee_id'      => $ratee->id,
            'rater_role'    => $raterRole,
            'score'         => $score,
            'comment'       => $comment,
        ]);

        if ($raterRole === 'customer') $this->recalculateMitraRating($ratee);

        return $rating;
    }

    private function recalculateMitraRating(User $mitra): void
    {
        $avg = Rating::where('ratee_id', $mitra->id)
            ->whereIn('rater_role', ['customer', 'customer_to_mitra'])
            ->avg('score');

        $mitra->mitraDetail?->update(['average_rating' => round((float) $avg, 2)]);
    }

    public function getOrderRating(Order $order, User $user): ?Rating
    {
        return Rating::where('order_id', $order->id)->where('rater_id', $user->id)->first();
    }

    public function getRideOrderRating(RideOrder $order, User $user): ?Rating
    {
        return Rating::where('ride_order_id', $order->id)->where('rater_id', $user->id)->first();
    }
}
