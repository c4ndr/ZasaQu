package com.zasaqu.com;

import android.app.KeyguardManager;
import android.content.SharedPreferences;
import android.content.Context;
import android.graphics.Color;
import android.media.AudioAttributes;
import android.media.AudioManager;
import android.media.Ringtone;
import android.media.RingtoneManager;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.os.VibrationEffect;
import android.os.Vibrator;
import android.os.VibratorManager;
import android.view.Gravity;
import android.view.View;
import android.view.Window;
import android.view.WindowManager;
import android.widget.FrameLayout;
import android.widget.LinearLayout;
import android.widget.TextView;
import android.content.Intent;
import android.app.NotificationManager;

import androidx.appcompat.app.AppCompatActivity;

/**
 * Layar panggilan masuk — muncul di atas lock screen, mirip WhatsApp.
 * Dimunculkan oleh ZasaQuFcmService via fullScreenIntent.
 */
public class IncomingCallActivity extends AppCompatActivity {

    private Ringtone ringtone;
    private Vibrator vibrator;
    private final Handler handler = new Handler(Looper.getMainLooper());
    private static final int TIMEOUT_MS = 45_000;

    private String orderId;
    private String orderType;
    private String callerNamePref;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        requestWindowFeature(Window.FEATURE_NO_TITLE);

        // Tampilkan di atas lock screen dan nyalakan layar
        Window win = getWindow();
        win.addFlags(
            WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED  |
            WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON    |
            WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON    |
            WindowManager.LayoutParams.FLAG_DISMISS_KEYGUARD
        );
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O_MR1) {
            setShowWhenLocked(true);
            setTurnScreenOn(true);
            KeyguardManager km = (KeyguardManager) getSystemService(KEYGUARD_SERVICE);
            if (km != null) km.requestDismissKeyguard(this, null);
        }

        orderId        = getIntent().getStringExtra("order_id");
        orderType      = getIntent().getStringExtra("order_type");
        String callerName = getIntent().getStringExtra("caller_name");
        if (callerName == null || callerName.isEmpty()) callerName = "Pengguna ZasaQu";
        callerNamePref = callerName;

        // Batalkan notifikasi segera agar suara notification channel tidak overlap
        // dengan ringtone yang akan diputar oleh Activity ini.
        cancelCallNotification();

        buildUI(callerName);
        startRingtone();
        startVibration();

        // Auto-dismiss setelah timeout
        handler.postDelayed(this::dismiss, TIMEOUT_MS);
    }

    // ─── UI ─────────────────────────────────────────────────────────────────────

    private void buildUI(String callerName) {
        FrameLayout root = new FrameLayout(this);
        root.setBackgroundColor(0xFF0A0A1E);

        LinearLayout col = new LinearLayout(this);
        col.setOrientation(LinearLayout.VERTICAL);
        col.setGravity(Gravity.CENTER);
        col.setPadding(dp(32), dp(80), dp(32), dp(60));

        // Ikon telepon
        TextView icon = new TextView(this);
        icon.setText("📲");
        icon.setTextSize(72);
        icon.setGravity(Gravity.CENTER);
        LinearLayout.LayoutParams iconLp = new LinearLayout.LayoutParams(dp(120), dp(120));
        iconLp.gravity = Gravity.CENTER_HORIZONTAL;
        iconLp.bottomMargin = dp(24);
        col.addView(icon, iconLp);

        // Label
        TextView label = new TextView(this);
        label.setText("Panggilan Masuk");
        label.setTextSize(14);
        label.setTextColor(0x99FFFFFF);
        label.setGravity(Gravity.CENTER);
        LinearLayout.LayoutParams labelLp = new LinearLayout.LayoutParams(
            LinearLayout.LayoutParams.WRAP_CONTENT, LinearLayout.LayoutParams.WRAP_CONTENT);
        labelLp.gravity = Gravity.CENTER_HORIZONTAL;
        labelLp.bottomMargin = dp(8);
        col.addView(label, labelLp);

        // Nama pemanggil
        TextView nameView = new TextView(this);
        nameView.setText(callerName);
        nameView.setTextSize(26);
        nameView.setTextColor(Color.WHITE);
        nameView.setTypeface(android.graphics.Typeface.DEFAULT_BOLD);
        nameView.setGravity(Gravity.CENTER);
        LinearLayout.LayoutParams nameLp = new LinearLayout.LayoutParams(
            LinearLayout.LayoutParams.WRAP_CONTENT, LinearLayout.LayoutParams.WRAP_CONTENT);
        nameLp.gravity = Gravity.CENTER_HORIZONTAL;
        nameLp.bottomMargin = dp(64);
        col.addView(nameView, nameLp);

        // Tombol
        LinearLayout row = new LinearLayout(this);
        row.setOrientation(LinearLayout.HORIZONTAL);
        row.setGravity(Gravity.CENTER);

        TextView btnDecline = makeBtn("📵", 0xFFDC2626, "Tolak");
        btnDecline.setOnClickListener(v -> decline());
        LinearLayout.LayoutParams btnLp = new LinearLayout.LayoutParams(dp(90), dp(90));
        btnLp.rightMargin = dp(40);
        row.addView(btnDecline, btnLp);

        TextView btnAnswer = makeBtn("📞", 0xFF16A34A, "Angkat");
        btnAnswer.setOnClickListener(v -> answer());
        row.addView(btnAnswer, new LinearLayout.LayoutParams(dp(90), dp(90)));

        col.addView(row);
        root.addView(col);
        setContentView(root);
    }

    private TextView makeBtn(String emoji, int bgColor, String label) {
        LinearLayout wrap = new LinearLayout(this);
        // We return a single TextView styled as circular button for simplicity
        TextView btn = new TextView(this);
        btn.setText(emoji);
        btn.setTextSize(32);
        btn.setGravity(Gravity.CENTER);
        btn.setBackgroundColor(bgColor);
        // Make circular via clipToOutline is complex; use simple rounded bg
        android.graphics.drawable.GradientDrawable shape = new android.graphics.drawable.GradientDrawable();
        shape.setShape(android.graphics.drawable.GradientDrawable.OVAL);
        shape.setColor(bgColor);
        btn.setBackground(shape);
        return btn;
    }

    // ─── Actions ─────────────────────────────────────────────────────────────────

    private void answer() {
        stopRingtoneAndVibration();
        // Simpan pending call agar AgoraVoicePlugin.getPendingCall() bisa membacanya
        getSharedPreferences("zasaqu_call", MODE_PRIVATE).edit()
            .putString("pending_order_id",    orderId)
            .putString("pending_order_type",  orderType)
            .putString("pending_caller_name", callerNamePref)
            .putBoolean("pending_auto_answer", true)
            .apply();

        // Buka MainActivity
        Intent intent = new Intent(this, MainActivity.class);
        intent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        startActivity(intent);
        cancelCallNotification();
        finish();
    }

    private void decline() {
        stopRingtoneAndVibration();
        // Kirim sinyal end via HTTP di background thread menggunakan token tersimpan
        final String apiBase  = getSharedPreferences("zasaqu_call", MODE_PRIVATE)
            .getString("api_base_url", "");
        final String apiToken = getSharedPreferences("zasaqu_call", MODE_PRIVATE)
            .getString("api_token", "");
        if (!apiBase.isEmpty() && !apiToken.isEmpty()) {
            final String oId  = orderId;
            final String oTyp = orderType;
            new Thread(() -> {
                try {
                    java.net.URL url = new java.net.URL(apiBase + "/call/signal");
                    java.net.HttpURLConnection conn = (java.net.HttpURLConnection) url.openConnection();
                    conn.setRequestMethod("POST");
                    conn.setRequestProperty("Content-Type", "application/json");
                    conn.setRequestProperty("Authorization", "Bearer " + apiToken);
                    conn.setRequestProperty("Accept", "application/json");
                    conn.setDoOutput(true);
                    String body = "{\"order_id\":" + oId + ",\"order_type\":\"" + oTyp + "\",\"signal_type\":\"end\",\"data\":null}";
                    conn.getOutputStream().write(body.getBytes("UTF-8"));
                    conn.getResponseCode();
                    conn.disconnect();
                } catch (Exception ignored) {}
            }).start();
        }
        cancelCallNotification();
        finish();
    }

    private void dismiss() {
        stopRingtoneAndVibration();
        cancelCallNotification();
        if (!isFinishing()) finish();
    }

    // ─── Ringtone & Vibration ────────────────────────────────────────────────────

    private void startRingtone() {
        try {
            AudioManager am = (AudioManager) getSystemService(AUDIO_SERVICE);
            if (am != null) {
                int max = am.getStreamMaxVolume(AudioManager.STREAM_RING);
                am.setStreamVolume(AudioManager.STREAM_RING, max, 0);
            }
            // Pakai file ringtone kustom supaya tidak overlap dengan default system ringtone
            Uri uri = Uri.parse("android.resource://" + getPackageName() + "/raw/ringtone_call");
            ringtone = RingtoneManager.getRingtone(this, uri);
            if (ringtone != null) {
                ringtone.setAudioAttributes(new AudioAttributes.Builder()
                    .setUsage(AudioAttributes.USAGE_NOTIFICATION_RINGTONE)
                    .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                    .build());
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
                    ringtone.setLooping(true);
                }
                ringtone.play();
            }
        } catch (Exception ignored) {}
    }

    @SuppressWarnings("deprecation")
    private void startVibration() {
        try {
            long[] pattern = {0, 800, 400, 800, 400, 800, 1000};
            int repeat = 0;
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                VibratorManager vm = (VibratorManager) getSystemService(VIBRATOR_MANAGER_SERVICE);
                if (vm != null) {
                    vibrator = vm.getDefaultVibrator();
                }
            } else {
                vibrator = (Vibrator) getSystemService(VIBRATOR_SERVICE);
            }
            if (vibrator != null) {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                    vibrator.vibrate(VibrationEffect.createWaveform(pattern, repeat));
                } else {
                    vibrator.vibrate(pattern, repeat);
                }
            }
        } catch (Exception ignored) {}
    }

    private void stopRingtoneAndVibration() {
        try { if (ringtone != null && ringtone.isPlaying()) ringtone.stop(); } catch (Exception ignored) {}
        try { if (vibrator != null) vibrator.cancel(); } catch (Exception ignored) {}
    }

    private void cancelCallNotification() {
        try {
            NotificationManager nm = (NotificationManager) getSystemService(NOTIFICATION_SERVICE);
            if (nm != null) nm.cancel(ZasaQuFcmService.NOTIF_ID_CALL);
        } catch (Exception ignored) {}
    }

    private int dp(int dp) {
        return Math.round(dp * getResources().getDisplayMetrics().density);
    }

    @Override
    protected void onDestroy() {
        handler.removeCallbacksAndMessages(null);
        stopRingtoneAndVibration();
        super.onDestroy();
    }
}
