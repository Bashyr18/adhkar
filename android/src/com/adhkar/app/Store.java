package com.adhkar.app;

import android.content.Context;
import android.content.SharedPreferences;

import org.json.JSONObject;

import java.text.SimpleDateFormat;
import java.util.Calendar;
import java.util.Date;
import java.util.Locale;
import java.util.TimeZone;

/** Native-side state: the config mirrored from the web app (via sync) plus widget counters. */
final class Store {
    private Store() {}
    private static final String PREFS = "adhkar";

    static SharedPreferences prefs(Context c) { return c.getSharedPreferences(PREFS, Context.MODE_PRIVATE); }

    static void saveConfig(Context c, String json) { prefs(c).edit().putString("config", json).apply(); }

    static JSONObject config(Context c) {
        JSONObject j; try { j = new JSONObject(prefs(c).getString("config", "{}")); } catch (Exception e) { j = new JSONObject(); }
        L.ar = "ar".equals(j.optString("lang"));
        return j;
    }

    /** Prayer options, or null when no location is set. */
    static PrayerCalc.Opts opts(JSONObject cfg) {
        JSONObject loc = cfg.optJSONObject("loc");
        if (loc == null || !loc.has("lat")) return null;
        PrayerCalc.Opts o = new PrayerCalc.Opts();
        o.lat = loc.optDouble("lat"); o.lng = loc.optDouble("lng"); o.tz = loc.optString("tz", "");
        JSONObject calc = cfg.optJSONObject("calc");
        if (calc != null) {
            o.method = calc.optString("method", "mwl"); o.asr = calc.optString("asr", "std"); o.highLat = calc.optString("highLat", "angle");
            JSONObject a = calc.optJSONObject("adj");
            if (a != null) for (int i = 0; i < 6; i++) o.adj[i] = a.optInt(PrayerCalc.ORDER[i], 0);
        }
        JSONObject off = cfg.optJSONObject("offsets");
        if (off != null) { o.ds = off.optInt("ds", 20); o.de = off.optInt("de", 15); }
        return o;
    }

    static String locName(JSONObject cfg) { JSONObject l = cfg.optJSONObject("loc"); return l == null ? "" : l.optString("name", ""); }

    static String fmtTime(JSONObject cfg, PrayerCalc.Opts o, long ms) {
        boolean h24 = cfg.optBoolean("h24", false);
        SimpleDateFormat f = new SimpleDateFormat(h24 ? "HH:mm" : "h:mm a", Locale.US);
        f.setTimeZone(PrayerCalc.zone(o));
        String s = f.format(new Date(ms));
        if (L.ar) return L.n(h24 ? s : s.replace(" AM", " ص").replace(" PM", " م"));
        return h24 ? s : s.replace("AM", "am").replace("PM", "pm");
    }

    static String name(String k) { return L.prayer(k); }

    private static final String[] HM_AR = {"محرم", "صفر", "ربيع الأول", "ربيع الآخر", "جمادى الأولى", "جمادى الآخرة", "رجب", "شعبان", "رمضان", "شوال", "ذو القعدة", "ذو الحجة"};
    private static final String[] HM = {"Muḥarram", "Ṣafar", "Rabīʿ al-Awwal", "Rabīʿ al-Ākhir", "Jumādā al-Ūlā", "Jumādā al-Ākhirah", "Rajab", "Shaʿbān", "Ramaḍān", "Shawwāl", "Dhū al-Qaʿdah", "Dhū al-Ḥijjah"};

    static String hijri(JSONObject cfg, PrayerCalc.Opts o) {
        try {
            Calendar now = Calendar.getInstance(o == null ? TimeZone.getDefault() : PrayerCalc.zone(o));
            android.icu.util.IslamicCalendar ic = new android.icu.util.IslamicCalendar();
            ic.setCalculationType(android.icu.util.IslamicCalendar.CalculationType.ISLAMIC_UMALQURA);
            android.icu.util.Calendar g = android.icu.util.Calendar.getInstance(android.icu.util.TimeZone.getTimeZone("UTC"));
            g.clear(); g.set(now.get(Calendar.YEAR), now.get(Calendar.MONTH), now.get(Calendar.DAY_OF_MONTH), 12, 0, 0);
            g.add(android.icu.util.Calendar.DATE, cfg.optInt("hijriAdj", 0));
            ic.setTimeZone(android.icu.util.TimeZone.getTimeZone("UTC"));
            ic.setTimeInMillis(g.getTimeInMillis());
            int m = ic.get(android.icu.util.Calendar.MONTH);
            if (L.ar) return L.n(ic.get(android.icu.util.Calendar.DAY_OF_MONTH) + " " + HM_AR[m] + " " + ic.get(android.icu.util.Calendar.YEAR) + " هـ");
            return ic.get(android.icu.util.Calendar.DAY_OF_MONTH) + " " + HM[m] + " " + ic.get(android.icu.util.Calendar.YEAR);
        } catch (Throwable t) { return ""; }
    }

    /** Hijri month (1–12) of a civil date, with the user's adjustment */
    static int hijriMonth(JSONObject cfg, int y, int m, int d) {
        try {
            android.icu.util.IslamicCalendar ic = new android.icu.util.IslamicCalendar();
            ic.setCalculationType(android.icu.util.IslamicCalendar.CalculationType.ISLAMIC_UMALQURA);
            ic.setTimeZone(android.icu.util.TimeZone.getTimeZone("UTC"));
            android.icu.util.Calendar g = android.icu.util.Calendar.getInstance(android.icu.util.TimeZone.getTimeZone("UTC"));
            g.clear(); g.set(y, m - 1, d, 12, 0, 0); g.add(android.icu.util.Calendar.DATE, cfg.optInt("hijriAdj", 0));
            ic.setTimeInMillis(g.getTimeInMillis());
            return ic.get(android.icu.util.Calendar.MONTH) + 1;
        } catch (Throwable t) { return 0; }
    }

    static String todayKey(PrayerCalc.Opts o) {
        SimpleDateFormat f = new SimpleDateFormat("yyyy-MM-dd", Locale.US);
        f.setTimeZone(o == null ? TimeZone.getDefault() : PrayerCalc.zone(o));
        return f.format(new Date());
    }

    /* ---- tracker widget: taps, resets and rounds finished on the fingers, kept in order (each with its phrase and
       day) until the app takes them. The widget shows the app's last state with these applied on top. ---- */
    static synchronized void trackerEvent(Context c, String kind, String id, int n, String day) {
        SharedPreferences sp = prefs(c);
        try {
            org.json.JSONArray ev = new org.json.JSONArray(sp.getString("tEvents", "[]"));
            JSONObject last = ev.length() > 0 ? ev.optJSONObject(ev.length() - 1) : null;
            /* consecutive taps of one phrase on one day fold into one event */
            if ("tap".equals(kind) && last != null && "tap".equals(last.optString("k")) && id.equals(last.optString("id")) && day.equals(last.optString("d")))
                last.put("n", last.optInt("n") + n);
            else if (ev.length() < 500) ev.put(new JSONObject().put("k", kind).put("id", id).put("n", n).put("d", day).put("t", System.currentTimeMillis()));
            sp.edit().putString("tEvents", ev.toString()).apply();
        } catch (Exception ignored) { }
    }
    static org.json.JSONArray trackerEvents(Context c) {
        try { return new org.json.JSONArray(prefs(c).getString("tEvents", "[]")); } catch (Exception e) { return new org.json.JSONArray(); }
    }
    static synchronized String takeTracker(Context c, String curId) {
        SharedPreferences sp = prefs(c); String ev = sp.getString("tEvents", "[]");
        int legacy = sp.getInt("wTally", 0);   /* taps from the previous widget, which counted one phrase */
        if (legacy > 0 && curId != null) {
            try { org.json.JSONArray a = new org.json.JSONArray(ev); a.put(new JSONObject().put("k", "tap").put("id", curId).put("n", legacy).put("d", todayKey(null))); ev = a.toString(); } catch (Exception ignored) { }
        }
        sp.edit().putString("tEvents", "[]").remove("wTally").remove("wCount").remove("tArm").apply();
        return ev;
    }
    /* ---- prayers logged from the widget: shown immediately, handed to the app as events ---- */
    static synchronized boolean togglePrayed(Context c, String day, String p, boolean current) {
        SharedPreferences sp = prefs(c);
        try {
            JSONObject w = new JSONObject(sp.getString("wPrayed", "{}"));
            JSONObject d = w.optJSONObject(day); if (d == null) { d = new JSONObject(); w = new JSONObject(); w.put(day, d); }
            boolean on = !current; d.put(p, on);
            org.json.JSONArray ev = new org.json.JSONArray(sp.getString("wEvents", "[]"));
            ev.put(new JSONObject().put("d", day).put("p", p).put("on", on));
            sp.edit().putString("wPrayed", w.toString()).putString("wEvents", ev.toString()).apply();
            return on;
        } catch (Exception e) { return current; }
    }
    /** null = no widget override for that prayer */
    static Boolean widgetPrayed(Context c, String day, String p) {
        try { JSONObject d = new JSONObject(prefs(c).getString("wPrayed", "{}")).optJSONObject(day); return d != null && d.has(p) ? Boolean.valueOf(d.optBoolean(p)) : null; } catch (Exception e) { return null; }
    }
    static synchronized String takeEvents(Context c) {
        SharedPreferences sp = prefs(c); String ev = sp.getString("wEvents", "[]");
        sp.edit().putString("wEvents", "[]").putString("wPrayed", "{}").apply();
        return ev;
    }
    /* dhikr counted from the floating reminder, per phrase, until the app takes them */
    static synchronized void bumpNudge(Context c, String id) {
        try { JSONObject o = new JSONObject(prefs(c).getString("nTally", "{}")); o.put(id, o.optInt(id, 0) + 1); prefs(c).edit().putString("nTally", o.toString()).apply(); } catch (Exception ignored) { }
    }
    static synchronized String takeNudge(Context c) { String s = prefs(c).getString("nTally", "{}"); prefs(c).edit().putString("nTally", "{}").apply(); return s; }
}
