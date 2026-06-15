package com.zasaqu.app;

import android.content.Intent;
import android.net.Uri;
import android.os.Build;
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
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            getContext().startForegroundService(i);
        } else {
            getContext().startService(i);
        }
        call.resolve();
    }

    // ── Helper ───────────────────────────────────────────────────────────────

    private boolean canOverlay() {
        return Build.VERSION.SDK_INT < Build.VERSION_CODES.M
            || Settings.canDrawOverlays(getContext());
    }

    private void startBubbleService(String action, PluginCall call) {
        Intent i = new Intent(getContext(), FloatingBubbleService.class);
        i.setAction(action);
        i.putExtra("emoji", call.getString("emoji", "📦"));
        i.putExtra("label", call.getString("label", "Order aktif"));
        i.putExtra("route", call.getString("route", "/"));
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            getContext().startForegroundService(i);
        } else {
            getContext().startService(i);
        }
    }
}
