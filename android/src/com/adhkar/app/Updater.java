package com.adhkar.app;

import android.app.Activity;
import android.app.PendingIntent;
import android.content.Intent;
import android.content.pm.PackageInfo;
import android.content.pm.PackageInstaller;
import android.content.pm.PackageManager;
import android.content.pm.Signature;
import android.net.Uri;
import android.os.Build;
import android.provider.Settings;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.BufferedReader;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.security.MessageDigest;
import java.util.Arrays;
import java.util.Locale;

/**
 * Updates for the copy installed from the release page, only when the person asks (Check now, or the weekly check
 * they turned on). Ask GitHub for the latest release; download Adhkar.apk from github.com and GitHub's file hosts;
 * check it against the release's SHA256SUMS.txt, its package name, a higher version code and the same signing key as
 * this app; then hand it to Android's own installer, which asks the person to confirm. A copy from Google Play is
 * updated by Play: the bundle for Play leaves out the install permission, and this answers "store" there.
 */
final class Updater {
    static final String ACTION = "com.adhkar.app.UPDATE_STATUS";
    private static final String API = "https://api.github.com/repos/Bashyr18/adhkar/releases/latest";
    private static final String ASSET = "Adhkar.apk", SUMS = "SHA256SUMS.txt";
    private static final long MAX = 200L * 1024 * 1024;

    interface Sink { void send(String js); }

    private final Activity a;
    private final Sink sink;
    private volatile boolean busy;
    private String apkUrl, sumsUrl, version;
    private long size;

    Updater(Activity a, Sink sink) { this.a = a; this.sink = sink; }

    String can() {
        try {
            String inst = Build.VERSION.SDK_INT >= 30
                ? a.getPackageManager().getInstallSourceInfo(a.getPackageName()).getInstallingPackageName()
                : a.getPackageManager().getInstallerPackageName(a.getPackageName());
            if ("com.android.vending".equals(inst)) return "store";
            PackageInfo pi = a.getPackageManager().getPackageInfo(a.getPackageName(), PackageManager.GET_PERMISSIONS);
            if (pi.requestedPermissions != null && Arrays.asList(pi.requestedPermissions).contains("android.permission.REQUEST_INSTALL_PACKAGES")) return "yes";
            return "store";
        } catch (Exception e) { return ""; }
    }

    private static boolean hostOk(URL u) {
        String h = u.getHost().toLowerCase(Locale.US);
        return "https".equals(u.getProtocol()) && (h.equals("api.github.com") || h.equals("github.com") || h.endsWith(".githubusercontent.com"));
    }
    /* redirects are followed by hand, only between GitHub's own hosts */
    private static HttpURLConnection open(String url) throws Exception {
        for (int hop = 0; hop < 5; hop++) {
            URL u = new URL(url);
            if (!hostOk(u)) throw new Exception("host " + u.getHost());
            HttpURLConnection h = (HttpURLConnection) u.openConnection();
            h.setInstanceFollowRedirects(false);
            h.setConnectTimeout(20000); h.setReadTimeout(30000);
            h.setRequestProperty("User-Agent", "Adhkar-Android");
            h.setRequestProperty("Accept", "application/vnd.github+json, application/octet-stream, */*");
            int c = h.getResponseCode();
            if (c >= 300 && c < 400) { String loc = h.getHeaderField("Location"); h.disconnect(); if (loc == null) throw new Exception("redirect"); url = new URL(u, loc).toString(); continue; }
            if (c != 200) { h.disconnect(); throw new Exception("http " + c); }
            return h;
        }
        throw new Exception("redirects");
    }
    private static String text(String url) throws Exception {
        HttpURLConnection h = open(url);
        try (BufferedReader r = new BufferedReader(new InputStreamReader(h.getInputStream(), "UTF-8"))) {
            StringBuilder b = new StringBuilder(); String l; while ((l = r.readLine()) != null) b.append(l).append('\n'); return b.toString();
        } finally { h.disconnect(); }
    }

    void check() {
        if (busy) return;
        busy = true;
        new Thread(() -> {
            try {
                JSONObject d = new JSONObject(text(API));
                version = d.optString("tag_name", "").replaceFirst("^[vV]", "");
                apkUrl = sumsUrl = null; size = 0;
                JSONArray as = d.optJSONArray("assets");
                if (as != null) for (int i = 0; i < as.length(); i++) {
                    JSONObject x = as.getJSONObject(i);
                    if (ASSET.equals(x.optString("name"))) { apkUrl = x.optString("browser_download_url"); size = x.optLong("size"); }
                    if (SUMS.equals(x.optString("name"))) sumsUrl = x.optString("browser_download_url");
                }
                String notes = d.optString("body", "");
                if (notes.length() > 600) notes = notes.substring(0, 600);
                boolean found = apkUrl != null && sumsUrl != null && newer(version, current());
                send(found ? new JSONObject().put("state", "found").put("v", version).put("size", size).put("notes", notes)
                           : new JSONObject().put("state", "none").put("v", version));
            } catch (Exception e) {
                try { send(new JSONObject().put("state", "error").put("step", "check").put("why", String.valueOf(e.getMessage()))); } catch (Exception ignored) { }
            } finally { busy = false; }
        }).start();
    }

    void get() {
        if (busy || apkUrl == null || sumsUrl == null) { err("check first"); return; }
        if (Build.VERSION.SDK_INT >= 26 && !a.getPackageManager().canRequestPackageInstalls()) {
            try { send(new JSONObject().put("state", "permission")); } catch (Exception ignored) { }
            a.runOnUiThread(() -> { try { a.startActivity(new Intent(Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES, Uri.parse("package:" + a.getPackageName()))); } catch (Exception ignored) { } });
            return;
        }
        busy = true;
        new Thread(() -> {
            File dir = new File(a.getCacheDir(), "update"); dir.mkdirs();
            File f = new File(dir, "Adhkar.apk");
            try {
                HttpURLConnection h = open(apkUrl);
                long total = h.getContentLengthLong() > 0 ? h.getContentLengthLong() : size, got = 0, last = 0;
                try (InputStream in = h.getInputStream(); OutputStream out = new FileOutputStream(f)) {
                    byte[] b = new byte[65536]; int r;
                    while ((r = in.read(b)) > 0) {
                        got += r; if (got > MAX) throw new Exception("too large");
                        out.write(b, 0, r);
                        if (got - last > 131072) { last = got; send(new JSONObject().put("state", "progress").put("got", got).put("total", total)); }
                    }
                } finally { h.disconnect(); }
                send(new JSONObject().put("state", "verifying"));
                String want = null;
                for (String line : text(sumsUrl).split("\n")) {
                    String[] p = line.trim().split("\\s+", 2);
                    if (p.length == 2 && p[1].replaceFirst("^\\*", "").trim().equals(ASSET)) { want = p[0].toLowerCase(Locale.US); break; }
                }
                if (want == null || !want.equals(sha256(f))) throw new Exception("checksum");
                verifyPackage(f);
                send(new JSONObject().put("state", "installing"));
                install(f);
            } catch (Exception e) {
                f.delete();
                err(String.valueOf(e.getMessage()));
                busy = false;
            }
        }).start();
    }

    /* the same app, a higher version, signed with the same key: anything else is refused before Android sees it */
    @SuppressWarnings("deprecation")
    private void verifyPackage(File f) throws Exception {
        PackageManager pm = a.getPackageManager();
        int flag = Build.VERSION.SDK_INT >= 28 ? PackageManager.GET_SIGNING_CERTIFICATES : PackageManager.GET_SIGNATURES;
        PackageInfo nu = pm.getPackageArchiveInfo(f.getPath(), flag), me = pm.getPackageInfo(a.getPackageName(), flag);
        if (nu == null || !a.getPackageName().equals(nu.packageName)) throw new Exception("package");
        long nv = Build.VERSION.SDK_INT >= 28 ? nu.getLongVersionCode() : nu.versionCode, mv = Build.VERSION.SDK_INT >= 28 ? me.getLongVersionCode() : me.versionCode;
        if (nv <= mv) throw new Exception("not newer");
        Signature[] x, y;
        if (Build.VERSION.SDK_INT >= 28) { x = nu.signingInfo.getApkContentsSigners(); y = me.signingInfo.getApkContentsSigners(); }
        else { x = nu.signatures; y = me.signatures; }
        if (x == null || y == null || x.length == 0 || !Arrays.equals(x, y)) throw new Exception("signature");
    }

    private void install(File f) throws Exception {
        PackageInstaller pi = a.getPackageManager().getPackageInstaller();
        PackageInstaller.SessionParams p = new PackageInstaller.SessionParams(PackageInstaller.SessionParams.MODE_FULL_INSTALL);
        p.setAppPackageName(a.getPackageName());
        p.setSize(f.length());
        int id = pi.createSession(p);
        try (PackageInstaller.Session s = pi.openSession(id)) {
            try (InputStream in = new FileInputStream(f); OutputStream out = s.openWrite(ASSET, 0, f.length())) {
                byte[] b = new byte[65536]; int r; while ((r = in.read(b)) > 0) out.write(b, 0, r);
                s.fsync(out);
            }
            Intent back = new Intent(a, MainActivity.class).setAction(ACTION).addFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP);
            int fl = PendingIntent.FLAG_UPDATE_CURRENT | (Build.VERSION.SDK_INT >= 31 ? PendingIntent.FLAG_MUTABLE : 0);
            s.commit(PendingIntent.getActivity(a, 7, back, fl).getIntentSender());
        }
    }

    /** MainActivity hands over the installer's answer: ask the person to confirm, or report the outcome */
    @SuppressWarnings("deprecation")
    void onStatus(Intent i) {
        int st = i.getIntExtra(PackageInstaller.EXTRA_STATUS, -999);
        if (st == PackageInstaller.STATUS_PENDING_USER_ACTION) {
            Intent confirm = Build.VERSION.SDK_INT >= 33 ? i.getParcelableExtra(Intent.EXTRA_INTENT, Intent.class) : (Intent) i.getParcelableExtra(Intent.EXTRA_INTENT);
            if (confirm != null) try { a.startActivity(confirm); } catch (Exception e) { err("confirm"); busy = false; }
            return;
        }
        busy = false;
        if (st == PackageInstaller.STATUS_SUCCESS) { try { send(new JSONObject().put("state", "done")); } catch (Exception ignored) { } }
        else err(String.valueOf(i.getStringExtra(PackageInstaller.EXTRA_STATUS_MESSAGE)));
    }

    private String current() {
        try { return a.getPackageManager().getPackageInfo(a.getPackageName(), 0).versionName; } catch (Exception e) { return "0"; }
    }
    static boolean newer(String x, String y) {
        String[] p = (x == null ? "" : x).split("\\."), q = (y == null ? "" : y).split("\\.");
        for (int i = 0; i < Math.max(p.length, q.length); i++) {
            int m = 0, n = 0;
            try { if (i < p.length) m = Integer.parseInt(p[i]); } catch (Exception ignored) { }
            try { if (i < q.length) n = Integer.parseInt(q[i]); } catch (Exception ignored) { }
            if (m != n) return m > n;
        }
        return false;
    }
    private static String sha256(File f) throws Exception {
        MessageDigest md = MessageDigest.getInstance("SHA-256");
        try (InputStream in = new FileInputStream(f)) { byte[] b = new byte[65536]; int r; while ((r = in.read(b)) > 0) md.update(b, 0, r); }
        StringBuilder s = new StringBuilder(); for (byte x : md.digest()) s.append(String.format(Locale.US, "%02x", x)); return s.toString();
    }
    private void err(String why) {
        try { send(new JSONObject().put("state", "error").put("step", "get").put("why", why)); } catch (Exception ignored) { }
    }
    private void send(JSONObject o) {
        sink.send("__native.onUpdate&&__native.onUpdate(" + JSONObject.quote(o.toString()) + ")");
    }
}
