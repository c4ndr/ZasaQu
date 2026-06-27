package com.zasaqu.com;

import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Intent;
import android.media.AudioAttributes;
import android.net.Uri;
import android.os.Build;

import androidx.annotation.NonNull;
import androidx.core.app.NotificationCompat;
import androidx.core.app.NotificationManagerCompat;

import com.google.firebase.messaging.FirebaseMessagingService;
import com.google.firebase.messaging.RemoteMessage;

import java.util.Map;

/**
 * Custom FCM service — intercept incoming_call untuk tampilan layar penuh,
 * chat_message / serv_consultation untuk suara chat kustom,
 * dan wallet_credit / wallet_debit untuk suara saldo kustom.
 */
public class ZasaQuFcmService extends FirebaseMessagingService {

    // v2: channel tanpa suara — IncomingCallActivity yang handle audio sepenuhnya
    static final String CHANNEL_CALLS   = "zasaqu_incoming_calls_v2";
    static final String CHANNEL_CHAT    = "zasaqu_chat";
    static final String CHANNEL_WALLET  = "zasaqu_wallet";
    static final String CHANNEL_GENERAL = "zasaqu_general";
    static final int    NOTIF_ID_CALL   = 9901;

    @Override
    public void onMessageReceived(@NonNull RemoteMessage remoteMessage) {
        Map<String, String> data = remoteMessage.getData();

        String type = data.get("type");

        if ("incoming_call".equals(type)) {
            String orderId    = data.containsKey("order_id")    ? data.get("order_id")    : "";
            String orderType  = data.containsKey("order_type")  ? data.get("order_type")  : "zasago";
            String callerName = data.containsKey("caller_name") ? data.get("caller_name") : "Pengguna ZasaQu";

            getSharedPreferences("zasaqu_call", MODE_PRIVATE).edit()
                .putString("notif_order_id",    orderId)
                .putString("notif_order_type",  orderType)
                .putString("notif_caller_name", callerName)
                .apply();

            createCallChannel();
            showFullScreenCallNotification(orderId, orderType, callerName);

        } else if ("wallet_credit".equals(type) || "wallet_debit".equals(type)) {
            createWalletChannel();
            RemoteMessage.Notification notif = remoteMessage.getNotification();
            String title = notif != null ? notif.getTitle() : ("wallet_credit".equals(type) ? "💰 Saldo Masuk" : "💸 Saldo Berkurang");
            String body  = notif != null ? notif.getBody()  : data.getOrDefault("body", "Ada perubahan saldo dompetmu.");
            if (title == null) title = data.getOrDefault("title", "wallet_credit".equals(type) ? "💰 Saldo Masuk" : "💸 Saldo Berkurang");
            if (body  == null) body  = data.getOrDefault("body", "Ada perubahan saldo dompetmu.");
            showWalletNotification(title, body);

        } else if ("chat_message".equals(type) || "serv_consultation".equals(type) || "serv_consultation_reply".equals(type)) {
            // Notifikasi pesan chat — gunakan suara kustom
            createChatChannel();
            RemoteMessage.Notification notif = remoteMessage.getNotification();
            String title = notif != null ? notif.getTitle() : "💬 Pesan Baru";
            String body  = notif != null ? notif.getBody()  : "Ada pesan baru dari ZasaQu";
            // Fallback ke data payload jika notification payload kosong (data-only FCM)
            if (title == null) title = data.containsKey("title") ? data.get("title") : "💬 Pesan Baru";
            if (body  == null) body  = data.containsKey("body")  ? data.get("body")  : "Ada pesan baru dari ZasaQu";
            showChatNotification(title, body);

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

    // ─── Chat notification dengan suara kustom ───────────────────────────────

    private void createChatChannel() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return;
        NotificationManager nm = getSystemService(NotificationManager.class);
        if (nm == null || nm.getNotificationChannel(CHANNEL_CHAT) != null) return;

        Uri soundUri = Uri.parse(
            "android.resource://" + getPackageName() + "/raw/notif_chat"
        );

        AudioAttributes audioAttr = new AudioAttributes.Builder()
            .setUsage(AudioAttributes.USAGE_NOTIFICATION)
            .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
            .build();

        NotificationChannel ch = new NotificationChannel(
            CHANNEL_CHAT, "Pesan Chat", NotificationManager.IMPORTANCE_HIGH);
        ch.setDescription("Notifikasi pesan chat ZasaQu");
        ch.setSound(soundUri, audioAttr);
        ch.enableVibration(true);
        ch.setVibrationPattern(new long[]{0, 250, 100, 250});
        nm.createNotificationChannel(ch);
    }

    private void showChatNotification(String title, String body) {
        int piFlags = PendingIntent.FLAG_UPDATE_CURRENT
            | (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M ? PendingIntent.FLAG_IMMUTABLE : 0);

        Intent tapIntent = new Intent(this, MainActivity.class);
        tapIntent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        PendingIntent tapPi = PendingIntent.getActivity(this, 2, tapIntent, piFlags);

        // Android 7 ke bawah: set sound lewat builder (channel tidak ada)
        Uri soundUri = Uri.parse(
            "android.resource://" + getPackageName() + "/raw/notif_chat"
        );

        NotificationCompat.Builder nb = new NotificationCompat.Builder(this, CHANNEL_CHAT)
            .setSmallIcon(android.R.drawable.ic_dialog_email)
            .setContentTitle(title)
            .setContentText(body)
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setCategory(NotificationCompat.CATEGORY_MESSAGE)
            .setSound(soundUri)
            .setVibrate(new long[]{0, 250, 100, 250})
            .setContentIntent(tapPi)
            .setAutoCancel(true);

        try {
            NotificationManagerCompat.from(this).notify(
                (int) System.currentTimeMillis(), nb.build()
            );
        } catch (SecurityException ignored) {}
    }

    // ─── Wallet notification dengan suara kustom ─────────────────────────────

    private void createWalletChannel() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return;
        NotificationManager nm = getSystemService(NotificationManager.class);
        if (nm == null || nm.getNotificationChannel(CHANNEL_WALLET) != null) return;

        Uri soundUri = Uri.parse(
            "android.resource://" + getPackageName() + "/raw/notif_saldo"
        );

        AudioAttributes audioAttr = new AudioAttributes.Builder()
            .setUsage(AudioAttributes.USAGE_NOTIFICATION)
            .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
            .build();

        NotificationChannel ch = new NotificationChannel(
            CHANNEL_WALLET, "Saldo Dompet", NotificationManager.IMPORTANCE_HIGH);
        ch.setDescription("Notifikasi perubahan saldo dompet ZasaQu");
        ch.setSound(soundUri, audioAttr);
        ch.enableVibration(true);
        ch.setVibrationPattern(new long[]{0, 150, 80, 150});
        nm.createNotificationChannel(ch);
    }

    private void showWalletNotification(String title, String body) {
        int piFlags = PendingIntent.FLAG_UPDATE_CURRENT
            | (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M ? PendingIntent.FLAG_IMMUTABLE : 0);

        Intent tapIntent = new Intent(this, MainActivity.class);
        tapIntent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        PendingIntent tapPi = PendingIntent.getActivity(this, 3, tapIntent, piFlags);

        Uri soundUri = Uri.parse(
            "android.resource://" + getPackageName() + "/raw/notif_saldo"
        );

        NotificationCompat.Builder nb = new NotificationCompat.Builder(this, CHANNEL_WALLET)
            .setSmallIcon(android.R.drawable.ic_dialog_info)
            .setContentTitle(title)
            .setContentText(body)
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setCategory(NotificationCompat.CATEGORY_STATUS)
            .setSound(soundUri)
            .setVibrate(new long[]{0, 150, 80, 150})
            .setContentIntent(tapPi)
            .setAutoCancel(true);

        try {
            NotificationManagerCompat.from(this).notify(
                (int) System.currentTimeMillis(), nb.build()
            );
        } catch (SecurityException ignored) {}
    }

    // ─── Full-screen incoming call ────────────────────────────────────────────

    private void createCallChannel() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return;
        NotificationManager nm = getSystemService(NotificationManager.class);
        if (nm == null || nm.getNotificationChannel(CHANNEL_CALLS) != null) return;

        // Tidak ada suara di channel — IncomingCallActivity yang handle audio sepenuhnya
        // agar tidak tumpang tindih dengan ringtone yang diputar Activity.
        NotificationChannel ch = new NotificationChannel(
            CHANNEL_CALLS, "Panggilan Masuk", NotificationManager.IMPORTANCE_HIGH);
        ch.setDescription("Notifikasi panggilan suara masuk ZasaQu");
        ch.setSound(null, null);
        ch.enableVibration(false);
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

        // Tidak set sound/vibrate di sini — IncomingCallActivity yang handle sepenuhnya
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

        // Saat app foreground: VoiceCallBridge (WebSocket) yang handle overlay + ringtone JS.
        // startActivity() tidak perlu — justru menyebabkan tumpang tindih audio dengan ringtone JS.
        // Saat app background/killed: fullScreenIntent di atas yang akan memunculkan IncomingCallActivity.
        if (!MainActivity.isInForeground) {
            try {
                startActivity(callIntent);
            } catch (Exception ignored) {}
        }
    }

    private void createGeneralChannel() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return;
        NotificationManager nm = getSystemService(NotificationManager.class);
        if (nm == null || nm.getNotificationChannel(CHANNEL_GENERAL) != null) return;

        Uri soundUri = Uri.parse(
            "android.resource://" + getPackageName() + "/raw/notif_umum"
        );

        AudioAttributes audioAttr = new AudioAttributes.Builder()
            .setUsage(AudioAttributes.USAGE_NOTIFICATION)
            .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
            .build();

        NotificationChannel ch = new NotificationChannel(
            CHANNEL_GENERAL, "Notifikasi Umum", NotificationManager.IMPORTANCE_DEFAULT);
        ch.setDescription("Notifikasi umum ZasaQu");
        ch.setSound(soundUri, audioAttr);
        ch.enableVibration(true);
        nm.createNotificationChannel(ch);
    }

    private void showSimpleNotification(String title, String body) {
        if (title == null && body == null) return;
        createGeneralChannel();

        Uri soundUri = Uri.parse(
            "android.resource://" + getPackageName() + "/raw/notif_umum"
        );

        NotificationCompat.Builder nb = new NotificationCompat.Builder(this, CHANNEL_GENERAL)
            .setSmallIcon(android.R.drawable.ic_dialog_info)
            .setContentTitle(title != null ? title : "ZasaQu")
            .setContentText(body)
            .setPriority(NotificationCompat.PRIORITY_DEFAULT)
            .setSound(soundUri)
            .setAutoCancel(true);
        try {
            NotificationManagerCompat.from(this).notify((int) System.currentTimeMillis(), nb.build());
        } catch (SecurityException ignored) {}
    }
}
