<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Saldo minimum mitra setelah withdraw
    |--------------------------------------------------------------------------
    */
    'min_mitra_balance' => env('ZASAQU_MIN_MITRA_BALANCE', 10000),

    /*
    |--------------------------------------------------------------------------
    | Konfigurasi QRIS Merchant
    |--------------------------------------------------------------------------
    |
    | Untuk QRIS yang benar-benar memproses pembayaran, isi dengan data asli
    | dari Bank Indonesia / payment gateway Anda.
    |
    | NMID (National Merchant ID): 15 digit, format 9360001XXXXXXXXXX
    | Diperoleh dari: bank acquirer / payment gateway (GoPay, Dana, BCA, dst.)
    |
    | Untuk mode DEMO/simulasi, nilai default sudah diisi sehingga QRIS
    | bisa di-scan dan menampilkan nominal yang benar, tapi tidak memproses
    | pembayaran nyata.
    |
    */
    'qris_nmid'              => env('QRIS_NMID',              'ID1020001483564'),
    'qris_merchant_name'     => env('QRIS_MERCHANT_NAME',     'ZasaQu'),
    'qris_merchant_city'     => env('QRIS_MERCHANT_CITY',     'Jakarta'),
    'qris_merchant_category' => env('QRIS_MERCHANT_CATEGORY', '5999'), // Miscellaneous
];
