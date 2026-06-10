package com.zasaqu.app;

import android.os.Bundle;
import android.webkit.PermissionRequest;
import android.webkit.WebView;
import com.getcapacitor.BridgeActivity;
import com.getcapacitor.BridgeWebChromeClient;

public class MainActivity extends BridgeActivity {
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        WebView.setWebContentsDebuggingEnabled(true);
        registerPlugin(MicrophonePermission.class);
        super.onCreate(savedInstanceState);
    }

    @Override
    public void onStart() {
        super.onStart();
        android.webkit.WebView wv = getBridge().getWebView();

        // Izinkan media play tanpa gesture — diperlukan agar WebRTC audio bisa di-init
        wv.getSettings().setMediaPlaybackRequiresUserGesture(false);

        // RECORD_AUDIO di OS level tidak otomatis memberi akses ke WebView.
        // WebChromeClient.onPermissionRequest harus di-grant agar getUserMedia({ audio })
        // bisa jalan di WebRTC. Tanpa ini, mic gagal dengan NotAllowedError/OperationError.
        wv.setWebChromeClient(new BridgeWebChromeClient(getBridge()) {
            @Override
            public void onPermissionRequest(final PermissionRequest request) {
                // Grant di main thread agar tidak ada race condition
                runOnUiThread(() -> request.grant(request.getResources()));
            }
        });
    }
}
