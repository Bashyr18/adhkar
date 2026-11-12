package com.adhkar.app;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.os.SystemClock;
import android.widget.RemoteViews;

import org.json.JSONObject;

/** Builds RemoteViews for the prayer and tracker widgets. */
final class Widgets {
    private Widgets() {}
    static final String ACTION_TAP = "com.adhkar.app.TASBIH_TAP", ACTION_RESET = "com.adhkar.app.TASBIH_RESET", ACTION_PRAYED = "com.adhkar.app.PRAYED", ACTION_ROUND = "com.adhkar.app.TASBIH_ROUND";
    private static final int[] COL_C = {R.id.c0, R.id.c1, R.id.c2, R.id.c3, R.id.c4};
    private static final int DIM = 0x99F5F0E7, WHITE = 0xFFF5F0E7;
    private static int GOLD = 0xFFF1D59E;
    /** the app's accent, so "done" and the current prayer follow the colour the user chose */
    static int accent(JSONObject cfg) {
        try { String h = cfg.optString("accent", ""); if (h.matches("#[0-9a-fA-F]{6}")) return 0xFF000000 | Integer.parseInt(h.substring(1), 16); } catch (Exception ignored) { }
        return 0xFFF1D59E;
    }
    private static final int[] COL_N = {R.id.n0, R.id.n1, R.id.n2, R.id.n3, R.id.n4};
    private static final int[] COL_T = {R.id.t0, R.id.t1, R.id.t2, R.id.t3, R.id.t4};

    static void updateAll(Context c) {
        try { updateAllUnsafe(c); } catch (Throwable t) { android.util.Log.w("Adhkar", "widgets", t); }
    }

    private static void updateAllUnsafe(Context c) {
        AppWidgetManager m = AppWidgetManager.getInstance(c);
        int[] p = m.getAppWidgetIds(new ComponentName(c, PrayerWidget.class));
        if (p.length > 0) {
            RemoteViews v;
            if (android.os.Build.VERSION.SDK_INT >= 31) {
                java.util.Map<android.util.SizeF, RemoteViews> sizes = new java.util.HashMap<>();
                sizes.put(new android.util.SizeF(110f, 110f), prayerSmall(c));
                sizes.put(new android.util.SizeF(250f, 110f), prayer(c));
                v = new RemoteViews(sizes);
            } else v = prayer(c);
            for (int id : p) m.updateAppWidget(id, v);
        }
        int[] a = m.getAppWidgetIds(new ComponentName(c, AdhkarWidget.class));
        if (a.length > 0) { RemoteViews v = adhkar(c); for (int id : a) m.updateAppWidget(id, v); }
        int[] dz = m.getAppWidgetIds(new ComponentName(c, DhikrWidget.class));
        if (dz.length > 0) { RemoteViews v = dhikr(c); for (int id : dz) m.updateAppWidget(id, v); }
        int[] t = m.getAppWidgetIds(new ComponentName(c, TasbihWidget.class));
        if (t.length > 0) { RemoteViews v = tasbih(c); for (int id : t) m.updateAppWidget(id, v); }
    }

    /** live state: a widget toggle not yet synced wins, otherwise what the app last reported */
    static boolean isPrayed(Context c, String day, String p) {
        Boolean w = Store.widgetPrayed(c, day, p);
        if (w != null) return w.booleanValue();
        JSONObject t = Store.config(c).optJSONObject("today");
        JSONObject pr = t != null && day.equals(t.optString("key")) ? t.optJSONObject("prayed") : null;
        return pr != null && pr.has(p);
    }

    static RemoteViews prayer(Context c) {
        RemoteViews v = new RemoteViews(c.getPackageName(), R.layout.widget_prayer);
        v.setOnClickPendingIntent(R.id.root, Scheduler.open(c, "#/salah", 100));
        JSONObject cfg = Store.config(c);
        GOLD = accent(cfg);
        PrayerCalc.Opts o = Store.opts(cfg);
        if (o == null) {
            v.setTextViewText(R.id.label, L.t("ADHKĀR", "الأذكار"));
            v.setTextViewText(R.id.name, L.t("Set location", "حدّد الموقع"));
            v.setTextViewText(R.id.at, L.t("Open the app to see prayer times", "افتح التطبيق لعرض المواقيت"));
            v.setTextViewText(R.id.hijri, ""); v.setTextViewText(R.id.place, "");
            v.setViewVisibility(R.id.countdown, android.view.View.GONE);
            v.setViewVisibility(R.id.row, android.view.View.GONE);
            return v;
        }
        long now = System.currentTimeMillis();
        PrayerCalc.Day d = PrayerCalc.dayAt(now, 0, o), tm = PrayerCalc.dayAt(now, 1, o);
        String nk = null; long nat = 0;
        for (String k : PrayerCalc.ORDER) { if (d.get(k) > now) { nk = k; nat = d.get(k); break; } }
        if (nk == null) { nk = "fajr"; nat = tm.fajr; }
        /* at high latitudes last night's ʿishāʾ can fall after midnight: until it comes, it is next */
        long yIsha = PrayerCalc.dayAt(now, -1, o).isha; boolean lateIsha = yIsha != Long.MIN_VALUE && yIsha > now;
        if (lateIsha) { nk = "isha"; nat = yIsha; }
        String cur = null;
        for (String k : PrayerCalc.PRAYERS) if (d.get(k) <= now) cur = k;
        if (now >= d.sunrise && now < d.dhuhr) cur = null;
        if (lateIsha) cur = null;
        v.setInt(R.id.root, "setBackgroundResource", sky(d, now));
        v.setTextViewText(R.id.hijri, Store.hijri(cfg, o));
        v.setTextViewText(R.id.place, Store.locName(cfg));
        v.setTextViewText(R.id.label, nk.equals("sunrise") ? L.t("FAJR ENDS AT", "ينتهي الفجر") : L.t("NEXT PRAYER", "الصلاة القادمة"));
        v.setTextViewText(R.id.name, Store.name(nk));
        v.setTextViewText(R.id.at, Store.fmtTime(cfg, o, nat));
        v.setViewVisibility(R.id.countdown, android.view.View.VISIBLE);
        v.setChronometerCountDown(R.id.countdown, true);
        v.setChronometer(R.id.countdown, SystemClock.elapsedRealtime() + (nat - now), L.t("in %s", "بعد %s"), true);
        v.setViewVisibility(R.id.row, android.view.View.VISIBLE);
        JSONObject today = cfg.optJSONObject("today");
        String dayKey = PrayerCalc.key(d);
        boolean sameDay = today != null && dayKey.equals(today.optString("key")), excused = cfg.optBoolean("excused", false);
        JSONObject prayed = sameDay ? today.optJSONObject("prayed") : null;
        for (int i = 0; i < 5; i++) {
            String k = PrayerCalc.PRAYERS[i];
            boolean on = k.equals(cur);
            Boolean w = Store.widgetPrayed(c, dayKey, k);
            boolean done = w != null ? w.booleanValue() : prayed != null && prayed.has(k);
            boolean due = d.get(k) <= now;
            v.setTextViewText(COL_N[i], (done ? "\u2713 " : "") + Store.name(k));
            v.setTextViewText(COL_T[i], Store.fmtTime(cfg, o, d.get(k)).replace(" am", "").replace(" pm", "").replace(" ص", "").replace(" م", ""));
            v.setTextColor(COL_N[i], done ? GOLD : on ? GOLD : DIM);
            v.setTextColor(COL_T[i], on ? GOLD : WHITE);
            v.setInt(COL_C[i], "setBackgroundResource", on ? R.drawable.widget_cell_on : R.drawable.widget_cell);
            if (due && !excused) {
                Intent t = new Intent(c, PrayerWidget.class).setAction(ACTION_PRAYED).putExtra("p", k).putExtra("d", dayKey);
                v.setOnClickPendingIntent(COL_C[i], PendingIntent.getBroadcast(c, 300 + i, t, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE));
            } else v.setOnClickPendingIntent(COL_C[i], Scheduler.open(c, "#/salah", 310 + i));
        }
        long prevAt = d.fajr; for (String k : PrayerCalc.ORDER) if (d.get(k) <= now) prevAt = d.get(k);
        if (now < d.fajr) prevAt = lateIsha ? PrayerCalc.dayAt(now, -1, o).maghrib : yIsha;
        v.setProgressBar(R.id.prog, 1000, (int) Math.max(0, Math.min(1000, (now - prevAt) * 1000 / Math.max(1, nat - prevAt))), false);
        String st = "";
        if (sameDay) {
            st = L.t("Morning", "الصباح") + (today.optBoolean("morning") ? " ✓" : " ○") + "   " + L.t("Evening", "المساء") + (today.optBoolean("evening") ? " ✓" : " ○");
            JSONObject s = today.optJSONObject("salah");
            if (s != null) { int n = 0; for (String k : PrayerCalc.PRAYERS) if (s.optBoolean(k)) n++; st += "   " + L.t("After ṣalāh ", "بعد الصلاة ") + L.n(n + "/5"); }
        }
        v.setTextViewText(R.id.status, st);
        return v;
    }

    /** the sky behind the prayer widget follows the day: dawn, day, the golden hour of ʿaṣr, dusk, night */
    static int sky(PrayerCalc.Day d, long now) {
        if (now >= d.fajr && now < d.sunrise) return R.drawable.widget_bg_dawn;
        if (now >= d.sunrise && now < d.asr) return R.drawable.widget_bg_day;
        if (now >= d.asr && now < d.maghrib) return R.drawable.widget_bg_asr;
        if (now >= d.maghrib && now < d.isha) return R.drawable.widget_bg_dusk;
        return R.drawable.widget_bg_night;
    }

    private static final int[] DOTS = {R.id.d0, R.id.d1, R.id.d2, R.id.d3, R.id.d4};

    static RemoteViews prayerSmall(Context c) {
        RemoteViews v = new RemoteViews(c.getPackageName(), R.layout.widget_prayer_small);
        v.setOnClickPendingIntent(R.id.root, Scheduler.open(c, "#/salah", 101));
        JSONObject cfg = Store.config(c);
        GOLD = accent(cfg);
        PrayerCalc.Opts o = Store.opts(cfg);
        if (o == null) { v.setTextViewText(R.id.name, L.t("Set location", "حدّد الموقع")); v.setTextViewText(R.id.at, L.t("Open Adhkār", "افتح التطبيق")); return v; }
        long now = System.currentTimeMillis();
        PrayerCalc.Day d = PrayerCalc.dayAt(now, 0, o), tm = PrayerCalc.dayAt(now, 1, o);
        String nk = null; long nat = 0;
        for (String k : PrayerCalc.ORDER) { if (d.get(k) > now) { nk = k; nat = d.get(k); break; } }
        if (nk == null) { nk = "fajr"; nat = tm.fajr; }
        /* at high latitudes last night's ʿishāʾ can fall after midnight: until it comes, it is next */
        long yIsha = PrayerCalc.dayAt(now, -1, o).isha; boolean lateIsha = yIsha != Long.MIN_VALUE && yIsha > now;
        if (lateIsha) { nk = "isha"; nat = yIsha; }
        v.setInt(R.id.root, "setBackgroundResource", sky(d, now));
        v.setTextViewText(R.id.label, nk.equals("sunrise") ? L.t("FAJR ENDS", "ينتهي الفجر") : L.t("NEXT PRAYER", "الصلاة القادمة"));
        v.setTextViewText(R.id.name, Store.name(nk));
        v.setTextViewText(R.id.at, Store.fmtTime(cfg, o, nat));
        v.setChronometerCountDown(R.id.countdown, true);
        v.setChronometer(R.id.countdown, SystemClock.elapsedRealtime() + (nat - now), L.t("in %s", "بعد %s"), true);
        String dayKey = PrayerCalc.key(d);
        boolean excused = cfg.optBoolean("excused", false);
        for (int i = 0; i < 5; i++) {
            String k = PrayerCalc.PRAYERS[i];
            boolean done = isPrayed(c, dayKey, k), due = d.get(k) <= now;
            v.setTextViewText(DOTS[i], done ? "\u2713" : "\u25cf");
            v.setTextColor(DOTS[i], excused ? 0x33F5F0E7 : done ? GOLD : due ? (GOLD & 0x00FFFFFF) | 0xCC000000 : 0x40F5F0E7);
        }
        return v;
    }

    private static final int[] CHIP = {R.id.k0, R.id.k1, R.id.k2}, CHIP_V = {R.id.kv0, R.id.kv1, R.id.kv2};
    private static final String[] SESS = {"morning", "evening", "sleep"};

    /** whichever adhkār are due now, with progress; the three sessions of the day below */
    static RemoteViews adhkar(Context c) {
        RemoteViews v = new RemoteViews(c.getPackageName(), R.layout.widget_adhkar);
        JSONObject cfg = Store.config(c), prog = cfg.optJSONObject("prog"), n = cfg.optJSONObject("notif");
        GOLD = accent(cfg);
        PrayerCalc.Opts o = Store.opts(cfg);
        long now = System.currentTimeMillis();
        String sess = "morning"; String when = L.t("THIS MORNING", "هذا الصباح"); int bg = R.drawable.widget_bg_day;
        if (o != null) {
            PrayerCalc.Day d = PrayerCalc.dayAt(now, 0, o);
            boolean eveFromMaghrib = n != null && n.optJSONObject("evening") != null && "maghrib".equals(n.optJSONObject("evening").optString("from"));
            long eve = eveFromMaghrib ? d.maghrib : d.asr;
            if (now >= d.fajr && now < eve) { sess = "morning"; when = now < d.sunrise ? L.t("BEFORE SUNRISE", "قبل الشروق") : L.t("THIS MORNING", "هذا الصباح"); bg = now < d.sunrise ? R.drawable.widget_bg_dawn : R.drawable.widget_bg_day; }
            else if (now >= eve && now < d.isha) { sess = "evening"; when = L.t("THIS EVENING", "هذا المساء"); bg = now < d.maghrib ? R.drawable.widget_bg_asr : R.drawable.widget_bg_dusk; }
            else { sess = "sleep"; when = L.t("BEFORE YOU SLEEP", "قبل النوم"); bg = R.drawable.widget_bg_night; }
        }
        /* progress belongs to the day it was synced; after midnight it starts at zero until the app syncs again */
        JSONObject td = cfg.optJSONObject("today");
        if (o != null && (td == null || !Store.todayKey(o).equals(td.optString("key")))) prog = null;
        double f = prog == null ? 0 : prog.optDouble(sess, 0);
        boolean done = f >= 0.999;
        v.setInt(R.id.root, "setBackgroundResource", bg);
        v.setTextViewText(R.id.when, when);
        v.setTextViewText(R.id.title, sess.equals("morning") ? L.t("Morning adhkār", "أذكار الصباح") : sess.equals("evening") ? L.t("Evening adhkār", "أذكار المساء") : L.t("Adhkār of sleep", "أذكار النوم"));
        v.setTextViewText(R.id.sub, done ? L.t("Complete · mā shāʾ Allāh", "اكتملت · ما شاء الله") : f > 0 ? L.t("Tap to continue where you left off", "اضغط للمتابعة من حيث توقفت") : sess.equals("sleep") ? L.t("Āyat al-Kursī, the three Quls and more", "آية الكرسي والمعوذات وغيرها") : L.t("Tap to begin", "اضغط للبدء"));
        v.setTextViewText(R.id.kl0, L.t("MORNING", "الصباح")); v.setTextViewText(R.id.kl1, L.t("EVENING", "المساء")); v.setTextViewText(R.id.kl2, L.t("SLEEP", "النوم"));
        v.setProgressBar(R.id.ring, 100, (int) Math.round(f * 100), false);
        if (android.os.Build.VERSION.SDK_INT >= 31) v.setColorStateList(R.id.ring, "setProgressTintList", android.content.res.ColorStateList.valueOf(GOLD));
        v.setTextViewText(R.id.pct, done ? "\u2713" : L.n(Math.round(f * 100) + "%"));
        for (int i = 0; i < 3; i++) {
            double g = prog == null ? 0 : prog.optDouble(SESS[i], 0);
            v.setTextViewText(CHIP_V[i], g >= 0.999 ? "\u2713" : L.n(Math.round(g * 100) + "%"));
            v.setInt(CHIP[i], "setBackgroundResource", g >= 0.999 ? R.drawable.widget_chip_on : R.drawable.widget_chip);
            v.setTextColor(CHIP_V[i], g >= 0.999 ? GOLD : WHITE);
            if (android.os.Build.VERSION.SDK_INT >= 31) v.setColorStateList(CHIP[i], "setBackgroundTintList", g >= 0.999 ? android.content.res.ColorStateList.valueOf((GOLD & 0x00FFFFFF) | 0x33000000) : null);
            v.setOnClickPendingIntent(CHIP[i], Scheduler.open(c, "#/c/" + SESS[i], 120 + i));
        }
        v.setOnClickPendingIntent(R.id.root, Scheduler.open(c, "#/c/" + sess, 119));
        return v;
    }

    /** the dhikr of the day; during an authentic time of answered duʿāʾ the card says so */
    static RemoteViews dhikr(Context c) {
        RemoteViews v = new RemoteViews(c.getPackageName(), R.layout.widget_dhikr);
        JSONObject cfg = Store.config(c), dd = cfg.optJSONObject("dod");
        GOLD = accent(cfg);
        PrayerCalc.Opts o = Store.opts(cfg);
        String answer = null;
        if (o != null) {
            long now = System.currentTimeMillis();
            PrayerCalc.Day d = PrayerCalc.dayAt(now, 0, o), y = PrayerCalc.dayAt(now, -1, o);
            java.util.Calendar cal = java.util.Calendar.getInstance(PrayerCalc.zone(o)); cal.setTimeInMillis(now);
            boolean friday = cal.get(java.util.Calendar.DAY_OF_WEEK) == java.util.Calendar.FRIDAY;
            if ((now >= y.lastThird && now < d.fajr) || now >= d.lastThird) answer = L.t("THE LAST THIRD OF THE NIGHT", "ثلث الليل الآخر");
            else if (friday && now >= d.maghrib - 60 * 60000L && now < d.maghrib) answer = L.t("THE LAST HOUR OF FRIDAY", "آخر ساعة من الجمعة");
            else for (String k : PrayerCalc.PRAYERS) { long t = d.get(k); if (now >= t && now < t + 20 * 60000L) { answer = L.t("BETWEEN ADHĀN AND IQĀMAH", "بين الأذان والإقامة"); break; } }
        }
        v.setInt(R.id.root, "setBackgroundResource", answer != null ? R.drawable.widget_bg_answer : R.drawable.widget_bg_dhikr);
        v.setTextViewText(R.id.label, answer != null ? "\u2726  " + answer : L.t("DHIKR OF THE DAY", "ذكر اليوم"));
        if (dd == null) {
            v.setTextViewText(R.id.ar, "أَلَا بِذِكْرِ اللَّهِ تَطْمَئِنُّ الْقُلُوبُ");
            v.setTextViewText(R.id.en, L.ar ? "" : "Unquestionably, by the remembrance of Allah hearts are assured.");
            v.setTextViewText(R.id.src, L.t("Ar-Raʿd 13:28", "الرعد ١٣:٢٨"));
            v.setOnClickPendingIntent(R.id.root, Scheduler.open(c, "#/", 130));
            return v;
        }
        v.setTextViewText(R.id.ar, dd.optString("ar"));
        v.setTextViewText(R.id.en, L.ar ? "" : dd.optString("en"));   /* Arabic readers read the dhikr itself */
        v.setTextViewText(R.id.src, answer != null ? L.t("Duʿāʾ is answered", "الدعاء مستجاب") : dd.optString("src"));
        v.setTextColor(R.id.src, answer != null ? 0xFFF1D59E : 0x80F5F0E7);
        v.setOnClickPendingIntent(R.id.root, Scheduler.open(c, dd.optString("route", "#/"), 130));
        return v;
    }

    /** the tracker sizes itself to the widget: compact at 2x2, a larger ring when enlarged, the day's Sunnah numbers when wide */
    static RemoteViews tasbih(Context c) {
        if (android.os.Build.VERSION.SDK_INT < 31) return tasbih(c, R.layout.widget_tasbih);
        java.util.Map<android.util.SizeF, RemoteViews> sizes = new java.util.HashMap<>();
        sizes.put(new android.util.SizeF(100f, 100f), tasbih(c, R.layout.widget_tasbih));
        sizes.put(new android.util.SizeF(170f, 230f), tasbih(c, R.layout.widget_tasbih_large));
        sizes.put(new android.util.SizeF(250f, 150f), tasbih(c, R.layout.widget_tasbih_wide));
        return new RemoteViews(sizes);
    }

    /** the tracker as the app last reported it, with what the widget did since applied on top */
    static final class Trk {
        String id = "subhanallah", ar = "سُبْحَانَ اللَّهِ", tr = "Subḥānallāh", day;
        int target = 33, round = 100, live, today, goal = 100, after; boolean fingers = true;
        String[] gid = {}, gname = {}; int[] gn = {}, gg = {};
    }

    static Trk trk(Context c, JSONObject cfg) {
        Trk k = new Trk(); JSONObject t = cfg.optJSONObject("tasbih");
        k.day = Store.todayKey(Store.opts(cfg));
        boolean same = false;
        if (t != null) {
            k.id = t.optString("id", k.id); k.ar = t.optString("ar", ""); k.tr = t.optString("tr", "");
            k.target = t.optInt("target", 0); k.round = Math.max(1, t.optInt("round", 33)); k.live = t.optInt("live", 0);
            k.goal = t.optInt("goal", 0); k.after = t.optInt("after", 0); k.fingers = t.optBoolean("fingers", true);
            same = k.day.equals(t.optString("day"));
            k.today = same ? t.optInt("today", 0) : 0;   /* yesterday's count does not carry past midnight */
            org.json.JSONArray g = t.optJSONArray("goals");
            int n = g == null ? 0 : Math.min(3, g.length());
            k.gid = new String[n]; k.gname = new String[n]; k.gn = new int[n]; k.gg = new int[n];
            for (int i = 0; i < n; i++) {
                JSONObject x = g.optJSONObject(i); if (x == null) x = new JSONObject();
                k.gid[i] = x.optString("id"); k.gname[i] = L.ar && !x.optString("ar").isEmpty() ? x.optString("ar") : x.optString("tr");
                k.gn[i] = same ? x.optInt("n", 0) : 0; k.gg[i] = Math.max(1, x.optInt("g", 100));
            }
        }
        org.json.JSONArray ev = Store.trackerEvents(c);
        for (int i = 0; i < ev.length(); i++) {
            JSONObject e = ev.optJSONObject(i); if (e == null) continue;
            String kind = e.optString("k"), id = e.optString("id"); int n = e.optInt("n", 0);
            if ("reset".equals(kind)) { k.live = 0; continue; }
            if ("tap".equals(kind) && id.equals(k.id)) k.live += n;
            if (!k.day.equals(e.optString("d"))) continue;
            if (id.equals(k.id)) k.today += n;
            for (int j = 0; j < k.gid.length; j++) if (id.equals(k.gid[j])) k.gn[j] += n;
        }
        return k;
    }

    /** a round finished on the fingers is logged with a second tap, so a stray touch never adds a hundred */
    static boolean armed(Context c) { long a = Store.prefs(c).getLong("tArm", 0), d = SystemClock.elapsedRealtime() - a; return a > 0 && d >= 0 && d < ARM_LIVE; }
    /* the button settles back after ARM_MS; an alarm can run late, so a second tap stays valid while it still says so */
    static final long ARM_MS = 5000, ARM_LIVE = 60000;

    private static final int[] G = {R.id.g0, R.id.g1, R.id.g2}, GN = {R.id.gn0, R.id.gn1, R.id.gn2}, GV = {R.id.gv0, R.id.gv1, R.id.gv2}, GB = {R.id.gb0, R.id.gb1, R.id.gb2};

    static RemoteViews tasbih(Context c, int layout) {
        RemoteViews v = new RemoteViews(c.getPackageName(), layout);
        JSONObject cfg = Store.config(c);
        GOLD = accent(cfg);
        Trk k = trk(c, cfg);
        boolean wide = layout == R.layout.widget_tasbih_wide, large = layout == R.layout.widget_tasbih_large;
        android.content.res.ColorStateList tint = android.content.res.ColorStateList.valueOf(GOLD);
        boolean tint31 = android.os.Build.VERSION.SDK_INT >= 31;
        v.setTextViewText(R.id.ar, k.ar.isEmpty() ? k.tr : k.ar);
        v.setTextColor(R.id.ar, GOLD);
        if (large) v.setTextViewText(R.id.tr, k.ar.isEmpty() || L.ar ? "" : k.tr);
        String goalLine = k.goal > 0 ? (k.today >= k.goal ? "✓ " : "") + L.t("Today ", "اليوم ") + L.n(Math.min(k.today, k.goal)) + " / " + L.n(k.goal) + (k.today > k.goal ? "  +" + L.n(k.today - k.goal) : "")
            : k.after > 0 ? L.t("Today ", "اليوم ") + L.n(k.today) + L.t("  ·  33 after each prayer", "  ·  ٣٣ بعد كل صلاة")
            : L.t("Today ", "اليوم ") + L.n(k.today);
        if (k.fingers) {
            /* as in the app: you count on your fingers; the ring is the day against the Sunnah's number */
            int f = k.goal > 0 ? (int) Math.min(1000, (long) k.today * 1000 / k.goal) : 0;
            v.setTextViewText(R.id.count, L.n(k.today));
            v.setTextViewText(R.id.of, k.goal > 0 ? L.t("of ", "من ") + L.n(k.goal) : L.t("today", "اليوم"));
            v.setProgressBar(R.id.tprog, 1000, f, false);
            v.setTextViewText(R.id.today, wide ? goalLine : k.goal > 0 && k.today >= k.goal ? L.t("✓ Done for today", "✓ اكتمل اليوم") : L.t("On your fingers · ", "على الأصابع · ") + L.t("rounds of ", "جولات من ") + L.n(k.round));
            v.setTextColor(R.id.today, k.goal > 0 && k.today >= k.goal ? GOLD : DIM);
            boolean arm = armed(c);
            v.setViewVisibility(R.id.round, android.view.View.VISIBLE);
            v.setTextViewText(R.id.round, arm ? L.t("Tap again to log ", "اضغط مجددًا لتسجيل ") + L.n(k.round) : L.t("✓  Finished ", "✓  أتممت ") + L.n(k.round));
            v.setInt(R.id.round, "setBackgroundResource", arm ? R.drawable.widget_chip_arm : R.drawable.widget_chip);
            v.setTextColor(R.id.round, arm ? GOLD : WHITE);
            v.setOnClickPendingIntent(R.id.round, PendingIntent.getBroadcast(c, 203, new Intent(c, TasbihWidget.class).setAction(ACTION_ROUND), PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE));
            v.setViewVisibility(R.id.reset, wide ? android.view.View.GONE : android.view.View.INVISIBLE);
            /* the ring opens the tracker, where the circle keeps the pace */
            v.setOnClickPendingIntent(R.id.face, Scheduler.open(c, "#/tracker", 204));
            if (!wide) v.setViewVisibility(R.id.today, android.view.View.VISIBLE);
        } else {
            int t = k.target, shown = t > 0 && k.live > 0 ? ((k.live - 1) % t) + 1 : k.live, laps = t > 0 ? k.live / t : 0;
            v.setTextViewText(R.id.count, L.n(shown));
            v.setTextViewText(R.id.of, (t > 0 ? L.t("of ", "من ") + L.n(t) : L.t("tap to count", "اضغط للعد")) + (laps > 0 ? "  ·  ×" + L.n(laps) : ""));
            v.setProgressBar(R.id.tprog, 1000, t > 0 ? shown * 1000 / t : 0, false);
            v.setTextViewText(R.id.today, goalLine);
            v.setTextColor(R.id.today, k.goal > 0 && k.today >= k.goal ? GOLD : DIM);
            v.setViewVisibility(R.id.round, android.view.View.GONE);
            v.setViewVisibility(R.id.reset, k.live > 0 ? android.view.View.VISIBLE : android.view.View.INVISIBLE);
            v.setOnClickPendingIntent(R.id.face, PendingIntent.getBroadcast(c, 200, new Intent(c, TasbihWidget.class).setAction(ACTION_TAP), PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE));
            v.setOnClickPendingIntent(R.id.reset, PendingIntent.getBroadcast(c, 201, new Intent(c, TasbihWidget.class).setAction(ACTION_RESET), PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE));
        }
        if (tint31) v.setColorStateList(R.id.tprog, "setProgressTintList", tint);
        v.setOnClickPendingIntent(R.id.open, Scheduler.open(c, "#/tracker", 202));
        v.setOnClickPendingIntent(R.id.root, Scheduler.open(c, "#/tracker", 205));
        if (wide) {
            /* the numbers the Sunnah sets for the day, each opening the tracker on its phrase */
            v.setTextViewText(R.id.gh, L.t("THE SUNNAH, TODAY", "سنة اليوم"));
            for (int i = 0; i < 3; i++) {
                if (i >= k.gid.length) { v.setViewVisibility(G[i], android.view.View.GONE); continue; }
                boolean met = k.gn[i] >= k.gg[i], cur = k.gid[i].equals(k.id);
                v.setViewVisibility(G[i], android.view.View.VISIBLE);
                v.setTextViewText(GN[i], (met ? "✓ " : "") + k.gname[i]);
                v.setTextColor(GN[i], met || cur ? GOLD : 0xE6F5F0E7);
                v.setTextViewText(GV[i], L.n(Math.min(k.gn[i], k.gg[i])) + "/" + L.n(k.gg[i]));
                v.setTextColor(GV[i], met ? GOLD : DIM);
                v.setProgressBar(GB[i], 1000, (int) Math.min(1000, (long) k.gn[i] * 1000 / k.gg[i]), false);
                if (tint31) v.setColorStateList(GB[i], "setProgressTintList", tint);
                v.setOnClickPendingIntent(G[i], Scheduler.open(c, "#/tracker/" + k.gid[i], 210 + i));
            }
        }
        return v;
    }
}
