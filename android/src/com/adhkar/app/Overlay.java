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

    /** The hour of response on Friday: a card over other apps that stays until it is opened or dismissed
     *  (or for ten minutes), with a soft vibration and no sound. */
    static void hour(final Context c, final String text, final String route) {
        if (!allowed(c)) return;
        new Handler(Looper.getMainLooper()).post(() -> {
            try { addHour(c.getApplicationContext(), text, route); } catch (Exception e) { android.util.Log.w("Adhkar", "overlay", e); }
        });
    }

    private static void addHour(final Context c, String text, final String route) {
        final WindowManager wm = c.getSystemService(WindowManager.class);
        if (wm == null) return;
        remove(wm);
        int gold = 0xFFF1D59E, ink = 0xFFF5F0E7;
        LinearLayout card = new LinearLayout(c);
        card.setOrientation(LinearLayout.VERTICAL);
        card.setPadding(dp(c, 22), dp(c, 18), dp(c, 22), dp(c, 16));
        GradientDrawable bg = new GradientDrawable(GradientDrawable.Orientation.TL_BR, new int[]{0xF70B2A26, 0xF7081613});
        bg.setCornerRadius(dp(c, 26)); bg.setStroke(dp(c, 1), 0x66F1D59E);
        card.setBackground(bg);
        card.setElevation(dp(c, 14));

        TextView eye = new TextView(c);
        eye.setText(L.t("YAWM AL-JUMUʿAH", "يوم الجمعة")); eye.setTextColor(0xCCF1D59E); eye.setTextSize(11);
        eye.setTypeface(Typeface.DEFAULT_BOLD); eye.setLetterSpacing(0.12f);
        TextView ar = new TextView(c);
        ar.setText("سَاعَةُ الإِجَابَة"); ar.setTextColor(gold); ar.setTextSize(28); ar.setGravity(Gravity.CENTER);
        ar.setTextDirection(View.TEXT_DIRECTION_RTL); ar.setPadding(0, dp(c, 6), 0, dp(c, 2));
        TextView t = new TextView(c);
        t.setText(L.t("The hour of response has begun", "بدأت ساعة الإجابة")); t.setTextColor(ink); t.setTextSize(17);
        t.setTypeface(Typeface.DEFAULT_BOLD); t.setGravity(Gravity.CENTER);
        TextView s = new TextView(c);
        s.setText(text); s.setTextColor(0xB3F5F0E7); s.setTextSize(13); s.setGravity(Gravity.CENTER); s.setPadding(0, dp(c, 6), 0, dp(c, 14));
        s.setMaxLines(4);
        card.addView(eye); card.addView(ar); card.addView(t); card.addView(s);

        LinearLayout row = new LinearLayout(c);
        row.setOrientation(LinearLayout.HORIZONTAL);
        row.setGravity(Gravity.CENTER);
        TextView later = button(c, L.t("Dismiss", "إغلاق"), false);
        TextView open = button(c, L.t("Make duʿāʾ", "ادعُ الآن"), true);
        LinearLayout.LayoutParams bp = new LinearLayout.LayoutParams(0, dp(c, 46), 1f);
        bp.setMarginStart(dp(c, 5)); bp.setMarginEnd(dp(c, 5));
        row.addView(later, bp); row.addView(open, new LinearLayout.LayoutParams(bp));
        card.addView(row);

        int type = Build.VERSION.SDK_INT >= 26 ? WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY : WindowManager.LayoutParams.TYPE_PHONE;
        WindowManager.LayoutParams lp = new WindowManager.LayoutParams(
                Math.min(dp(c, 400), c.getResources().getDisplayMetrics().widthPixels - dp(c, 28)), WindowManager.LayoutParams.WRAP_CONTENT, type,
                WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE | WindowManager.LayoutParams.FLAG_NOT_TOUCH_MODAL, PixelFormat.TRANSLUCENT);
        lp.gravity = Gravity.CENTER;
        lp.windowAnimations = android.R.style.Animation_Dialog;
        wm.addView(card, lp);
        shown = card;
        Vibrator vb = c.getSystemService(Vibrator.class);
        if (vb != null && vb.hasVibrator()) try { vb.vibrate(Build.VERSION.SDK_INT >= 26 ? VibrationEffect.createWaveform(new long[]{0, 60, 120, 60}, -1) : VibrationEffect.createOneShot(60, 120)); } catch (Exception ignored) { }

        final Handler h = new Handler(Looper.getMainLooper());
        final Runnable gone = () -> remove(wm);
        h.postDelayed(gone, 10 * 60000L);
        later.setOnClickListener(v -> { h.removeCallbacks(gone); remove(wm); });
        open.setOnClickListener(v -> {
            h.removeCallbacks(gone); remove(wm);
            try { Scheduler.open(c, route, 911).send(); } catch (Exception ignored) { }
        });
    }

    private static TextView button(Context c, String label, boolean pri) {
        TextView b = new TextView(c);
        b.setText(label); b.setGravity(Gravity.CENTER); b.setTextSize(14); b.setTypeface(Typeface.DEFAULT_BOLD);
        b.setTextColor(pri ? 0xFF13110B : 0xFFF5F0E7);
        GradientDrawable g = new GradientDrawable();
        g.setCornerRadius(dp(c, 23));
        if (pri) g.setColor(0xFFF1D59E); else { g.setColor(0x14F5F0E7); g.setStroke(dp(c, 1), 0x33F5F0E7); }
        b.setBackground(g);
        b.setContentDescription(label);
        return b;
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
