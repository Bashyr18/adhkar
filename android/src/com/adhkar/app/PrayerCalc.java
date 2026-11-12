package com.adhkar.app;

import java.util.Calendar;
import java.util.TimeZone;

/** Java mirror of web/js/prayer.js (compute + day). Keep the two in sync. */
final class PrayerCalc {
    private PrayerCalc() {}

    static final String[] ORDER = {"fajr", "sunrise", "dhuhr", "asr", "maghrib", "isha"};
    static final String[] PRAYERS = {"fajr", "dhuhr", "asr", "maghrib", "isha"};

    static final class Method {
        final double fajr, isha, ishaMin, maghribDeg; final int[] adj; // adj: sunrise,dhuhr,asr,maghrib
        Method(double f, double i, double im, double md, int[] a) { fajr = f; isha = i; ishaMin = im; maghribDeg = md; adj = a; }
    }

    static Method method(String id) {
        if (id == null) id = "mwl";
        switch (id) {
            case "isna": return new Method(15, 15, 0, 0, null);
            case "egypt": return new Method(19.5, 17.5, 0, 0, null);
            case "makkah": return new Method(18.5, 0, 90, 0, null);
            case "karachi": return new Method(18, 18, 0, 0, null);
            case "dubai": return new Method(18.2, 18.2, 0, 0, null);
            case "qatar": return new Method(18, 0, 90, 0, null);
            case "kuwait": return new Method(18, 17.5, 0, 0, null);
            case "singapore": case "jakim": case "kemenag": return new Method(20, 18, 0, 0, null);
            case "turkey": return new Method(18, 17, 0, 0, new int[]{-7, 5, 4, 7});
            case "france": return new Method(12, 12, 0, 0, null);
            case "russia": return new Method(16, 15, 0, 0, null);
            case "morocco": return new Method(19, 17, 0, 0, new int[]{0, 0, 0, 5});
            case "algeria": return new Method(18, 17, 0, 0, null);
            case "tunisia": return new Method(18, 18, 0, 0, null);
            case "jordan": return new Method(18, 18, 0, 0, new int[]{0, 0, 0, 5});
            default: return new Method(18, 17, 0, 0, null);
        }
    }

    static final class Opts {
        double lat, lng; String method = "mwl", asr = "std", highLat = "angle"; int[] adj = new int[6]; int ds = 20, de = 15; String tz = "";
    }

    static final class Day {
        long fajr, sunrise, dhuhr, asr, maghrib, isha, nextFajr, midnight, lastThird, duhaStart, duhaEnd; int y, m, d;
        long get(String k) {
            switch (k) {
                case "fajr": return fajr; case "sunrise": return sunrise; case "dhuhr": return dhuhr;
                case "asr": return asr; case "maghrib": return maghrib; default: return isha;
            }
        }
    }

    private static double rad(double d) { return d * Math.PI / 180; }
    private static double deg(double r) { return r * 180 / Math.PI; }
    private static double sin(double d) { return Math.sin(rad(d)); }
    private static double cos(double d) { return Math.cos(rad(d)); }
    private static double tan(double d) { return Math.tan(rad(d)); }
    private static double fix(double a, double b) { a = a - b * Math.floor(a / b); return a < 0 ? a + b : a; }

    private static double julian(int y, int m, int d) {
        if (m <= 2) { y -= 1; m += 12; }
        double A = Math.floor(y / 100.0), B = 2 - A + Math.floor(A / 4);
        return Math.floor(365.25 * (y + 4716)) + Math.floor(30.6001 * (m + 1)) + d + B - 1524.5;
    }
    /** [decl, eqt] */
    private static double[] sunPos(double jd) {
        double D = jd - 2451545.0;
        double g = fix(357.529 + 0.98560028 * D, 360), q = fix(280.459 + 0.98564736 * D, 360);
        double L = fix(q + 1.915 * sin(g) + 0.020 * sin(2 * g), 360), e = 23.439 - 0.00000036 * D;
        double RA = deg(Math.atan2(cos(e) * sin(L), cos(L))) / 15;
        return new double[]{deg(Math.asin(sin(e) * sin(L))), q / 15 - fix(RA, 24)};
    }

    /** Epoch ms for fajr..isha on civil date y-m-d (index order = ORDER). */
    static long[] compute(int y, int m, int d, Opts o) {
        long[] r = computeAt(y, m, d, o);
        if ((r[1] == Long.MIN_VALUE || r[4] == Long.MIN_VALUE) && Math.abs(o.lat) > 65) {
            Opts o2 = new Opts();
            o2.lat = o.lat > 0 ? 65 : -65; o2.lng = o.lng; o2.method = o.method; o2.asr = o.asr; o2.highLat = o.highLat; o2.adj = o.adj; o2.ds = o.ds; o2.de = o.de; o2.tz = o.tz;
            r = computeAt(y, m, d, o2);
        }
        return r;
    }

    private static long[] computeAt(int y, int m, int d, Opts o) {
        final Method M = method(o.method);
        final double lat = o.lat, lng = o.lng, jd = julian(y, m, d) - lng / (15 * 24);
        double[] t = {5, 6, 12, 13, 18, 18, 18}; // fajr sunrise dhuhr asr sunset maghrib isha
        double rise = 0.833;
        for (int i = 0; i < 2; i++) {
            double[] p = new double[7];
            for (int k = 0; k < 7; k++) p[k] = t[k] / 24;
            t = new double[]{
                angleTime(jd, lat, M.fajr, p[0], true),
                angleTime(jd, lat, rise, p[1], true),
                midDay(jd, p[2]),
                angleTime(jd, lat, -deg(Math.atan(1 / ((o.asr != null && o.asr.equals("hanafi") ? 2 : 1) + tan(Math.abs(lat - sunPos(jd + p[3])[0]))))), p[3], false),
                angleTime(jd, lat, rise, p[4], false),
                M.maghribDeg > 0 ? angleTime(jd, lat, M.maghribDeg, p[5], false) : angleTime(jd, lat, rise, p[5], false),
                M.ishaMin > 0 ? Double.NaN : angleTime(jd, lat, M.isha, p[6], false)
            };
        }
        if (M.ishaMin > 0) t[6] = t[5] + M.ishaMin / 60;
        double night = 24 + t[1] - t[4];
        String rule = o.highLat == null ? "angle" : o.highLat;
        /* "none" keeps the true angle times, falling back to the angle rule only on nights the sun never reaches it */
        boolean none = rule.equals("none"); String r2 = none ? "angle" : rule;
        if (!Double.isNaN(night)) {
            double fp = portion(r2, M.fajr) * night;
            if (Double.isNaN(t[0]) || (!none && t[1] - t[0] > fp)) t[0] = t[1] - fp;
            if (M.ishaMin <= 0) { double ip = portion(r2, M.isha) * night; if (Double.isNaN(t[6]) || (!none && t[6] - t[4] > ip)) t[6] = t[4] + ip; }
            if (M.maghribDeg > 0) { double mp = portion(r2, M.maghribDeg) * night; if (Double.isNaN(t[5]) || (!none && t[5] - t[4] > mp)) t[5] = t[4] + mp; }
        }
        double[] six = {t[0], t[1], t[2], t[3], t[5], t[6]};
        Calendar c = Calendar.getInstance(TimeZone.getTimeZone("UTC"));
        c.clear(); c.set(y, m - 1, d, 0, 0, 0);
        long base = c.getTimeInMillis();
        long[] out = new long[6];
        for (int k = 0; k < 6; k++) {
            int madj = 0;
            if (M.adj != null) { if (k == 1) madj = M.adj[0]; else if (k == 2) madj = M.adj[1]; else if (k == 3) madj = M.adj[2]; else if (k == 4) madj = M.adj[3]; }
            double h = six[k] - lng / 15 + (o.adj[k] + madj) / 60.0;
            out[k] = Double.isNaN(h) ? Long.MIN_VALUE : base + Math.round(h * 60) * 60000L;
        }
        return out;
    }
    private static double portion(String rule, double angle) { return rule.equals("mid") ? 0.5 : rule.equals("seventh") ? 1.0 / 7 : angle / 60; }
    private static double midDay(double jd, double t) { return fix(12 - sunPos(jd + t)[1], 24); }
    private static double angleTime(double jd, double lat, double angle, double t, boolean ccw) {
        double dec = sunPos(jd + t)[0], noon = midDay(jd, t);
        double c = (-sin(angle) - sin(dec) * sin(lat)) / (cos(dec) * cos(lat));
        if (c > 1 || c < -1) return Double.NaN;
        double T = deg(Math.acos(c)) / 15;
        return noon + (ccw ? -T : T);
    }

    static Day day(int y, int m, int d, Opts o) {
        long[] t = compute(y, m, d, o);
        Calendar c = Calendar.getInstance(TimeZone.getTimeZone("UTC")); c.clear(); c.set(y, m - 1, d); c.add(Calendar.DATE, 1);
        long[] tn = compute(c.get(Calendar.YEAR), c.get(Calendar.MONTH) + 1, c.get(Calendar.DAY_OF_MONTH), o);
        Day r = new Day();
        r.y = y; r.m = m; r.d = d;
        r.fajr = t[0]; r.sunrise = t[1]; r.dhuhr = t[2]; r.asr = t[3]; r.maghrib = t[4]; r.isha = t[5]; r.nextFajr = tn[0];
        long night = r.nextFajr - r.maghrib;
        r.midnight = r.maghrib + night / 2; r.lastThird = r.maghrib + night * 2 / 3;
        r.duhaStart = r.sunrise + o.ds * 60000L; r.duhaEnd = r.dhuhr - o.de * 60000L;
        return r;
    }

    static TimeZone zone(Opts o) { return o.tz == null || o.tz.isEmpty() ? TimeZone.getDefault() : TimeZone.getTimeZone(o.tz); }

    /** Day for the civil date containing `ms` in the location zone, shifted by `offset` days. */
    static Day dayAt(long ms, int offset, Opts o) {
        Calendar c = Calendar.getInstance(zone(o)); c.setTimeInMillis(ms); c.add(Calendar.DATE, offset);
        return day(c.get(Calendar.YEAR), c.get(Calendar.MONTH) + 1, c.get(Calendar.DAY_OF_MONTH), o);
    }

    static String key(Day d) { return String.format(java.util.Locale.US, "%04d-%02d-%02d", d.y, d.m, d.d); }
}
