package com.zasaqu.com;

import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.os.PowerManager;
import android.provider.Settings;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "FloatingBubble")
public class FloatingBubblePlugin extends Plugin {

    @PluginMethod
    public void hasPermission(PluginCall call) {
        boolean granted = Build.VERSION.SDK_INT < Build.VERSION_CODES.M
            || Settings.canDrawOverlays(getContext());
        JSObject ret = new JSObject();
        ret.put("granted", granted);
        call.resolve(ret);
    }

    @PluginMethod
    public void requestPermission(PluginCall call) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M
                && !Settings.canDrawOverlays(getContext())) {
            Intent i = new Intent(Settings.ACTION_MANAGE_OVERLAY_PERMISSION,
                Uri.parse("package:" + getContext().getPackageName()));
            getActivity().startActivity(i);
            // Langsung resolve — user kembali ke app setelah grant di Settings
            JSObject ret = new JSObject();
            ret.put("opened", true);
            call.resolve(ret);
        } else {
            JSObject ret = new JSObject();
            ret.put("granted", true);
            call.resolve(ret);
        }
    }

    @PluginMethod
    public void show(PluginCall call) {
        if (!canOverlay()) { call.reject("Izin overlay belum diberikan"); return; }
        startBubbleService("SHOW", call);
        call.resolve();
    }

    @PluginMethod
    public void update(PluginCall call) {
        if (!canOverlay()) { call.resolve(); return; }
        startBubbleService("UPDATE", call);
        call.resolve();
    }

    @PluginMethod
    public void dismiss(PluginCall call) {
        Intent i = new Intent(getContext(), FloatingBubbleService.class);
        i.setAction("DISMISS");
        getContext().startService(i);
        call.resolve();
    }

    @PluginMethod
    public void resetBadge(PluginCall call) {
        Intent i = new Intent(getContext(), FloatingBubbleService.class);
        i.setAction("RESET_BADGE");
        // Selalu pakai startService — service mungkin tidak sedang berjalan (bubble sudah ditutup)
        // startForegroundService akan crash jika service tidak panggil startForeground() dalam 5 detik
        getContext().startService(i);
        call.resolve();
    }

    // ── Helper ───────────────────────────────────────────────────────────────

    private boolean canOverlay() {
        return Build.VERSION.SDK_INT < Build.VERSION_CODES.M
            || Settings.canDrawOverlays(getContext());
    }

    @PluginMethod
    public void hasBatteryOptimizationExemption(PluginCall call) {
        PowerManager pm = (PowerManager) getContext().getSystemService(getContext().POWER_SERVICE);
        boolean exempt = pm != null && pm.isIgnoringBatteryOptimizations(getContext().getPackageName());
        JSObject ret = new JSObject();
        ret.put("exempt", exempt);
        call.resolve(ret);
    }

    @PluginMethod
    public void requestBatteryOptimization(PluginCall call) {
        try {
            Intent i = new Intent(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS,
                Uri.parse("package:" + getContext().getPackageName()));
            getActivity().startActivity(i);
        } catch (Exception ignored) {}
        JSObject ret = new JSObject();
        ret.put("opened", true);
        call.resolve(ret);
    }

    private void startBubbleService(String action, PluginCall call) {
        Intent i = new Intent(getContext(), FloatingBubbleService.class);
        i.setAction(action);
        i.putExtra("emoji", call.getString("emoji", "📦"));
        i.putExtra("label", call.getString("label", "Order aktif"));
        i.putExtra("route", call.getString("route", "/"));
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            try {
                getContext().startForegroundService(i);
            } catch (Exception e) {
                // Android 12+ ForegroundServiceStartNotAllowedException saat app di background
                // Fallback ke startService — tidak crash, mungkin tidak jalan, tapi aman
                try { getContext().startService(i); } catch (Exception ignored) {}
            }
        } else {
            getContext().startService(i);
        }
    }
}
