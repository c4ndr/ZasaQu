<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Rating extends Model
{
    protected $fillable = [
        'order_id', 'rater_id', 'ratee_id', 'rater_role', 'score', 'comment',
    ];

    protected function casts(): array
    {
        return ['score' => 'integer'];
    }

    public function order()  { return $this->belongsTo(Order::class); }
    public function rater()  { return $this->belongsTo(User::class, 'rater_id'); }
    public function ratee()  { return $this->belongsTo(User::class, 'ratee_id'); }
}
