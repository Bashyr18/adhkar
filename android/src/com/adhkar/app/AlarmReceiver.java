package com.adhkar.app;

import android.app.AlarmManager;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.os.Build;

/** Alarm ticks, reboot/time changes, and the "In 15 min" snooze action. */
public class AlarmReceiver extends BroadcastReceiver {
    @Override
    public void onReceive(Context c, Intent i) {
        String a = i.getAction() == null ? "" : i.getAction();
        if (Scheduler.ACTION_PRAYED_N.equals(a)) {
            String d = i.getStringExtra("d"), p = i.getStringExtra("p");
            if (d != null && p != null && !Widgets.isPrayed(c, d, p)) Store.togglePrayed(c, d, p, false);
            NotificationManager nm = c.getSystemService(NotificationManager.class);
            if (nm != null) nm.cancel(i.getIntExtra("nid", 0));
            Widgets.updateAll(c);
            return;
        }
        if (Scheduler.ACTION_SNOOZE.equals(a)) {
            String id = i.getStringExtra("id");
            NotificationManager nm = c.getSystemService(NotificationManager.class);
            if (nm != null && id != null) nm.cancel(id.replaceAll("-\\d{4}-\\d{2}-\\d{2}$", "").hashCode());
            Intent s = new Intent(i).setClass(c, AlarmReceiver.class).setAction(Scheduler.ACTION_SNOOZED);
            PendingIntent pi = PendingIntent.getBroadcast(c, 7, s, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
            AlarmManager am = c.getSystemService(AlarmManager.class);
            long at = System.currentTimeMillis() + 15 * 60000L;
            if (am != null) {
                if (Build.VERSION.SDK_INT < 31 || am.canScheduleExactAlarms()) am.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, at, pi);
                else am.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, at, pi);
            }
            return;
        }
        if (Scheduler.ACTION_SNOOZED.equals(a)) {
            Scheduler.channels(c);
            Scheduler.post(c, new Scheduler.Ev(i.getStringExtra("id"), System.currentTimeMillis(), i.getStringExtra("ch"), i.getStringExtra("title"),
                    i.getStringExtra("text"), i.getStringExtra("route"), i.getStringExtra("action"), i.getStringExtra("actionRoute"), false));
            return;
        }
        if (Intent.ACTION_BOOT_COMPLETED.equals(a) || Intent.ACTION_MY_PACKAGE_REPLACED.equals(a)) {
            Store.prefs(c).edit().putLong("lastFired", System.currentTimeMillis()).apply();
        }
        final PendingResult pr = goAsync();
        new Thread(() -> { try { Scheduler.run(c); } finally { pr.finish(); } }).start();
    }
}
