<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
use App\Models\FoodOrder;
use App\Models\MartOrder;
use App\Models\HomeOrder;
use App\Models\ServOrder;
use App\Models\RideOrder;

class OrderComplaint extends Model
{
    protected $fillable = [
        'order_type', 'order_id', 'customer_id', 'reason', 'description',
        'photo_path', 'status', 'resolution_note', 'refund_amount',
        'resolved_by', 'resolved_at',
    ];

    protected function casts(): array
    {
        return ['resolved_at' => 'datetime', 'refund_amount' => 'decimal:2'];
    }

    public function customer() { return $this->belongsTo(User::class, 'customer_id'); }
    public function resolver() { return $this->belongsTo(User::class, 'resolved_by'); }

    /** Ambil model order asli sesuai order_type — pola sama seperti ChatController::resolveOrder(). */
    public function order(): ?Model
    {
        return match ($this->order_type) {
            'zasafood' => FoodOrder::find($this->order_id),
            'zasamart' => MartOrder::find($this->order_id),
            'zasahome' => HomeOrder::find($this->order_id),
            'zasaserv' => ServOrder::find($this->order_id),
            'zasaride' => RideOrder::find($this->order_id),
            default    => Order::find($this->order_id),
        };
    }
}
