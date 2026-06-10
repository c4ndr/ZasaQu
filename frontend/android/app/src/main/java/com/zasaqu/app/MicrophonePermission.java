package com.zasaqu.app;

import android.Manifest;
import android.content.Context;
import android.media.AudioAttributes;
import android.media.AudioFocusRequest;
import android.media.AudioManager;
import android.os.Build;
import com.getcapacitor.JSObject;
import com.getcapacitor.PermissionState;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;

/**
 * Plugin minimal untuk meminta izin mikrofon Android secara eksplisit
 * sebelum WebRTC getUserMedia() dipanggil.
 * Diperlukan karena Capacitor 8 tidak secara otomatis meminta runtime
 * permission RECORD_AUDIO saat WebView membutuhkannya.
 */
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
            requestVoiceAudioFocus();
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
        if (granted) requestVoiceAudioFocus();
        JSObject result = new JSObject();
        result.put("granted", granted);
        call.resolve(result);
    }

    // Request audio focus mode VOICE_COMMUNICATION agar Android siapkan audio path untuk mic
    private void requestVoiceAudioFocus() {
        try {
            AudioManager am = (AudioManager) getContext().getSystemService(Context.AUDIO_SERVICE);
            if (am == null) return;
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                AudioFocusRequest req = new AudioFocusRequest.Builder(AudioManager.AUDIOFOCUS_GAIN_TRANSIENT)
                    .setAudioAttributes(new AudioAttributes.Builder()
                        .setUsage(AudioAttributes.USAGE_VOICE_COMMUNICATION)
                        .setContentType(AudioAttributes.CONTENT_TYPE_SPEECH)
                        .build())
                    .build();
                am.requestAudioFocus(req);
            } else {
                am.requestAudioFocus(null, AudioManager.STREAM_VOICE_CALL,
                    AudioManager.AUDIOFOCUS_GAIN_TRANSIENT);
            }
            // Mode komunikasi suara — Android route audio ke earpiece & aktifkan mic
            am.setMode(AudioManager.MODE_IN_COMMUNICATION);
        } catch (Exception ignored) {}
    }
}
