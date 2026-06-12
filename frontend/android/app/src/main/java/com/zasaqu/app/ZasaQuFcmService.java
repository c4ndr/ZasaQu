package com.zasaqu.app;

import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Intent;
import android.os.Build;

import androidx.annotation.NonNull;
import androidx.core.app.NotificationCompat;
import androidx.core.app.NotificationManagerCompat;

import com.google.firebase.messaging.FirebaseMessagingService;
import com.google.firebase.messaging.RemoteMessage;

import java.util.Map;

/**
 * Custom FCM service — intercept incoming_call untuk tampilan layar penuh.
 * Semua pesan lain diteruskan ke Capacitor via reflection.
 */
public class ZasaQuFcmService extends FirebaseMessagingService {

    static final String CHANNEL_CALLS = "zasaqu_incoming_calls";
    static final int    NOTIF_ID_CALL = 9901;

    @Override
    public void onMessageReceived(@NonNull RemoteMessage remoteMessage) {
        Map<String, String> data = remoteMessage.getData();

        if ("incoming_call".equals(data.get("type"))) {
            String orderId    = data.containsKey("order_id")    ? data.get("order_id")    : "";
            String orderType  = data.containsKey("order_type")  ? data.get("order_type")  : "zasago";
            String callerName = data.containsKey("caller_name") ? data.get("caller_name") : "Pengguna ZasaQu";

            // Simpan agar tap notif biasa (bukan full-screen) juga bisa membuka call
            getSharedPreferences("zasaqu_call", MODE_PRIVATE).edit()
                .putString("notif_order_id",    orderId)
                .putString("notif_order_type",  orderType)
                .putString("notif_caller_name", callerName)
                .apply();

            createCallChannel();
            showFullScreenCallNotification(orderId, orderType, callerName);
        } else {
            // Teruskan ke Capacitor PushNotificationsPlugin via reflection
            forwardToCapacitor(remoteMessage);
        }
    }

    @Override
    public void onNewToken(@NonNull String token) {
        super.onNewToken(token);
        // Teruskan ke Capacitor via reflection agar JS registration event tetap muncul
        try {
            Class.forName("com.capacitorjs.plugins.pushnotifications.PushNotificationsPlugin")
                .getMethod("onNewToken", String.class)
                .invoke(null, token);
        } catch (Exception ignored) {}
    }

    private void forwardToCapacitor(RemoteMessage remoteMessage) {
        try {
            Class.forName("com.capacitorjs.plugins.pushnotifications.PushNotificationsPlugin")
                .getMethod("sendRemoteMessage", RemoteMessage.class)
                .invoke(null, remoteMessage);
        } catch (Exception ignored) {
            // Jika Capacitor tidak tersedia, tampilkan notif biasa dari notification payload
            RemoteMessage.Notification notif = remoteMessage.getNotification();
            if (notif != null) showSimpleNotification(notif.getTitle(), notif.getBody());
        }
    }

    // ─── Full-screen incoming call ────────────────────────────────────────────

    private void createCallChannel() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return;
        NotificationManager nm = getSystemService(NotificationManager.class);
        if (nm == null || nm.getNotificationChannel(CHANNEL_CALLS) != null) return;

        NotificationChannel ch = new NotificationChannel(
            CHANNEL_CALLS, "Panggilan Masuk", NotificationManager.IMPORTANCE_HIGH);
        ch.setDescription("Notifikasi panggilan suara masuk ZasaQu");
        ch.enableVibration(true);
        ch.setVibrationPattern(new long[]{0, 800, 400, 800, 400, 800});
        nm.createNotificationChannel(ch);
    }

    private void showFullScreenCallNotification(String orderId, String orderType, String callerName) {
        int piFlags = PendingIntent.FLAG_UPDATE_CURRENT
            | (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M ? PendingIntent.FLAG_IMMUTABLE : 0);

        // Full-screen intent → IncomingCallActivity
        Intent callIntent = new Intent(this, IncomingCallActivity.class);
        callIntent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        callIntent.putExtra("order_id",    orderId);
        callIntent.putExtra("order_type",  orderType);
        callIntent.putExtra("caller_name", callerName);
        PendingIntent fullScreenPi = PendingIntent.getActivity(this, 0, callIntent, piFlags);

        // Tap badan notif → MainActivity
        Intent tapIntent = new Intent(this, MainActivity.class);
        tapIntent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        PendingIntent tapPi = PendingIntent.getActivity(this, 1, tapIntent, piFlags);

        NotificationCompat.Builder nb = new NotificationCompat.Builder(this, CHANNEL_CALLS)
            .setSmallIcon(android.R.drawable.ic_menu_call)
            .setContentTitle("📞 Panggilan Masuk")
            .setContentText(callerName + " sedang menghubungi Anda")
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setCategory(NotificationCompat.CATEGORY_CALL)
            .setFullScreenIntent(fullScreenPi, true)
            .setContentIntent(tapPi)
            .setAutoCancel(false)
            .setOngoing(true)
            .setTimeoutAfter(50_000);

        try {
            NotificationManagerCompat.from(this).notify(NOTIF_ID_CALL, nb.build());
        } catch (SecurityException ignored) {}

        // Langsung start IncomingCallActivity lewat startActivity() sebagai jalur kedua.
        // Diperlukan saat app sedang foreground — Android menekan fullScreenIntent untuk app aktif
        // dan hanya menampilkan heads-up banner sekilas.
        // Ketika app foreground: startActivity() berhasil (ada visible window).
        // Ketika app background/killed di Android 12+: kemungkinan diblokir, tapi fullScreenIntent
        // di atas sudah menanganinya. Silent fail dengan catch.
        try {
            startActivity(callIntent);
        } catch (Exception ignored) {}
    }

    private void showSimpleNotification(String title, String body) {
        if (title == null && body == null) return;
        NotificationCompat.Builder nb = new NotificationCompat.Builder(this, "zasaqu_general")
            .setSmallIcon(android.R.drawable.ic_dialog_info)
            .setContentTitle(title != null ? title : "ZasaQu")
            .setContentText(body)
            .setPriority(NotificationCompat.PRIORITY_DEFAULT)
            .setAutoCancel(true);
        try {
            NotificationManagerCompat.from(this).notify((int) System.currentTimeMillis(), nb.build());
        } catch (SecurityException ignored) {}
    }
}
