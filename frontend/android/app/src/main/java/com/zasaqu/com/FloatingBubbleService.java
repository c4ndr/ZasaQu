package com.zasaqu.com;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.pm.ServiceInfo;
import android.content.Intent;
import android.graphics.Color;
import android.graphics.PixelFormat;
import android.graphics.Typeface;
import android.graphics.drawable.GradientDrawable;
import android.media.Ringtone;
import android.media.RingtoneManager;
import android.net.Uri;
import android.os.Build;
import android.os.IBinder;
import android.util.DisplayMetrics;
import android.view.Gravity;
import android.view.MotionEvent;
import android.view.View;
import android.view.WindowManager;
import android.widget.FrameLayout;
import android.widget.ImageView;
import android.widget.LinearLayout;
import android.widget.TextView;

import android.util.Log;

import androidx.core.app.NotificationCompat;

public class FloatingBubbleService extends Service {

    private static final String TAG = "ZasaQuBubble";

    private static final String CHANNEL_ID = "bubble_channel";
    private static final int    NOTIF_ID   = 42;

    private WindowManager windowManager;
    private View          bubbleView;
    private View          trashZoneView;
    private TextView      badgeTextView;
    private String        currentRoute  = "/";
    private boolean       isOverTrash   = false;
    private int           unreadCount   = 0;
    private long          lastSoundTime = 0;

    private int   screenWidth;
    private int   screenHeight;
    private int   bubbleSize;
    private int   trashThreshold;
    private float density;

    // ── Lifecycle ─────────────────────────────────────────────────────────────

    @Override public IBinder onBind(Intent intent) { return null; }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        if (intent == null) return START_STICKY;
        String action = intent.getAction();
        if (action == null) action = "SHOW";
        switch (action) {
            case "SHOW":
            case "UPDATE":
                createOrUpdate(intent);
                unreadCount++;
                updateBadge();
                playNotifSound();
                break;
            case "RESET_BADGE":
                if (bubbleView == null) { stopSelf(); break; } // bubble sudah ditutup
                unreadCount = 0;
                updateBadge();
                break;
            case "DISMISS":
                removeBubble();
                stopSelf();
                break;
        }
        return START_STICKY;
    }

    @Override
    public void onDestroy() {
        super.onDestroy();
        removeBubble();
    }

    // ── Create / Update ───────────────────────────────────────────────────────

    private void createOrUpdate(Intent intent) {
        String emoji = intent.getStringExtra("emoji");
        currentRoute  = intent.getStringExtra("route");
        if (emoji == null) emoji = "💬";
        if (currentRoute == null) currentRoute = "/";

        if (bubbleView == null) {
            try {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
                    startForeground(NOTIF_ID, buildNotification(),
                        ServiceInfo.FOREGROUND_SERVICE_TYPE_SPECIAL_USE);
                } else {
                    startForeground(NOTIF_ID, buildNotification());
                }
                initMetrics();
                showBubble();
            } catch (Exception e) {
                Log.e(TAG, "createOrUpdate failed: " + e.getMessage(), e);
            }
        }
    }

    private void initMetrics() {
        DisplayMetrics dm = getResources().getDisplayMetrics();
        density        = dm.density;
        screenWidth    = dm.widthPixels;
        screenHeight   = dm.heightPixels;
        bubbleSize     = (int) (56 * density);
        trashThreshold = (int) (130 * density);
    }

    // ── Bubble — Logo ZasaQu (bubble_logo.png) ───────────────────────────────

    private void showBubble() {
        windowManager = (WindowManager) getSystemService(WINDOW_SERVICE);
        if (windowManager == null) { Log.e(TAG, "WindowManager null"); return; }
        DisplayMetrics dm = getResources().getDisplayMetrics();
        int sz    = bubbleSize;
        int pad   = (int)(14 * dm.density);        // ruang badge
        int winSz = sz + pad;

        FrameLayout root = new FrameLayout(this);

        // Layer 1: Logo ZasaQu (PNG transparan)
        ImageView logoView = new ImageView(this);
        logoView.setImageResource(R.drawable.bubble_logo);
        logoView.setScaleType(ImageView.ScaleType.FIT_CENTER);
        root.addView(logoView, new FrameLayout.LayoutParams(sz, sz));

        // Layer 3: Badge merah unread — pojok kanan atas logo
        int badgeSz = (int)(20 * dm.density);
        badgeTextView = new TextView(this);
        badgeTextView.setTextColor(Color.WHITE);
        badgeTextView.setTextSize(9);
        badgeTextView.setTypeface(Typeface.DEFAULT_BOLD);
        badgeTextView.setGravity(Gravity.CENTER);
        GradientDrawable badgeBg = new GradientDrawable();
        badgeBg.setShape(GradientDrawable.OVAL);
        badgeBg.setColor(Color.parseColor("#EF4444"));
        badgeBg.setStroke((int)(1.5f * dm.density), Color.WHITE);
        badgeTextView.setBackground(badgeBg);
        badgeTextView.setVisibility(View.GONE);
        FrameLayout.LayoutParams badgeP = new FrameLayout.LayoutParams(badgeSz, badgeSz);
        badgeP.leftMargin = sz - badgeSz / 2 - (int)(2 * dm.density);
        badgeP.topMargin  = (int)(2 * dm.density);
        root.addView(badgeTextView, badgeP);

        bubbleView = root;

        int type = Build.VERSION.SDK_INT >= Build.VERSION_CODES.O
            ? WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY
            : WindowManager.LayoutParams.TYPE_PHONE;

        WindowManager.LayoutParams lp = new WindowManager.LayoutParams(
            winSz, winSz, type,
            WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE
                | WindowManager.LayoutParams.FLAG_LAYOUT_NO_LIMITS,
            PixelFormat.TRANSLUCENT
        );
        lp.gravity = Gravity.TOP | Gravity.START;
        lp.x = screenWidth - sz - (int)(16 * dm.density);
        lp.y = (int)(200 * dm.density);

        windowManager.addView(bubbleView, lp);
        setupTouch();
    }

    // ── Badge ─────────────────────────────────────────────────────────────────

    private void updateBadge() {
        if (badgeTextView == null) return;
        if (unreadCount <= 0) {
            badgeTextView.setVisibility(View.GONE);
        } else {
            badgeTextView.setVisibility(View.VISIBLE);
            badgeTextView.setText(unreadCount > 99 ? "99+" : String.valueOf(unreadCount));
        }
    }

    // ── Suara notifikasi ──────────────────────────────────────────────────────

    private void playNotifSound() {
        long now = System.currentTimeMillis();
        if (now - lastSoundTime < 1500) return; // cooldown 1.5 detik
        lastSoundTime = now;
        try {
            Uri sound = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION);
            Ringtone r = RingtoneManager.getRingtone(this, sound);
            if (r != null) r.play();
        } catch (Exception ignored) {}
    }

    // ── Touch: drag + snap tepi + trash zone ──────────────────────────────────

    private void setupTouch() {
        final int[] startRawX = {0}, startRawY = {0};
        final int[] iniX = {0}, iniY = {0};
        final boolean[] moved = {false};
        DisplayMetrics dm = getResources().getDisplayMetrics();
        int dragSlop = (int)(8 * dm.density);

        bubbleView.setOnTouchListener((v, event) -> {
            WindowManager.LayoutParams lp =
                (WindowManager.LayoutParams) bubbleView.getLayoutParams();

            switch (event.getAction()) {
                case MotionEvent.ACTION_DOWN:
                    startRawX[0] = (int) event.getRawX();
                    startRawY[0] = (int) event.getRawY();
                    iniX[0] = lp.x;
                    iniY[0] = lp.y;
                    moved[0] = false;
                    break;

                case MotionEvent.ACTION_MOVE:
                    int dx = (int) event.getRawX() - startRawX[0];
                    int dy = (int) event.getRawY() - startRawY[0];
                    if (!moved[0] && (Math.abs(dx) > dragSlop || Math.abs(dy) > dragSlop)) {
                        moved[0] = true;
                        showTrashZone();
                    }
                    if (moved[0]) {
                        int newX = iniX[0] + dx;
                        int newY = iniY[0] + dy;
                        boolean nearTrash = newY > (screenHeight - trashThreshold);
                        if (nearTrash) {
                            newX = screenWidth / 2 - bubbleSize / 2;
                            newY = screenHeight - trashThreshold + (int)(18 * dm.density);
                        }
                        lp.x = newX;
                        lp.y = newY;
                        try { windowManager.updateViewLayout(bubbleView, lp); } catch (Exception ignored) { break; }
                        float scale = nearTrash ? 0.72f : 1f;
                        bubbleView.setScaleX(scale);
                        bubbleView.setScaleY(scale);
                        highlightTrash(nearTrash);
                        isOverTrash = nearTrash;
                    }
                    break;

                case MotionEvent.ACTION_UP:
                    if (!moved[0]) {
                        openApp();
                    } else {
                        hideTrashZone();
                        bubbleView.setScaleX(1f);
                        bubbleView.setScaleY(1f);
                        if (isOverTrash) {
                            removeBubble();
                            stopSelf();
                        } else {
                            snapToEdge(lp);
                        }
                        isOverTrash = false;
                    }
                    break;
            }
            return true;
        });
    }

    private void snapToEdge(WindowManager.LayoutParams lp) {
        int mid    = screenWidth / 2;
        int margin = (int)(16 * density);
        lp.x = (lp.x + bubbleSize / 2 < mid) ? 0 : screenWidth - bubbleSize - margin;
        windowManager.updateViewLayout(bubbleView, lp);
    }

    // ── Trash Zone ────────────────────────────────────────────────────────────

    private void showTrashZone() {
        if (trashZoneView != null) return;
        DisplayMetrics dm = getResources().getDisplayMetrics();

        LinearLayout container = new LinearLayout(this);
        container.setOrientation(LinearLayout.VERTICAL);
        container.setGravity(Gravity.CENTER);
        container.setPadding(0, (int)(14 * dm.density), 0, (int)(14 * dm.density));
        container.setBackgroundColor(Color.parseColor("#AA000000"));

        int iconSz = (int)(52 * dm.density);
        FrameLayout iconWrap = new FrameLayout(this);

        View iconBg = new View(this);
        iconBg.setTag("trashBg");
        GradientDrawable d = new GradientDrawable();
        d.setShape(GradientDrawable.OVAL);
        d.setColor(Color.parseColor("#60FFFFFF"));
        d.setStroke((int)(2 * dm.density), Color.WHITE);
        iconBg.setBackground(d);
        iconWrap.addView(iconBg, new FrameLayout.LayoutParams(iconSz, iconSz));

        TextView iconTv = new TextView(this);
        iconTv.setTag("trashIcon");
        iconTv.setText("✕");
        iconTv.setTextColor(Color.WHITE);
        iconTv.setTextSize(20);
        iconTv.setTypeface(Typeface.DEFAULT_BOLD);
        iconTv.setGravity(Gravity.CENTER);
        iconWrap.addView(iconTv, new FrameLayout.LayoutParams(iconSz, iconSz));

        LinearLayout.LayoutParams iconWrapP = new LinearLayout.LayoutParams(iconSz, iconSz);
        iconWrapP.gravity = Gravity.CENTER_HORIZONTAL;
        container.addView(iconWrap, iconWrapP);

        TextView labelTv = new TextView(this);
        labelTv.setTag("trashLabel");
        labelTv.setText("Tutup Bubble");
        labelTv.setTextColor(Color.WHITE);
        labelTv.setTextSize(12);
        labelTv.setTypeface(Typeface.DEFAULT_BOLD);
        labelTv.setGravity(Gravity.CENTER);
        LinearLayout.LayoutParams labelP = new LinearLayout.LayoutParams(
            LinearLayout.LayoutParams.WRAP_CONTENT, LinearLayout.LayoutParams.WRAP_CONTENT);
        labelP.topMargin = (int)(6 * dm.density);
        container.addView(labelTv, labelP);

        trashZoneView = container;

        int type = Build.VERSION.SDK_INT >= Build.VERSION_CODES.O
            ? WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY
            : WindowManager.LayoutParams.TYPE_PHONE;

        WindowManager.LayoutParams p = new WindowManager.LayoutParams(
            screenWidth, trashThreshold, type,
            WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE
                | WindowManager.LayoutParams.FLAG_NOT_TOUCHABLE
                | WindowManager.LayoutParams.FLAG_LAYOUT_NO_LIMITS,
            PixelFormat.TRANSLUCENT
        );
        p.gravity = Gravity.BOTTOM | Gravity.START;
        p.x = 0;
        p.y = 0;

        windowManager.addView(trashZoneView, p);
    }

    private void highlightTrash(boolean active) {
        if (trashZoneView == null) return;
        DisplayMetrics dm = getResources().getDisplayMetrics();

        View iconBg = trashZoneView.findViewWithTag("trashBg");
        TextView labelTv = trashZoneView.findViewWithTag("trashLabel");

        if (iconBg != null) {
            GradientDrawable d = new GradientDrawable();
            d.setShape(GradientDrawable.OVAL);
            if (active) {
                d.setColor(Color.parseColor("#EF4444"));
                d.setStroke((int)(2.5f * dm.density), Color.parseColor("#FF7066"));
            } else {
                d.setColor(Color.parseColor("#60FFFFFF"));
                d.setStroke((int)(2 * dm.density), Color.WHITE);
            }
            iconBg.setBackground(d);
        }
        if (labelTv != null) {
            labelTv.setText(active ? "Lepas untuk tutup" : "Tutup Bubble");
        }
    }

    private void hideTrashZone() {
        if (trashZoneView != null) {
            try { windowManager.removeView(trashZoneView); } catch (Exception ignored) {}
            trashZoneView = null;
        }
    }

    // ── Open App ──────────────────────────────────────────────────────────────

    private void openApp() {
        Intent i = new Intent(this, MainActivity.class);
        i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_REORDER_TO_FRONT);
        i.putExtra("bubble_route", currentRoute);
        startActivity(i);
    }

    // ── Remove Bubble ─────────────────────────────────────────────────────────

    private void removeBubble() {
        hideTrashZone();
        if (windowManager != null && bubbleView != null) {
            try { windowManager.removeView(bubbleView); } catch (Exception ignored) {}
            bubbleView = null;
            badgeTextView = null;
        }
        unreadCount = 0;
    }

    // ── Notification foreground service ──────────────────────────────────────

    private Notification buildNotification() {
        NotificationManager nm = (NotificationManager) getSystemService(NOTIFICATION_SERVICE);
        if (nm != null && Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
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
            .setContentTitle("ZasaQu")
            .setContentText("Ada pesan baru")
            .setSmallIcon(android.R.drawable.ic_dialog_info)
            .setContentIntent(pi)
            .setPriority(NotificationCompat.PRIORITY_MIN)
            .setSilent(true)
            .build();
    }
}
