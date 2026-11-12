package com.adhkar.app;

import android.content.Context;
import android.content.Intent;
import android.graphics.PixelFormat;
import android.graphics.Typeface;
import android.graphics.drawable.GradientDrawable;
import android.os.Build;
import android.os.Handler;
import android.os.Looper;
import android.os.VibrationEffect;
import android.os.Vibrator;
import android.provider.Settings;
import android.view.Gravity;
import android.view.View;
import android.view.WindowManager;
import android.widget.LinearLayout;
import android.widget.TextView;

import org.json.JSONArray;
import org.json.JSONObject;

/** A short dhikr floating over other apps for a few seconds. Tap to count it (it joins the Tracker), × to dismiss. */
final class Overlay {
    private Overlay() {}
    private static View shown;

    static boolean allowed(Context c) { return Build.VERSION.SDK_INT < 23 || Settings.canDrawOverlays(c); }

    static void show(final Context c, final JSONObject p) {
        if (!allowed(c) || p == null) return;
        new Handler(Looper.getMainLooper()).post(() -> {
            try { add(c.getApplicationContext(), p); } catch (Exception e) { android.util.Log.w("Adhkar", "overlay", e); }
        });
    }

    private static int dp(Context c, float v) { return Math.round(v * c.getResources().getDisplayMetrics().density); }

    private static void add(final Context c, final JSONObject p) {
        final WindowManager wm = c.getSystemService(WindowManager.class);
        if (wm == null) return;
        remove(wm);
        LinearLayout pill = new LinearLayout(c);
        pill.setOrientation(LinearLayout.HORIZONTAL);
        pill.setGravity(Gravity.CENTER_VERTICAL);
        pill.setPadding(dp(c, 18), dp(c, 10), dp(c, 10), dp(c, 10));
        GradientDrawable bg = new GradientDrawable();
        bg.setColor(0xF2141826); bg.setCornerRadius(dp(c, 26)); bg.setStroke(dp(c, 1), 0x55F1D59E);
        pill.setBackground(bg);
        pill.setElevation(dp(c, 10));

        LinearLayout col = new LinearLayout(c);
        col.setOrientation(LinearLayout.VERTICAL);
        final TextView ar = new TextView(c);
        ar.setText(p.optString("ar")); ar.setTextColor(0xFFF1D59E); ar.setTextSize(20); ar.setSingleLine(true);
        ar.setTextDirection(View.TEXT_DIRECTION_RTL);
        final TextView tr = new TextView(c);
        tr.setText(p.optString("tr") + "  ·  tap to count"); tr.setTextColor(0xB3F5F0E7); tr.setTextSize(12); tr.setTypeface(Typeface.DEFAULT_BOLD);
        col.addView(ar); col.addView(tr);
        pill.addView(col, new LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1f));

        TextView x = new TextView(c);
        x.setText("×"); x.setTextColor(0x99F5F0E7); x.setTextSize(22); x.setGravity(Gravity.CENTER);
        x.setContentDescription(L.t("Dismiss", "إغلاق"));
        pill.addView(x, new LinearLayout.LayoutParams(dp(c, 40), dp(c, 40)));

        int type = Build.VERSION.SDK_INT >= 26 ? WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY : WindowManager.LayoutParams.TYPE_PHONE;
        WindowManager.LayoutParams lp = new WindowManager.LayoutParams(
                Math.min(dp(c, 420), c.getResources().getDisplayMetrics().widthPixels - dp(c, 24)), WindowManager.LayoutParams.WRAP_CONTENT, type,
                WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE | WindowManager.LayoutParams.FLAG_NOT_TOUCH_MODAL, PixelFormat.TRANSLUCENT);
        lp.gravity = Gravity.TOP | Gravity.CENTER_HORIZONTAL;
        lp.y = dp(c, 44);
        lp.windowAnimations = android.R.style.Animation_Toast;
        wm.addView(pill, lp);
        shown = pill;

        final Handler h = new Handler(Looper.getMainLooper());
        final Runnable gone = () -> remove(wm);
        h.postDelayed(gone, 9000);
        x.setOnClickListener(v -> { h.removeCallbacks(gone); remove(wm); });
        col.setOnClickListener(v -> {
            Store.bumpNudge(c, p.optString("id"));
            Vibrator vb = c.getSystemService(Vibrator.class);
            if (vb != null && vb.hasVibrator()) try { vb.vibrate(Build.VERSION.SDK_INT >= 29 ? VibrationEffect.createPredefined(VibrationEffect.EFFECT_TICK) : VibrationEffect.createOneShot(10, 80)); } catch (Exception ignored) { }
            tr.setText(L.t("Counted ✓", "حُسبت ✓")); tr.setTextColor(Widgets.accent(Store.config(c)));
            h.removeCallbacks(gone); h.postDelayed(gone, 900);
        });
    }

    private static void remove(WindowManager wm) {
        if (shown != null) { try { wm.removeView(shown); } catch (Exception ignored) { } shown = null; }
    }

    /** next phrase in turn from the app's list */
    static JSONObject next(Context c, JSONObject nudge) {
        JSONArray l = nudge == null ? null : nudge.optJSONArray("phrases");
        if (l == null || l.length() == 0) return null;
        int i = Store.prefs(c).getInt("nudgeTurn", 0);
        Store.prefs(c).edit().putInt("nudgeTurn", i + 1).apply();
        return l.optJSONObject(i % l.length());
    }

    static void openSettings(Context c) {
        try { c.startActivity(new Intent(Settings.ACTION_MANAGE_OVERLAY_PERMISSION, android.net.Uri.parse("package:" + c.getPackageName())).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)); } catch (Exception ignored) { }
    }
}
