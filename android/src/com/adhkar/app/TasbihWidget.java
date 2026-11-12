package com.adhkar.app;

import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.os.SystemClock;
import android.os.VibrationEffect;
import android.os.Vibrator;

import org.json.JSONObject;

/** The tracker on the home screen. Every tap, reset and finished round becomes an event the app takes on its next
    open, so the widget and the app keep one counter, credited to the right phrase on the right day. */
public class TasbihWidget extends AppWidgetProvider {
    static final String ACTION_DISARM = "com.adhkar.app.TASBIH_DISARM";
    @Override
    public void onUpdate(Context c, AppWidgetManager m, int[] ids) {
        for (int id : ids) m.updateAppWidget(id, Widgets.tasbih(c));
    }

    @Override
    public void onReceive(Context c, Intent i) {
        String a = i.getAction();
        if (Widgets.ACTION_TAP.equals(a) || Widgets.ACTION_RESET.equals(a) || Widgets.ACTION_ROUND.equals(a)) {
            JSONObject cfg = Store.config(c);
            Widgets.Trk k = Widgets.trk(c, cfg);
            int fx = VibrationEffect.EFFECT_TICK;
            if (Widgets.ACTION_TAP.equals(a)) {
                Store.trackerEvent(c, "tap", k.id, 1, k.day);
                if (k.target > 0 && (k.live + 1) % k.target == 0) fx = VibrationEffect.EFFECT_HEAVY_CLICK;   /* a round complete */
            } else if (Widgets.ACTION_RESET.equals(a)) {
                if (k.live == 0) return;
                Store.trackerEvent(c, "reset", k.id, 0, k.day); fx = VibrationEffect.EFFECT_CLICK;
            } else if (Widgets.armed(c)) {
                Store.prefs(c).edit().remove("tArm").apply();
                Store.trackerEvent(c, "round", k.id, k.round, k.day); fx = VibrationEffect.EFFECT_HEAVY_CLICK;
            } else {
                /* first tap: ask for a second. The receiver returns at once (a held receiver would queue the second
                   tap behind it); an alarm settles the button back a few seconds later. */
                Store.prefs(c).edit().putLong("tArm", SystemClock.elapsedRealtime()).apply();
                android.app.AlarmManager am = c.getSystemService(android.app.AlarmManager.class);
                if (am != null) am.set(android.app.AlarmManager.ELAPSED_REALTIME, SystemClock.elapsedRealtime() + Widgets.ARM_MS,
                        android.app.PendingIntent.getBroadcast(c, 206, new Intent(c, TasbihWidget.class).setAction(ACTION_DISARM), android.app.PendingIntent.FLAG_UPDATE_CURRENT | android.app.PendingIntent.FLAG_IMMUTABLE));
            }
            buzz(c, fx);
            refresh(c);
            return;
        }
        if (ACTION_DISARM.equals(a)) {
            long at = Store.prefs(c).getLong("tArm", 0);
            if (at > 0 && SystemClock.elapsedRealtime() - at >= Widgets.ARM_MS - 300) { Store.prefs(c).edit().remove("tArm").apply(); refresh(c); }
            return;
        }
        super.onReceive(c, i);
    }

    static void refresh(Context c) {
        AppWidgetManager m = AppWidgetManager.getInstance(c);
        int[] ids = m.getAppWidgetIds(new ComponentName(c, TasbihWidget.class));
        for (int id : ids) m.updateAppWidget(id, Widgets.tasbih(c));
    }

    private static void buzz(Context c, int fx) {
        Vibrator vb = c.getSystemService(Vibrator.class);
        if (vb == null || !vb.hasVibrator()) return;
        try { vb.vibrate(android.os.Build.VERSION.SDK_INT >= 29 ? VibrationEffect.createPredefined(fx) : VibrationEffect.createOneShot(fx == VibrationEffect.EFFECT_HEAVY_CLICK ? 30 : 10, 80)); } catch (Exception ignored) { }
    }
}
