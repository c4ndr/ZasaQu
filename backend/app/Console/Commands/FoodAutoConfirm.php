<?php

namespace App\Console\Commands;

use App\Services\FoodOrderService;
use Illuminate\Console\Command;

class FoodAutoConfirm extends Command
{
    protected $signature   = 'food:auto-confirm';
    protected $description = 'Auto-complete order ZasaFood yang sudah delivered melewati batas waktu SLA';

    public function __construct(private FoodOrderService $foodOrderService)
    {
        parent::__construct();
    }

    public function handle(): void
    {
        $this->foodOrderService->autoConfirmDelivered();
        $this->foodOrderService->cancelTimedOutPending();
        $this->info('food:auto-confirm selesai.');
    }
}
