<?php

namespace App\Services;

use App\Models\Order;
use App\Models\Rating;
use App\Models\User;

class RatingService
{
    public function submitRating(Order $order, User $rater, int $score, ?string $comment): Rating
    {
        if ($order->status !== 'completed') {
            throw new \Exception('Rating hanya bisa diberikan untuk order yang sudah selesai.');
        }

        // Tentukan ratee berdasarkan siapa yang memberi rating
        if ($rater->id === $order->customer_id) {
            $ratee     = $order->mitra;
            $raterRole = 'customer';
        } elseif ($rater->id === $order->mitra_id) {
            $ratee     = $order->customer;
            $raterRole = 'mitra';
        } else {
            throw new \Exception('Anda tidak terlibat dalam order ini.');
        }

        if (!$ratee) {
            throw new \Exception('Tidak dapat menemukan penerima rating.');
        }

        if (Rating::where('order_id', $order->id)->where('rater_id', $rater->id)->exists()) {
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

        // Update rata-rata rating mitra
        if ($raterRole === 'customer') {
            $this->recalculateMitraRating($ratee);
        }

        return $rating;
    }

    private function recalculateMitraRating(User $mitra): void
    {
        // Gabungkan rating ZasaGo ('customer') dan ZasaFood ('customer_to_mitra')
        $avg = Rating::where('ratee_id', $mitra->id)
            ->whereIn('rater_role', ['customer', 'customer_to_mitra'])
            ->avg('score');

        $mitra->mitraDetail?->update([
            'average_rating' => round((float) $avg, 2),
        ]);
    }

    public function getOrderRating(Order $order, User $user): ?Rating
    {
        return Rating::where('order_id', $order->id)
            ->where('rater_id', $user->id)
            ->first();
    }
}
