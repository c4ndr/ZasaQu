package com.zasaqu.app;

import android.content.Intent;
import android.os.Bundle;
import android.webkit.WebView;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        WebView.setWebContentsDebuggingEnabled(true);
        registerPlugin(AgoraVoicePlugin.class);
        registerPlugin(FloatingBubblePlugin.class);
        super.onCreate(savedInstanceState);
        handleBubbleRoute(getIntent());
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
        if (route != null && !route.isEmpty() && getBridge() != null) {
            final String r = route;
            getBridge().getWebView().post(() ->
                getBridge().getWebView().evaluateJavascript(
                    "window.__bubbleRoute = '" + r.replace("'", "\\'") + "'; " +
                    "window.dispatchEvent(new CustomEvent('bubbleNavigate', { detail: '" + r.replace("'", "\\'") + "' }));",
                    null
                )
            );
        }
    }
}
