<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Third Party Services
    |--------------------------------------------------------------------------
    |
    | This file is for storing the credentials for third party services such
    | as Mailgun, Postmark, AWS and more. This file provides the de facto
    | location for this type of information, allowing packages to have
    | a conventional file to locate the various service credentials.
    |
    */

    'postmark' => [
        'key' => env('POSTMARK_API_KEY'),
    ],

    'resend' => [
        'key' => env('RESEND_API_KEY'),
    ],

    'ses' => [
        'key' => env('AWS_ACCESS_KEY_ID'),
        'secret' => env('AWS_SECRET_ACCESS_KEY'),
        'region' => env('AWS_DEFAULT_REGION', 'us-east-1'),
    ],

    'slack' => [
        'notifications' => [
            'bot_user_oauth_token' => env('SLACK_BOT_USER_OAUTH_TOKEN'),
            'channel' => env('SLACK_BOT_USER_DEFAULT_CHANNEL'),
        ],
    ],

    'fonnte' => [
        'token' => env('FONNTE_TOKEN'),
    ],

    'fcm' => [
        'project_id'           => env('FCM_PROJECT_ID'),
        'service_account_path' => env('FCM_SERVICE_ACCOUNT_PATH', storage_path('app/fcm-service-account.json')),
    ],

    'midtrans' => [
        'server_key'    => env('MIDTRANS_SERVER_KEY'),
        'client_key'    => env('MIDTRANS_CLIENT_KEY'),
        'is_production' => env('MIDTRANS_IS_PRODUCTION', false),
        'is_sanitized'  => true,
        'is_3ds'        => true,
    ],

    'ipaymu' => [
        'va'            => env('IPAYMU_VA'),
        'api_key'       => env('IPAYMU_API_KEY'),
        'is_production' => env('IPAYMU_IS_PRODUCTION', true),
    ],

    'agora' => [
        'app_id'          => env('AGORA_APP_ID'),
        'app_certificate' => env('AGORA_APP_CERTIFICATE'),
    ],

    'monitor' => [
        'secret' => env('MONITOR_SECRET'),
    ],

    'telegram_bot' => [
        'token'          => env('TELEGRAM_BOT_TOKEN'),
        'webhook_secret' => env('TELEGRAM_BOT_WEBHOOK_SECRET', 'zasaqu-n8n-secret'),
    ],

];
