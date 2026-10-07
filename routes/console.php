<?php

use Illuminate\Support\Facades\Schedule;

Schedule::command('iprep:check --due')
    ->hourly()
    ->withoutOverlapping()
    ->runInBackground();
