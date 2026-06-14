package com.zasaqu.app;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Intent;
import android.graphics.Color;
import android.graphics.PixelFormat;
import android.graphics.Typeface;
import android.os.Build;
import android.os.IBinder;
import android.util.DisplayMetrics;
import android.view.Gravity;
import android.view.MotionEvent;
import android.view.View;
import android.view.WindowManager;
import android.widget.FrameLayout;
import android.widget.TextView;

import androidx.core.app.NotificationCompat;

public class FloatingBubbleService extends Service {

    private static final String CHANNEL_ID = "bubble_channel";
    private static final int NOTIF_ID      = 42;

    private WindowManager   windowManager;
    private View            bubbleView;
    private String          currentRoute = "/";

    @Override
    public IBinder onBind(Intent intent) { return null; }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        if (intent == null) return START_STICKY;
        String action = intent.getAction();
        if (action == null) action = "SHOW";

        switch (action) {
            case "SHOW":
                createOrUpdate(intent);
                break;
            case "UPDATE":
                createOrUpdate(intent);
                break;
            case "DISMISS":
                removeBubble();
                stopSelf();
                break;
        }
        return START_STICKY;
    }

    private void createOrUpdate(Intent intent) {
        String emoji = intent.getStringExtra("emoji");
        String label = intent.getStringExtra("label");
        currentRoute  = intent.getStringExtra("route");
        if (emoji == null) emoji = "📦";
        if (label == null) label = "";
        if (currentRoute == null) currentRoute = "/";

        if (bubbleView == null) {
            startForeground(NOTIF_ID, buildNotification());
            showBubble(emoji, label);
        } else {
            updateText(emoji, label);
        }
    }

    private void showBubble(String emoji, String label) {
        windowManager = (WindowManager) getSystemService(WINDOW_SERVICE);

        // Ukuran bubble
        DisplayMetrics dm = getResources().getDisplayMetrics();
        int size = (int) (64 * dm.density);

        // Container
        FrameLayout container = new FrameLayout(this);
        container.setId(View.generateViewId());

        // Lingkaran hijau
        View circle = new View(this);
        circle.setBackgroundDrawable(makeCircle(Color.parseColor("#00C896")));
        FrameLayout.LayoutParams circleParams = new FrameLayout.LayoutParams(size, size);
        container.addView(circle, circleParams);

        // Teks emoji
        TextView tv = new TextView(this);
        tv.setTag("label");
        tv.setText(emoji);
        tv.setTextSize(26);
        tv.setGravity(Gravity.CENTER);
        tv.setTypeface(Typeface.DEFAULT_BOLD);
        FrameLayout.LayoutParams tvParams = new FrameLayout.LayoutParams(size, size);
        tvParams.gravity = Gravity.CENTER;
        container.addView(tv, tvParams);

        bubbleView = container;

        // WindowManager params
        int type = Build.VERSION.SDK_INT >= Build.VERSION_CODES.O
            ? WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY
            : WindowManager.LayoutParams.TYPE_PHONE;

        WindowManager.LayoutParams params = new WindowManager.LayoutParams(
            size, size, type,
            WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE
                | WindowManager.LayoutParams.FLAG_LAYOUT_NO_LIMITS,
            PixelFormat.TRANSLUCENT
        );
        params.gravity = Gravity.TOP | Gravity.START;
        params.x = dm.widthPixels - size - 16;
        params.y = (int) (200 * dm.density);

        windowManager.addView(bubbleView, params);

        // Touch: drag + tap
        final int[] startX = {0};
        final int[] startY = {0};
        final int[] iniX   = {0};
        final int[] iniY   = {0};
        final boolean[] moved = {false};

        bubbleView.setOnTouchListener((v, event) -> {
            WindowManager.LayoutParams lp = (WindowManager.LayoutParams) bubbleView.getLayoutParams();
            switch (event.getAction()) {
                case MotionEvent.ACTION_DOWN:
                    startX[0] = (int) event.getRawX();
                    startY[0] = (int) event.getRawY();
                    iniX[0]   = lp.x;
                    iniY[0]   = lp.y;
                    moved[0]  = false;
                    break;
                case MotionEvent.ACTION_MOVE:
                    int dx = (int) event.getRawX() - startX[0];
                    int dy = (int) event.getRawY() - startY[0];
                    if (Math.abs(dx) > 8 || Math.abs(dy) > 8) moved[0] = true;
                    lp.x = iniX[0] + dx;
                    lp.y = iniY[0] + dy;
                    windowManager.updateViewLayout(bubbleView, lp);
                    break;
                case MotionEvent.ACTION_UP:
                    if (!moved[0]) openApp();
                    break;
            }
            return true;
        });
    }

    private void updateText(String emoji, String label) {
        if (bubbleView == null) return;
        TextView tv = bubbleView.findViewWithTag("label");
        if (tv != null) tv.setText(emoji);
    }

    private void openApp() {
        Intent i = new Intent(this, MainActivity.class);
        i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_REORDER_TO_FRONT);
        i.putExtra("bubble_route", currentRoute);
        startActivity(i);
    }

    private void removeBubble() {
        if (windowManager != null && bubbleView != null) {
            try { windowManager.removeView(bubbleView); } catch (Exception ignored) {}
            bubbleView = null;
        }
    }

    @Override
    public void onDestroy() {
        super.onDestroy();
        removeBubble();
    }

    // ── Helpers ──────────────────────────────────────────────────────────────

    private android.graphics.drawable.ShapeDrawable makeCircle(int color) {
        android.graphics.drawable.ShapeDrawable d =
            new android.graphics.drawable.ShapeDrawable(new android.graphics.drawable.shapes.OvalShape());
        d.getPaint().setColor(color);
        d.getPaint().setAntiAlias(true);
        return d;
    }

    private Notification buildNotification() {
        NotificationManager nm = (NotificationManager) getSystemService(NOTIFICATION_SERVICE);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel ch = new NotificationChannel(
                CHANNEL_ID, "ZasaQu Aktif", NotificationManager.IMPORTANCE_MIN);
            ch.setShowBadge(false);
            nm.createNotificationChannel(ch);
        }

        Intent openIntent = new Intent(this, MainActivity.class);
        openIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_REORDER_TO_FRONT);
        PendingIntent pi = PendingIntent.getActivity(this, 0, openIntent,
            PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT);

        return new NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle("ZasaQu aktif")
            .setContentText("Ada order sedang berjalan")
            .setSmallIcon(android.R.drawable.ic_dialog_info)
            .setContentIntent(pi)
            .setPriority(NotificationCompat.PRIORITY_MIN)
            .setSilent(true)
            .build();
    }
}
