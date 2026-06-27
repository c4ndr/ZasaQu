package com.zasaqu.com;

import android.Manifest;
import com.getcapacitor.JSObject;
import com.getcapacitor.PermissionState;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;

// Plugin minimal — hanya meminta izin OS RECORD_AUDIO.
// Jangan tambahkan AudioManager.setMode() atau requestAudioFocus() di sini:
// WebRTC (Chromium) mengelola audio session sendiri saat getUserMedia dipanggil.
@CapacitorPlugin(
    name = "MicrophonePermission",
    permissions = {
        @Permission(
            strings = { Manifest.permission.RECORD_AUDIO },
            alias = "microphone"
        )
    }
)
public class MicrophonePermission extends Plugin {

    @PluginMethod
    public void request(PluginCall call) {
        if (getPermissionState("microphone") == PermissionState.GRANTED) {
            JSObject result = new JSObject();
            result.put("granted", true);
            call.resolve(result);
        } else {
            requestAllPermissions(call, "handleResult");
        }
    }

    @PermissionCallback
    private void handleResult(PluginCall call) {
        boolean granted = getPermissionState("microphone") == PermissionState.GRANTED;
        JSObject result = new JSObject();
        result.put("granted", granted);
        call.resolve(result);
    }
}
