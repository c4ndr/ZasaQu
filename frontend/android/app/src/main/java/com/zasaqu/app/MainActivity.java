package com.zasaqu.app;

import android.os.Bundle;
import android.webkit.WebView;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        WebView.setWebContentsDebuggingEnabled(true);
        registerPlugin(AgoraVoicePlugin.class);
        super.onCreate(savedInstanceState);
    }
}
