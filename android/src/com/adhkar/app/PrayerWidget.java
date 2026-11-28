package com.adhkar.app;

import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.Context;
import android.content.Intent;
import android.os.VibrationEffect;
import android.os.Vibrator;

public class PrayerWidget extends AppWidgetProvider {
    @Override
    public void onUpdate(Context c, AppWidgetManager m, int[] ids) {
        Widgets.updateAll(c);
        final PendingResult pr = goAsync();
        new Thread(() -> { try { Scheduler.run(c); } finally { pr.finish(); } }).start();
    }

    @Override
    public void onReceive(Context c, Intent i) {
        if (Widgets.ACTION_PRAYED.equals(i.getAction())) {
            if (!Widgets.enabled(c)) { Widgets.updateAll(c); return; }
            String d = i.getStringExtra("d"), p = i.getStringExtra("p");
            if (!Widgets.canLogPrayer(c, d, p)) { Widgets.updateAll(c); return; }
            boolean on = Store.togglePrayed(c, d, p, Widgets.isPrayed(c, d, p));
            Vibrator vb = c.getSystemService(Vibrator.class);
            if (vb != null && vb.hasVibrator()) {
                try { vb.vibrate(android.os.Build.VERSION.SDK_INT >= 29 ? VibrationEffect.createPredefined(on ? VibrationEffect.EFFECT_DOUBLE_CLICK : VibrationEffect.EFFECT_TICK) : VibrationEffect.createOneShot(on ? 20 : 8, VibrationEffect.DEFAULT_AMPLITUDE)); } catch (Exception ignored) { }
            }
            Widgets.updateAll(c);
            return;
        }
        super.onReceive(c, i);
    }
}
