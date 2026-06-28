package com.zasaqu.com;

import android.Manifest;
import android.content.SharedPreferences;
import android.media.AudioAttributes;
import android.media.AudioManager;
import android.media.Ringtone;
import android.media.RingtoneManager;
import android.net.Uri;
import android.os.Build;
import com.getcapacitor.JSObject;
import com.getcapacitor.PermissionState;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;

import io.agora.rtc2.ChannelMediaOptions;
import io.agora.rtc2.Constants;
import io.agora.rtc2.IRtcEngineEventHandler;
import io.agora.rtc2.RtcEngine;
import io.agora.rtc2.RtcEngineConfig;

// Plugin Agora Voice — audio sepenuhnya dikelola oleh Agora SDK (native),
// tidak menggunakan WebView getUserMedia sehingga bebas dari OperationError.
@CapacitorPlugin(
    name = "AgoraVoice",
    permissions = {
        @Permission(strings = { Manifest.permission.RECORD_AUDIO }, alias = "microphone")
    }
)
public class AgoraVoicePlugin extends Plugin {

    private RtcEngine rtcEngine = null;
    private Ringtone callRingtone = null;

    @PluginMethod
    public void initialize(PluginCall call) {
        if (rtcEngine != null) {
            JSObject ret = new JSObject();
            ret.put("success", true);
            call.resolve(ret);
            return;
        }
        String appId = call.getString("appId", "");
        if (appId.isEmpty()) {
            call.reject("appId wajib diisi");
            return;
        }
        try {
            RtcEngineConfig cfg = new RtcEngineConfig();
            cfg.mContext      = getContext();
            cfg.mAppId        = appId;
            cfg.mEventHandler = eventHandler;
            rtcEngine = RtcEngine.create(cfg);
            rtcEngine.enableAudio();
            // Default ke earpiece (seperti telepon biasa)
            rtcEngine.setDefaultAudioRoutetoSpeakerphone(false);
            JSObject ret = new JSObject();
            ret.put("success", true);
            call.resolve(ret);
        } catch (Exception e) {
            call.reject("Agora init gagal: " + e.getMessage());
        }
    }

    @PluginMethod
    public void joinChannel(PluginCall call) {
        if (rtcEngine == null) {
            call.reject("Agora belum di-initialize");
            return;
        }
        if (getPermissionState("microphone") != PermissionState.GRANTED) {
            requestPermissionForAlias("microphone", call, "afterMicPermission");
            return;
        }
        doJoin(call);
    }

    @PermissionCallback
    private void afterMicPermission(PluginCall call) {
        if (getPermissionState("microphone") == PermissionState.GRANTED) {
            doJoin(call);
        } else {
            call.reject("Izin mikrofon ditolak");
        }
    }

    private void doJoin(PluginCall call) {
        String token       = call.getString("token");   // null = testing mode
        String channelName = call.getString("channelName", "");
        int    uid         = call.getInt("uid", 0);

        ChannelMediaOptions opts = new ChannelMediaOptions();
        opts.channelProfile         = Constants.CHANNEL_PROFILE_COMMUNICATION;
        opts.clientRoleType         = Constants.CLIENT_ROLE_BROADCASTER;
        opts.publishMicrophoneTrack = true;
        opts.autoSubscribeAudio     = true;

        int ret = rtcEngine.joinChannel(token, channelName, uid, opts);
        if (ret != 0) {
            call.reject("joinChannel error: " + ret);
        } else {
            JSObject result = new JSObject();
            result.put("success", true);
            call.resolve(result);
        }
    }

    @PluginMethod
    public void leaveChannel(PluginCall call) {
        if (rtcEngine != null) rtcEngine.leaveChannel();
        JSObject r = new JSObject();
        r.put("success", true);
        call.resolve(r);
    }

    @PluginMethod
    public void muteLocalAudio(PluginCall call) {
        boolean mute = Boolean.TRUE.equals(call.getBoolean("mute"));
        if (rtcEngine != null) rtcEngine.muteLocalAudioStream(mute);
        JSObject r = new JSObject();
        r.put("success", true);
        call.resolve(r);
    }

    @PluginMethod
    public void renewToken(PluginCall call) {
        String token = call.getString("token", "");
        if (rtcEngine != null && !token.isEmpty()) rtcEngine.renewToken(token);
        JSObject r = new JSObject();
        r.put("success", true);
        call.resolve(r);
    }

    @PluginMethod
    public void setSpeaker(PluginCall call) {
        boolean speaker = Boolean.TRUE.equals(call.getBoolean("speaker"));
        if (rtcEngine != null) rtcEngine.setEnableSpeakerphone(speaker);
        JSObject r = new JSObject();
        r.put("success", true);
        call.resolve(r);
    }

    // Simpan base URL dan token API agar IncomingCallActivity bisa kirim sinyal decline
    @PluginMethod
    public void setCallConfig(PluginCall call) {
        String baseUrl = call.getString("baseUrl", "");
        String token   = call.getString("token", "");
        getContext().getSharedPreferences("zasaqu_call", android.content.Context.MODE_PRIVATE)
            .edit()
            .putString("api_base_url", baseUrl)
            .putString("api_token",    token)
            .apply();
        JSObject r = new JSObject();
        r.put("success", true);
        call.resolve(r);
    }

    // Baca pending call dari IncomingCallActivity (setelah user tap Angkat dari notif)
    @PluginMethod
    public void getPendingCall(PluginCall call) {
        SharedPreferences prefs = getContext().getSharedPreferences("zasaqu_call", android.content.Context.MODE_PRIVATE);
        String orderId    = prefs.getString("pending_order_id",    null);
        String orderType  = prefs.getString("pending_order_type",  null);
        boolean autoAnswer = prefs.getBoolean("pending_auto_answer", false);

        String callerName = prefs.getString("pending_caller_name", null);

        JSObject r = new JSObject();
        if (orderId != null) {
            r.put("orderId",    orderId);
            r.put("orderType",  orderType);
            r.put("autoAnswer", autoAnswer);
            if (callerName != null && !callerName.isEmpty()) r.put("callerName", callerName);
            // Hapus agar tidak terbaca dua kali
            prefs.edit()
                .remove("pending_order_id")
                .remove("pending_order_type")
                .remove("pending_caller_name")
                .remove("pending_auto_answer")
                .apply();
        }
        call.resolve(r);
    }

    private final IRtcEngineEventHandler eventHandler = new IRtcEngineEventHandler() {
        @Override
        public void onJoinChannelSuccess(String channel, int uid, int elapsed) {
            JSObject d = new JSObject();
            d.put("uid", uid);
            notifyListeners("joinSuccess", d);
        }

        @Override
        public void onUserJoined(int uid, int elapsed) {
            JSObject d = new JSObject();
            d.put("uid", uid);
            notifyListeners("userJoined", d);
        }

        @Override
        public void onUserOffline(int uid, int reason) {
            JSObject d = new JSObject();
            d.put("uid", uid);
            notifyListeners("userOffline", d);
        }

        @Override
        public void onTokenPrivilegeWillExpire(String token) {
            notifyListeners("tokenWillExpire", new JSObject());
        }

        @Override
        public void onRequestToken() {
            notifyListeners("tokenExpired", new JSObject());
        }

        @Override
        public void onError(int err) {
            JSObject d = new JSObject();
            d.put("code", err);
            notifyListeners("agoraError", d);
        }
    };

    // Cooldown agar tidak double-bunyi saat pesan masuk berturutan cepat
    private long lastNotifChatTime = 0;

    @PluginMethod
    public void playNotifChat(PluginCall call) {
        long now = System.currentTimeMillis();
        if (now - lastNotifChatTime < 1000) {
            call.resolve(new JSObject());
            return;
        }
        lastNotifChatTime = now;
        try {
            Uri uri = Uri.parse("android.resource://" + getContext().getPackageName() + "/raw/notif_chat");
            Ringtone r = RingtoneManager.getRingtone(getContext(), uri);
            if (r != null) {
                r.setAudioAttributes(new AudioAttributes.Builder()
                    .setUsage(AudioAttributes.USAGE_NOTIFICATION)
                    .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                    .build());
                r.play();
            }
        } catch (Exception ignored) {}
        call.resolve(new JSObject());
    }

    @PluginMethod
    public void playRingtone(PluginCall call) {
        try {
            stopCallRingtone();
            AudioManager am = (AudioManager) getContext().getSystemService(android.content.Context.AUDIO_SERVICE);
            if (am != null) {
                int max = am.getStreamMaxVolume(AudioManager.STREAM_RING);
                am.setStreamVolume(AudioManager.STREAM_RING, max, 0);
            }
            Uri uri = Uri.parse("android.resource://" + getContext().getPackageName() + "/raw/ringtone_call");
            callRingtone = RingtoneManager.getRingtone(getContext(), uri);
            if (callRingtone != null) {
                callRingtone.setAudioAttributes(new AudioAttributes.Builder()
                    .setUsage(AudioAttributes.USAGE_NOTIFICATION_RINGTONE)
                    .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                    .build());
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
                    callRingtone.setLooping(true);
                }
                callRingtone.play();
            }
        } catch (Exception ignored) {}
        JSObject r = new JSObject();
        r.put("success", true);
        call.resolve(r);
    }

    @PluginMethod
    public void stopRingtone(PluginCall call) {
        stopCallRingtone();
        JSObject r = new JSObject();
        r.put("success", true);
        call.resolve(r);
    }

    private void stopCallRingtone() {
        try {
            if (callRingtone != null && callRingtone.isPlaying()) callRingtone.stop();
        } catch (Exception ignored) {}
        callRingtone = null;
    }

    @Override
    protected void handleOnDestroy() {
        stopCallRingtone();
        if (rtcEngine != null) {
            rtcEngine.leaveChannel();
            RtcEngine.destroy();
            rtcEngine = null;
        }
    }
}
