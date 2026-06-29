package com.zasaqu.com;

import android.content.Intent;
import android.os.Bundle;
import android.webkit.WebView;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    // Dipakai ZasaQuFcmService untuk cek apakah app sedang foreground
    public static volatile boolean isInForeground = false;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        WebView.setWebContentsDebuggingEnabled(false);
        registerPlugin(AgoraVoicePlugin.class);
        registerPlugin(FloatingBubblePlugin.class);
        super.onCreate(savedInstanceState);
        handleBubbleRoute(getIntent());
    }

    @Override
    public void onResume() {
        super.onResume();
        isInForeground = true;
    }

    @Override
    public void onPause() {
        super.onPause();
        isInForeground = false;
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        handleBubbleRoute(intent);
    }

    // Saat bubble di-tap, buka route yang sesuai di WebView
    private void handleBubbleRoute(Intent intent) {
        if (intent == null) return;
        String route = intent.getStringExtra("bubble_route");
        if (route == null || route.isEmpty() || getBridge() == null) return;
        final WebView webView = getBridge().getWebView();
        if (webView == null) return;
        final String r = route;
        webView.post(() -> {
            try {
                webView.evaluateJavascript(
                    "window.__bubbleRoute = '" + r.replace("'", "\\'") + "'; " +
                    "window.dispatchEvent(new CustomEvent('bubbleNavigate', { detail: '" + r.replace("'", "\\'") + "' }));",
                    null
                );
            } catch (Exception ignored) {}
        });
    }
}
