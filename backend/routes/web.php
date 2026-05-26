<?php

use Illuminate\Support\Facades\Route;

// SPA fallback — semua route non-API dilayani React
Route::get('/{any}', function () {
    return response(file_get_contents(public_path('index.html')), 200)
        ->header('Content-Type', 'text/html');
})->where('any', '^(?!api|storage|ca-cert).*$');

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
