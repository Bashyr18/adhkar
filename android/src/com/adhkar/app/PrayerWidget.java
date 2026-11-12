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
        for (int id : ids) m.updateAppWidget(id, Widgets.prayer(c));
        Scheduler.run(c);
    }

    @Override
    public void onReceive(Context c, Intent i) {
        if (Widgets.ACTION_PRAYED.equals(i.getAction())) {
            String d = i.getStringExtra("d"), p = i.getStringExtra("p");
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
