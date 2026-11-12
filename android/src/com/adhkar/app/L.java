package com.adhkar.app;

/** The app's language on the native side (notifications, widgets, the floating dhikr, toasts). The web app syncs
 *  "lang" with its config; every read of the config refreshes it, so text built after a read is in that language. */
final class L {
    private L() { }
    static volatile boolean ar;

    static String t(String en, String arabic) { return ar ? arabic : en; }

    /** Eastern Arabic digits in Arabic, unchanged in English */
    static String n(String s) {
        if (!ar || s == null) return s;
        StringBuilder b = new StringBuilder(s.length());
        for (int i = 0; i < s.length(); i++) { char ch = s.charAt(i); b.append(ch >= '0' && ch <= '9' ? (char) ('٠' + (ch - '0')) : ch); }
        return b.toString();
    }
    static String n(long v) { return n(String.valueOf(v)); }

    static String prayer(String k) {
        switch (k) {
            case "fajr": return t("Fajr", "الفجر"); case "sunrise": return t("Sunrise", "الشروق"); case "dhuhr": return t("Dhuhr", "الظهر");
            case "asr": return t("ʿAṣr", "العصر"); case "maghrib": return t("Maghrib", "المغرب"); default: return t("ʿIshāʾ", "العشاء");
        }
    }
}
