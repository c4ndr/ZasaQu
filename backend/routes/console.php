<?php

use Illuminate\Support\Facades\Schedule;

Schedule::command('gps:check')->everyMinute();
Schedule::command('orders:auto-confirm')->everyMinute();
Schedule::command('payments:expire')->everyFiveMinutes();
Schedule::command('photos:clean --days=7')->dailyAt('03:00');
Schedule::command('otp:cleanup')->hourly();
Schedule::command('food:auto-confirm')->everyMinute();
