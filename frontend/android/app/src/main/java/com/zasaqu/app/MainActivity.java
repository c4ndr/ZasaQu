package com.zasaqu.app;

import android.Manifest;
import android.content.pm.PackageManager;
import android.webkit.PermissionRequest;
import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    private PermissionRequest pendingWebRTCRequest;
    private static final int MIC_PERMISSION_CODE = 1001;

    /**
     * Dipanggil saat WebView meminta akses mikrofon lewat getUserMedia().
     * Capacitor 8 tidak forward permintaan ini ke Android secara otomatis
     * untuk audio — harus di-handle manual di sini.
     */
    @Override
    public void onPermissionRequest(final PermissionRequest request) {
        boolean micGranted = ContextCompat.checkSelfPermission(this, Manifest.permission.RECORD_AUDIO)
            == PackageManager.PERMISSION_GRANTED;

        if (micGranted) {
            request.grant(request.getResources());
        } else {
            pendingWebRTCRequest = request;
            ActivityCompat.requestPermissions(
                this,
                new String[]{ Manifest.permission.RECORD_AUDIO },
                MIC_PERMISSION_CODE
            );
        }
    }

    @Override
    public void onRequestPermissionsResult(int requestCode, String[] permissions, int[] grantResults) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults);

        if (requestCode == MIC_PERMISSION_CODE && pendingWebRTCRequest != null) {
            if (grantResults.length > 0 && grantResults[0] == PackageManager.PERMISSION_GRANTED) {
                pendingWebRTCRequest.grant(pendingWebRTCRequest.getResources());
            } else {
                pendingWebRTCRequest.deny();
            }
            pendingWebRTCRequest = null;
        }
    }
}
