package com.adhkar.app;

import android.app.AlarmManager;
import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.media.AudioAttributes;
import android.net.Uri;
import android.os.Build;

import org.json.JSONObject;

import java.util.ArrayList;
import java.util.Calendar;
import java.util.List;

/**
 * Computes upcoming reminders from the mirrored config and keeps exactly one exact alarm armed
 * for the soonest of: the next reminder, the next prayer boundary (widget refresh), or local midnight.
 */
final class Scheduler {
    private Scheduler() {}

    static final String CH_PRAYER = "prayer_tap", CH_ADHAN = "prayer_adhan", CH_ADHKAR = "adhkar", CH_SUNNAH = "sunnah";
    static boolean prayerCh(String ch) { return CH_PRAYER.equals(ch) || CH_ADHAN.equals(ch); }
    static final String ACTION_TICK = "com.adhkar.app.TICK", ACTION_SNOOZE = "com.adhkar.app.SNOOZE", ACTION_SNOOZED = "com.adhkar.app.SNOOZED";
    private static final long MIN = 60000L;

    static final String ACTION_PRAYED_N = "com.adhkar.app.PRAYED_FROM_NOTIFICATION";
    static final class Ev {
        final String id, ch, title, text, route, action, actionRoute; final long at; final boolean snooze;
        Ev(String id, long at, String ch, String title, String text, String route, String action, String actionRoute, boolean snooze) {
            this.id = id; this.at = at; this.ch = ch; this.title = title; this.text = text; this.route = route; this.action = action; this.actionRoute = actionRoute; this.snooze = snooze;
        }
    }

    static void channels(Context c) {
        Store.config(c);
        NotificationManager nm = c.getSystemService(NotificationManager.class);
        if (nm == null) return;
        if (nm.getNotificationChannel("prayer") != null) nm.deleteNotificationChannel("prayer"); // retired: bell chime
        AudioAttributes att = new AudioAttributes.Builder().setUsage(AudioAttributes.USAGE_NOTIFICATION).setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION).build();
        if (nm.getNotificationChannel(CH_ADHAN) == null) {
            /* the opening takbīr of the Madinah adhān, at the moment each prayer begins */
            NotificationChannel q = new NotificationChannel(CH_ADHAN, L.t("Adhān at prayer time", "الأذان عند دخول الوقت"), NotificationManager.IMPORTANCE_HIGH);
            q.setDescription(L.t("Allāhu akbar, Allāhu akbar, from Masjid an-Nabawi", "الله أكبر، الله أكبر، من المسجد النبوي"));
            q.setSound(Uri.parse("android.resource://" + c.getPackageName() + "/" + R.raw.adhan_takbir), att);
            q.enableVibration(true); q.setVibrationPattern(new long[]{0, 60, 120, 60});
            nm.createNotificationChannel(q);
        }
        if (nm.getNotificationChannel(CH_PRAYER) != null) { renameChannels(nm); return; }
        NotificationChannel p = new NotificationChannel(CH_PRAYER, L.t("Prayer times", "مواقيت الصلاة"), NotificationManager.IMPORTANCE_HIGH);
        p.setDescription(L.t("A soft tap when each prayer begins", "نقرة هادئة عند دخول كل صلاة"));
        p.setSound(Uri.parse("android.resource://" + c.getPackageName() + "/" + R.raw.tap), att);
        p.enableVibration(true); p.setVibrationPattern(new long[]{0, 60, 120, 60});
        NotificationChannel a = new NotificationChannel(CH_ADHKAR, L.t("Adhkār reminders", "تذكير الأذكار"), NotificationManager.IMPORTANCE_DEFAULT);
        a.setDescription(L.t("Morning, evening and sleep remembrance", "أذكار الصباح والمساء والنوم"));
        NotificationChannel s = new NotificationChannel(CH_SUNNAH, L.t("Sunnah & night", "السنن والليل"), NotificationManager.IMPORTANCE_DEFAULT);
        s.setDescription(L.t("Ḍuḥā, the last third of the night and Jumuʿah", "الضحى، وثلث الليل الآخر، والجمعة"));
        nm.createNotificationChannel(p); nm.createNotificationChannel(a); nm.createNotificationChannel(s);
    }

    static void renameChannels(NotificationManager nm) {
        String[][] names = {{CH_ADHAN, L.t("Adhān at prayer time", "الأذان عند دخول الوقت"), L.t("Allāhu akbar, Allāhu akbar, from Masjid an-Nabawi", "الله أكبر، الله أكبر، من المسجد النبوي")},
            {CH_PRAYER, L.t("Prayer times", "مواقيت الصلاة"), L.t("A soft tap when each prayer begins", "نقرة هادئة عند دخول كل صلاة")},
            {CH_ADHKAR, L.t("Adhkār reminders", "تذكير الأذكار"), L.t("Morning, evening and sleep remembrance", "أذكار الصباح والمساء والنوم")},
            {CH_SUNNAH, L.t("Sunnah & night", "السنن والليل"), L.t("Ḍuḥā, the last third of the night and Jumuʿah", "الضحى، وثلث الليل الآخر، والجمعة")}};
        for (String[] n : names) {
            NotificationChannel ch = nm.getNotificationChannel(n[0]);
            if (ch != null && !n[1].contentEquals(ch.getName())) { ch.setName(n[1]); ch.setDescription(n[2]); nm.createNotificationChannel(ch); }
        }
    }

    /** All reminder events for the civil day containing `ref` shifted by `off` days. */
    static List<Ev> events(Context c, JSONObject cfg, PrayerCalc.Opts o, int off) {
        List<Ev> out = new ArrayList<>();
        JSONObject n = cfg.optJSONObject("notif");
        long now = System.currentTimeMillis();
        PrayerCalc.Day d = PrayerCalc.dayAt(now, off, o);
        String key = PrayerCalc.key(d), place = Store.locName(cfg);
        org.json.JSONArray plan = cfg.optJSONArray("fastPlan");
        if (plan != null) {
            PrayerCalc.Day tm = PrayerCalc.dayAt(now, off + 1, o);
            String tk = PrayerCalc.key(tm);
            for (int i = 0; i < plan.length(); i++)
                if (tk.equals(plan.optString(i)))
                    out.add(new Ev("fp-" + key, d.maghrib, CH_SUNNAH, L.t("Tomorrow you plan to fast", "غدًا تنوي الصيام"),
                            L.t("Make your intention tonight, and eat suhūr before Fajr at " + Store.fmtTime(cfg, o, tm.fajr) + ".", "انوِ الليلة، وتسحّر قبل الفجر " + Store.fmtTime(cfg, o, tm.fajr) + "."), "#/calendar", null, null, false));
        }
        if (n == null || !n.optBoolean("enabled", false)) return out;
        JSONObject today = cfg.optJSONObject("today");
        boolean smart = n.optBoolean("smart", true) && today != null && key.equals(today.optString("key"));
        JSONObject pr = cfg.optBoolean("excused", false) ? null : n.optJSONObject("prayers"); // paused during a break from ṣalāh
        int pre = n.optInt("pre", 0);
        String atTime = n.optBoolean("adhan", true) ? CH_ADHAN : CH_PRAYER;
        Calendar dw0 = Calendar.getInstance(PrayerCalc.zone(o)); dw0.setTimeInMillis(d.dhuhr);
        boolean fri0 = dw0.get(Calendar.DAY_OF_WEEK) == Calendar.FRIDAY, sis = "f".equals(cfg.optString("gender"));
        for (String k : PrayerCalc.PRAYERS) {
            long at = d.get(k);
            String nm = fri0 && k.equals("dhuhr") ? (sis ? L.t("Jumuʿah or Ẓuhr", "الجمعة أو الظهر") : L.t("Jumuʿah", "الجمعة")) : Store.name(k);
            if (pr != null && pr.optBoolean(k, false)) {
                out.add(new Ev("p-" + k + "-" + key, at, atTime, nm + " · " + Store.fmtTime(cfg, o, at),
                        L.t("It is time for " + nm + (place.isEmpty() ? "" : " in " + place) + ". Then the adhkār after the prayer.", "حان وقت " + nm + (place.isEmpty() ? "" : " في " + place) + "، ثم أذكار بعد الصلاة."),
                        "#/salah", L.t("After-prayer adhkār", "أذكار بعد الصلاة"), "#/r/salah/0/" + k, false));
                if (pre > 0) out.add(new Ev("q-" + k + "-" + key, at - pre * MIN, CH_PRAYER, L.t(nm + " in " + pre + " minutes", nm + " بعد " + L.n(pre) + " دقيقة"),
                        Store.fmtTime(cfg, o, at) + L.t(" · a moment to make wuḍūʾ", " · وقت للوضوء"), "#/salah", null, null, false));
            }
        }
        JSONObject m = n.optJSONObject("morning");
        if (m != null && m.optBoolean("on") && !(smart && today.optBoolean("morning")))
            out.add("sunrise".equals(m.optString("from")) ? new Ev("m-" + key, d.sunrise + m.optInt("after", 20) * MIN, CH_ADHKAR, "Morning adhkār",
                    L.t("Begin the day with remembrance.", "ابدأ يومك بذكر الله."), "#/c/morning", L.t("Begin", "ابدأ"), "#/r/morning/0", true)
                : new Ev("m-" + key, d.fajr + m.optInt("after", 20) * MIN, CH_ADHKAR, L.t("Morning adhkār", "أذكار الصباح"),
                    L.t("Begin the day with remembrance. Before sunrise at " + Store.fmtTime(cfg, o, d.sunrise) + " is best.", "ابدأ يومك بذكر الله، والأفضل قبل الشروق " + Store.fmtTime(cfg, o, d.sunrise) + "."), "#/c/morning", L.t("Begin", "ابدأ"), "#/r/morning/0", true));
        JSONObject e = n.optJSONObject("evening");
        if (e != null && e.optBoolean("on") && !(smart && today.optBoolean("evening")))
            out.add("maghrib".equals(e.optString("from")) ? new Ev("e-" + key, d.maghrib + e.optInt("after", 30) * MIN, CH_ADHKAR, "Evening adhkār",
                    L.t("Protect your night with remembrance.", "احفظ ليلتك بذكر الله."), "#/c/evening", L.t("Begin", "ابدأ"), "#/r/evening/0", true)
                : new Ev("e-" + key, d.asr + e.optInt("after", 30) * MIN, CH_ADHKAR, L.t("Evening adhkār", "أذكار المساء"),
                    L.t("Protect your evening with remembrance. Maghrib is at " + Store.fmtTime(cfg, o, d.maghrib) + ".", "احفظ مساءك بذكر الله. المغرب " + Store.fmtTime(cfg, o, d.maghrib) + "."), "#/c/evening", L.t("Begin", "ابدأ"), "#/r/evening/0", true));
        JSONObject sl = n.optJSONObject("sleep");
        if (sl != null && sl.optBoolean("on") && !(smart && today.optBoolean("sleep"))) {
            String[] hm = sl.optString("at", "22:30").split(":");
            Calendar cal = Calendar.getInstance(PrayerCalc.zone(o)); cal.clear();
            cal.set(d.y, d.m - 1, d.d, Integer.parseInt(hm[0]), Integer.parseInt(hm[1]), 0);
            out.add(new Ev("s-" + key, cal.getTimeInMillis(), CH_ADHKAR, L.t("Before you sleep", "قبل النوم"), L.t("The three Quls, Āyat al-Kursī and the adhkār of sleep.", "المعوذات وآية الكرسي وأذكار النوم."), "#/c/sleep", L.t("Begin", "ابدأ"), "#/r/sleep/0", true));
        }
        JSONObject du = n.optJSONObject("duha");
        if (du != null && du.optBoolean("on") && !(smart && today.optBoolean("duha")))
            out.add(new Ev("d-" + key, d.duhaStart, CH_SUNNAH, L.t("Ḍuḥā time", "وقت الضحى"), L.t("The window is open until " + Store.fmtTime(cfg, o, d.duhaEnd) + ". Two rakʿahs suffice.", "يمتد الوقت إلى " + Store.fmtTime(cfg, o, d.duhaEnd) + "، وتكفي ركعتان."), "#/duha", null, null, false));
        JSONObject cy = cfg.optJSONObject("cycle");
        if (cy != null) {
            /* worded so nothing private shows on a lock screen */
            if (!cy.optBoolean("on") && key.equals(cy.optString("next")))
                out.add(new Ev("cy-" + key, d.sunrise + 60 * MIN, CH_SUNNAH, L.t("A gentle reminder", "تذكير لطيف"), L.t("Tap to update your days.", "اضغطي لتحديث أيامك."), "#/", null, null, false));
            if (cy.optBoolean("on") && key.equals(cy.optString("end")))
                out.add(new Ev("cz-" + key, d.dhuhr - 30 * MIN, CH_SUNNAH, L.t("A gentle reminder", "تذكير لطيف"), L.t("Your usual days are complete. Tap when you are ready.", "اكتملت أيام عادتك. اضغطي حين تكونين مستعدة."), "#/", null, null, false));
        }
        JSONObject jr = cfg.optJSONObject("journal"), jn = jr == null ? null : jr.optJSONObject("nudge");
        String dua = jr == null ? "" : jr.optString("dua", "");
        String yours = dua.isEmpty() ? "" : L.t("\nYour duʿāʾ: ", "\nدعاؤك: ") + dua;
        boolean jNight = jn != null && jn.optBoolean("night") && !dua.isEmpty(), jFri = jn != null && jn.optBoolean("friday") && !dua.isEmpty();
        JSONObject ni = n.optJSONObject("night");
        if ((ni != null && ni.optBoolean("on")) || jNight)
            out.add(new Ev("n-" + key, Math.min(d.lastThird + (ni == null ? 0 : ni.optInt("off", 0)) * MIN, d.nextFajr - 15 * MIN), CH_SUNNAH, L.t("The last third of the night", "ثلث الليل الآخر"), L.t("It lasts until Fajr at " + Store.fmtTime(cfg, o, d.nextFajr) + ". Call upon your Lord.", "يمتد إلى الفجر " + Store.fmtTime(cfg, o, d.nextFajr) + "، فادعُ ربك.") + (jNight ? yours : ""), jNight ? "#/journal" : "#/night", null, null, false));
        String ja = jn == null ? "" : jn.optString("adhan", "");
        if (!dua.isEmpty() && !ja.isEmpty() && d.get(ja) > 0)
            out.add(new Ev("ja-" + key, d.get(ja) + 2 * MIN, CH_SUNNAH, L.t("Between adhān and iqāmah", "بين الأذان والإقامة"), L.t("Duʿāʾ now is not rejected.", "الدعاء الآن لا يُرد.") + yours, "#/journal", null, null, false));
        JSONObject rm = n.optJSONObject("ramadan");
        if (rm != null) {
            PrayerCalc.Day nx = PrayerCalc.dayAt(now, off + 1, o);
            long imsak = cfg.optInt("imsak", 0) * MIN;
            if (rm.optBoolean("suhoor", true) && Store.hijriMonth(cfg, nx.y, nx.m, nx.d) == 9)
                out.add(new Ev("rs-" + key, nx.fajr - imsak - rm.optInt("suhoorMin", 45) * MIN, CH_ADHKAR, L.t("Suhūr", "السحور"),
                        L.t("Eat before " + Store.fmtTime(cfg, o, nx.fajr - imsak) + ". There is blessing in suhūr.", "تسحّر قبل " + Store.fmtTime(cfg, o, nx.fajr - imsak) + "، فإن في السحور بركة."), "#/ramadan", null, null, false));
            if (rm.optBoolean("iftar", true) && Store.hijriMonth(cfg, d.y, d.m, d.d) == 9 && !cfg.optBoolean("excused", false))
                out.add(new Ev("ri-" + key, d.maghrib, CH_PRAYER, L.t("Ifṭār · ", "الإفطار · ") + Store.fmtTime(cfg, o, d.maghrib),
                        L.t("Dhahabaẓ-ẓama’u wabtallatil-ʿurūq, wa thabatal-ajru in shā’ Allāh.", "ذَهَبَ الظَّمَأُ وَابْتَلَّتِ العُرُوقُ، وَثَبَتَ الْأَجْرُ إِنْ شَاءَ اللَّهُ"), "#/ramadan", L.t("Ifṭār duʿāʾ", "دعاء الإفطار"), "#/r/ramadan/1", false));
        }
        JSONObject fr = n.optJSONObject("friday");
        Calendar dow = Calendar.getInstance(PrayerCalc.zone(o)); dow.setTimeInMillis(d.dhuhr);
        boolean friday = dow.get(Calendar.DAY_OF_WEEK) == Calendar.FRIDAY;
        JSONObject ju = cfg.optJSONObject("jumuah");
        boolean kahfRead = ju != null && key.equals(ju.optString("kahf"));
        if (fr != null && fr.optBoolean("on") && friday && !kahfRead)
            out.add(new Ev("fk-" + key, d.sunrise + 120 * MIN, CH_SUNNAH, L.t("Yawm al-Jumuʿah", "يوم الجمعة"), L.t("Read Sūrat al-Kahf and send abundant ṣalawāt upon the Prophet ﷺ.", "اقرأ سورة الكهف وأكثر من الصلاة على النبي ﷺ."), "#/kahf", L.t("Read al-Kahf", "اقرأ الكهف"), "#/kahf", false));
        if (friday && ((fr != null && fr.optBoolean("on")) || jFri))
            out.add(new Ev("fh-" + key, d.maghrib - 60 * MIN, CH_SUNNAH, L.t("The hour of response", "ساعة الإجابة"), L.t("The last hour before Maghrib on Friday, until " + Store.fmtTime(cfg, o, d.maghrib) + ". Make duʿāʾ.", "آخر ساعة قبل مغرب الجمعة، حتى " + Store.fmtTime(cfg, o, d.maghrib) + "، فادعُ الله.") + (jFri ? yours : ""), jFri ? "#/journal" : "#/jumuah", L.t("Your duʿāʾ list", "قائمة دعائك"), "#/journal", false));
        return out;
    }

    /** Do Not Disturb (alarms only) from just before the iqāmah for the chosen minutes. Only a silence this app
     *  started is ended by it, and only if the phone is still in that state. Returns the next boundary. */
    static long silence(Context c, JSONObject cfg, PrayerCalc.Opts o, long now) {
        NotificationManager nm = c.getSystemService(NotificationManager.class);
        android.content.SharedPreferences sp = Store.prefs(c);
        JSONObject si = cfg.optJSONObject("silence"), iq = cfg.optJSONObject("iqama");
        boolean ours = sp.getBoolean("dndOurs", false), granted = nm != null && nm.isNotificationPolicyAccessGranted();
        boolean on = si != null && si.optBoolean("on") && !cfg.optBoolean("excused", false) && granted;
        long next = Long.MAX_VALUE, until = 0;
        if (on) for (int off = 0; off <= 1; off++) {
            PrayerCalc.Day d = PrayerCalc.dayAt(now, off, o);
            Calendar dw = Calendar.getInstance(PrayerCalc.zone(o)); dw.setTimeInMillis(d.dhuhr);
            boolean fri = dw.get(Calendar.DAY_OF_WEEK) == Calendar.FRIDAY;
            for (String k : PrayerCalc.PRAYERS) {
                long start = d.get(k) + ((iq != null && iq.optBoolean("on")) ? iq.optInt(k, 15) : 10) * MIN - MIN;
                long end = start + ((fri && k.equals("dhuhr")) ? si.optInt("jumuah", 50) : si.optInt("min", 20)) * MIN;
                if (now >= start && now < end) until = Math.max(until, end);
                if (start > now + 5000) next = Math.min(next, start);
                if (end > now + 5000) next = Math.min(next, end);
            }
        }
        try {
            if (until > 0) {
                if (!ours && nm.getCurrentInterruptionFilter() == NotificationManager.INTERRUPTION_FILTER_ALL) {
                    nm.setInterruptionFilter(NotificationManager.INTERRUPTION_FILTER_ALARMS);
                    sp.edit().putBoolean("dndOurs", true).apply();
                }
            } else if (ours) {
                if (granted && nm.getCurrentInterruptionFilter() == NotificationManager.INTERRUPTION_FILTER_ALARMS) nm.setInterruptionFilter(NotificationManager.INTERRUPTION_FILTER_ALL);
                sp.edit().putBoolean("dndOurs", false).apply();
            }
        } catch (SecurityException ignored) { }
        return next;
    }

    /** The floating dhikr over other apps: at the chosen interval, from Fajr until an hour after ʿIshāʾ, never while
     *  the app is open or the phone is silenced for ṣalāh. Returns when it is next due. */
    static long nudge(Context c, JSONObject cfg, PrayerCalc.Opts o, long now) {
        JSONObject n = cfg.optJSONObject("nudge");
        if (n == null || !n.optBoolean("on") || !n.optBoolean("over") || !Overlay.allowed(c)) return Long.MAX_VALUE;
        long every = Math.max(10, n.optInt("every", 20)) * MIN;
        android.content.SharedPreferences sp = Store.prefs(c);
        long at = sp.getLong("nudgeAt", 0);
        if (at == 0 || (at > now + every && at > now + 18 * 3600 * 1000L)) { at = now + every; sp.edit().putLong("nudgeAt", at).apply(); }
        PrayerCalc.Day d = PrayerCalc.dayAt(now, 0, o);
        boolean awake = now >= d.fajr + 20 * MIN && now < d.isha + 60 * MIN;
        if (now >= at - 5000) {
            if (awake && !MainActivity.visible && !sp.getBoolean("dndOurs", false)) Overlay.show(c, Overlay.next(c, n));
            at = now + every; sp.edit().putLong("nudgeAt", at).apply();
        }
        /* at night the next one waits for the morning, so the phone is not woken every few minutes */
        if (!awake) {
            long wake = now < d.fajr + 20 * MIN ? d.fajr + 20 * MIN : PrayerCalc.dayAt(now, 1, o).fajr + 20 * MIN;
            if (wake > at) { at = wake; sp.edit().putLong("nudgeAt", at).apply(); }
        }
        return at;
    }

    /** Fire anything due now, then re-arm. */
    static void run(Context c) {
        try { runUnsafe(c); } catch (Throwable t) { android.util.Log.w("Adhkar", "scheduler", t); }
    }

    private static void runUnsafe(Context c) {
        JSONObject cfg = Store.config(c);   /* read first: it sets the language for the channel names */
        channels(c);
        PrayerCalc.Opts o = Store.opts(cfg);
        Widgets.updateAll(c);
        AlarmManager am = c.getSystemService(AlarmManager.class);
        PendingIntent tick = PendingIntent.getBroadcast(c, 1, new Intent(c, AlarmReceiver.class).setAction(ACTION_TICK), PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        if (o == null) { if (am != null) am.cancel(tick); return; }
        long now = System.currentTimeMillis(), last = Store.prefs(c).getLong("lastFired", now - 2 * MIN);
        List<Ev> evs = new ArrayList<>();
        for (int off = -1; off <= 1; off++) evs.addAll(events(c, cfg, o, off));
        for (Ev e : evs) if (e.at > last && e.at <= now + 5000 && now - e.at < 15 * MIN) {
            post(c, e);
            JSONObject ju = cfg.optJSONObject("jumuah");
            if (e.id.startsWith("fh-") && ju != null && ju.optBoolean("overlay", true) && !MainActivity.visible && !Store.prefs(c).getBoolean("dndOurs", false))
                Overlay.hour(c, e.text, e.route);
        }
        Store.prefs(c).edit().putLong("lastFired", now + 5000).apply();
        long next = Long.MAX_VALUE;
        for (Ev e : evs) if (e.at > now + 5000 && e.at < next) next = e.at;
        for (int off = 0; off <= 1; off++) {
            PrayerCalc.Day d = PrayerCalc.dayAt(now, off, o);
            for (String k : PrayerCalc.ORDER) { long t = d.get(k); if (t > now + 5000 && t < next) next = t; }
            long[] extra = {d.lastThird, d.maghrib - 60 * MIN, d.fajr + 20 * MIN, d.dhuhr + 20 * MIN, d.asr + 20 * MIN, d.maghrib + 20 * MIN, d.isha + 20 * MIN};
            for (long t : extra) if (t > now + 5000 && t < next) next = t;
        }
        next = Math.min(next, silence(c, cfg, o, now));
        next = Math.min(next, nudge(c, cfg, o, now));
        Calendar mid = Calendar.getInstance(PrayerCalc.zone(o)); mid.setTimeInMillis(now); mid.add(Calendar.DATE, 1);
        mid.set(Calendar.HOUR_OF_DAY, 0); mid.set(Calendar.MINUTE, 0); mid.set(Calendar.SECOND, 5); mid.set(Calendar.MILLISECOND, 0);
        next = Math.min(next, mid.getTimeInMillis());
        if (am == null) return;
        if (Build.VERSION.SDK_INT < 31 || am.canScheduleExactAlarms()) am.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, next, tick);
        else am.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, next, tick);
    }

    static PendingIntent open(Context c, String route, int req) {
        Intent i = new Intent(c, MainActivity.class).setAction(Intent.ACTION_VIEW).setData(Uri.parse("adhkar://route/" + route.replaceFirst("^#/?", "")))
                .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        return PendingIntent.getActivity(c, req, i, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
    }

    static void post(Context c, Ev e) {
        NotificationManager nm = c.getSystemService(NotificationManager.class);
        if (nm == null) return;
        int id = e.id.replaceAll("-\\d{4}-\\d{2}-\\d{2}$", "").hashCode();
        Notification.Builder b = new Notification.Builder(c, e.ch)
                .setSmallIcon(R.drawable.ic_notif).setColor(0xFFD9B26F)
                .setContentTitle(e.title).setContentText(e.text).setStyle(new Notification.BigTextStyle().bigText(e.text))
                .setContentIntent(open(c, e.route, id)).setAutoCancel(true).setWhen(e.at).setShowWhen(true)
                .setCategory(prayerCh(e.ch) ? Notification.CATEGORY_REMINDER : Notification.CATEGORY_RECOMMENDATION);
        if (e.action != null) b.addAction(new Notification.Action.Builder(null, e.action, open(c, e.actionRoute, id + 1)).build());
        if (prayerCh(e.ch) && e.id.matches("p-[a-z]+-\\d{4}-\\d{2}-\\d{2}")) {
            /* log the prayer straight from the notification */
            String k = e.id.substring(2, e.id.length() - 11), day = e.id.substring(e.id.length() - 10);
            Intent pr = new Intent(c, AlarmReceiver.class).setAction(ACTION_PRAYED_N).putExtra("d", day).putExtra("p", k).putExtra("nid", id);
            b.addAction(new Notification.Action.Builder(null, L.t("Prayed", "صلّيت"), PendingIntent.getBroadcast(c, id + 3, pr, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE)).build());
        }
        if (e.snooze) {
            Intent s = new Intent(c, AlarmReceiver.class).setAction(ACTION_SNOOZE)
                    .putExtra("id", e.id).putExtra("ch", e.ch).putExtra("title", e.title).putExtra("text", e.text).putExtra("route", e.route)
                    .putExtra("action", e.action).putExtra("actionRoute", e.actionRoute);
            b.addAction(new Notification.Action.Builder(null, L.t("In 15 min", "بعد ١٥ دقيقة"), PendingIntent.getBroadcast(c, id + 2, s, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE)).build());
        }
        try { nm.notify(id, b.build()); } catch (SecurityException ignored) { }
    }
}
