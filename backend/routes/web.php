<?php

use Illuminate\Support\Facades\Route;

Route::get('/', function () {
    return view('welcome');
});

// Download sertifikat CA mkcert ke HP agar GPS bisa digunakan
Route::get('/ca-cert', function () {
    $caRoot = trim(shell_exec('mkcert -CAROOT 2>/dev/null') ?? '');
    $paths  = [
        $caRoot . '/rootCA.pem',
        base_path('../frontend/rootCA.pem'),
    ];
    foreach ($paths as $path) {
        if ($path && file_exists($path)) {
            return response()->file($path, [
                'Content-Type'        => 'application/x-x509-ca-cert',
                'Content-Disposition' => 'attachment; filename="ZasaQu-CA.crt"',
            ]);
        }
    }
    return response('Sertifikat CA belum dibuat. Jalankan: bash setup-https.sh', 404);
});
