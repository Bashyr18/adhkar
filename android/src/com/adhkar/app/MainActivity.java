package com.adhkar.app;

import android.Manifest;
import android.app.Activity;
import android.app.AlarmManager;
import android.app.NotificationManager;
import android.appwidget.AppWidgetManager;
import android.content.ActivityNotFoundException;
import android.content.ClipData;
import android.content.ComponentName;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.content.res.Configuration;
import android.graphics.Color;
import android.hardware.GeomagneticField;
import android.hardware.Sensor;
import android.hardware.SensorEvent;
import android.hardware.SensorEventListener;
import android.hardware.SensorManager;
import android.location.Address;
import android.location.Geocoder;
import android.location.Location;
import android.location.LocationListener;
import android.location.LocationManager;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.os.VibrationEffect;
import android.os.Vibrator;
import android.provider.AlarmClock;
import android.provider.Settings;
import android.util.Base64;
import android.view.KeyEvent;
import android.view.Surface;
import android.view.View;
import android.view.WindowInsets;
import android.view.WindowInsetsController;
import android.view.WindowManager;
import android.webkit.JavascriptInterface;
import android.webkit.PermissionRequest;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.FrameLayout;
import android.widget.Toast;

import org.json.JSONObject;

import java.io.BufferedReader;
import java.io.ByteArrayInputStream;
import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.nio.charset.StandardCharsets;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

/**
 * Adhkār native shell.
 *  - The bundled web app is served from the reserved origin https://appassets.androidplatform.net/
 *    by request interception of assets/www (no network permission, no remote content).
 *  - File/content access is off; external links go to the system browser, so the bridge is
 *    only ever reachable by our own bundled code.
 *  - The bridge adds what a web page cannot: exact-alarm reminders, widgets, haptics, compass,
 *    location, clock alarms, share sheets, document backup, volume-key counting and edge-to-edge.
 */
public class MainActivity extends Activity implements SensorEventListener {
    private static final String HOST = "appassets.androidplatform.net";
    private static final String URL = "https://" + HOST + "/index.html";
    private static final int REQ_LOC = 11, REQ_NOTIF = 12, REQ_EXPORT = 21, REQ_IMPORT = 22;

    private WebView web;
    private FrameLayout root;
    private boolean loaded, volumeKeys;
    private volatile boolean audioHold;
    private android.media.MediaPlayer preview;
    private void stopPreview() { if (preview != null) { try { preview.stop(); } catch (Exception ignored) { } preview.release(); preview = null; } }
    private volatile boolean ready;
    static volatile boolean visible;
    private Audio audio;
    private synchronized Audio audio() { if (audio == null) audio = new Audio(this, this::js); return audio; }
    private String pendingRoute, pendingExport;
    private final Handler ui = new Handler(Looper.getMainLooper());
    private SensorManager sensors;
    private long lastHeading;
    private float declination;
    private int compassAcc = 3;
    private LocationListener locListener;
    private static final Map<String, String> MIME = new HashMap<>();
    static {
        MIME.put("html", "text/html"); MIME.put("css", "text/css"); MIME.put("js", "application/javascript");
        MIME.put("json", "application/json"); MIME.put("woff2", "font/woff2"); MIME.put("svg", "image/svg+xml"); MIME.put("png", "image/png"); MIME.put("webp", "image/webp");
    }

    @Override
    protected void onCreate(Bundle saved) {
        super.onCreate(saved);
        Scheduler.channels(this);
        getWindow().setStatusBarColor(Color.TRANSPARENT);
        getWindow().setNavigationBarColor(Color.TRANSPARENT);
        if (Build.VERSION.SDK_INT >= 29) { getWindow().setNavigationBarContrastEnforced(false); getWindow().setStatusBarContrastEnforced(false); }
        if (Build.VERSION.SDK_INT >= 30) getWindow().setDecorFitsSystemWindows(false);
        else getWindow().getDecorView().setSystemUiVisibility(View.SYSTEM_UI_FLAG_LAYOUT_STABLE | View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN | View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION);
        if (Build.VERSION.SDK_INT >= 28) getWindow().getAttributes().layoutInDisplayCutoutMode = WindowManager.LayoutParams.LAYOUT_IN_DISPLAY_CUTOUT_MODE_SHORT_EDGES;

        root = new FrameLayout(this);
        web = new WebView(this);
        int bg = isNight() ? 0xFF07080D : 0xFFF5F1E9;
        root.setBackgroundColor(bg); web.setBackgroundColor(bg);
        root.addView(web, new FrameLayout.LayoutParams(-1, -1));
        setContentView(root);
        /* hold the splash until the page has painted its first view (never longer than 1.5 s) */
        final long t0 = android.os.SystemClock.uptimeMillis();
        root.getViewTreeObserver().addOnPreDrawListener(new android.view.ViewTreeObserver.OnPreDrawListener() {
            @Override public boolean onPreDraw() {
                if (!ready && android.os.SystemClock.uptimeMillis() - t0 < 1500) return false;
                root.getViewTreeObserver().removeOnPreDrawListener(this);
                return true;
            }
        });
        web.setRendererPriorityPolicy(WebView.RENDERER_PRIORITY_IMPORTANT, true);

        WebSettings s = web.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setAllowFileAccess(false);
        s.setAllowContentAccess(false);
        s.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        s.setMediaPlaybackRequiresUserGesture(true);
        s.setSupportMultipleWindows(false);
        s.setJavaScriptCanOpenWindowsAutomatically(false);
        /* honour the user's font size, capped so layouts stay intact */
        s.setTextZoom(Math.round(Math.max(1f, Math.min(1.5f, getResources().getConfiguration().fontScale)) * 100));
        s.setSupportZoom(false);
        s.setOffscreenPreRaster(true);
        s.setBuiltInZoomControls(false);
        s.setGeolocationEnabled(false);
        if (Build.VERSION.SDK_INT >= 29) s.setForceDark(WebSettings.FORCE_DARK_OFF);
        if (Build.VERSION.SDK_INT >= 33) s.setAlgorithmicDarkeningAllowed(false);
        WebView.setWebContentsDebuggingEnabled((getApplicationInfo().flags & android.content.pm.ApplicationInfo.FLAG_DEBUGGABLE) != 0);
        web.setOverScrollMode(View.OVER_SCROLL_NEVER);
        web.setVerticalScrollBarEnabled(false);
        web.addJavascriptInterface(new Bridge(), "AndroidBridge");

        web.setWebViewClient(new WebViewClient() {
            @Override
            public WebResourceResponse shouldInterceptRequest(WebView v, WebResourceRequest r) {
                Uri u = r.getUrl();
                if (HOST.equals(u.getHost())) return asset(u.getPath());
                return blocked();
            }
            @Override
            public boolean shouldOverrideUrlLoading(WebView v, WebResourceRequest r) {
                Uri u = r.getUrl();
                if (HOST.equals(u.getHost())) return false;
                external(u);
                return true;
            }
            @Override
            public void onPageFinished(WebView v, String url) {
                loaded = true;
                pushInsets();
                if (pendingRoute != null) { js("__native.onRoute(" + JSONObject.quote(pendingRoute) + ")"); pendingRoute = null; }
            }
        });
        web.setWebChromeClient(new WebChromeClient() {
            @Override public void onPermissionRequest(PermissionRequest r) { r.deny(); }
        });
        root.setOnApplyWindowInsetsListener((v, ins) -> { lastInsets = ins; pushInsets(); return ins; });

        String route = routeOf(getIntent());
        if (saved == null) web.loadUrl(URL + (route != null ? route : ""));
        else web.restoreState(saved);
    }

    private WindowInsets lastInsets;
    private void pushInsets() {
        if (lastInsets == null || web == null) return;
        float dp = getResources().getDisplayMetrics().density;
        int top, bottom, ime = 0;
        if (Build.VERSION.SDK_INT >= 30) {
            android.graphics.Insets sb = lastInsets.getInsets(WindowInsets.Type.systemBars() | WindowInsets.Type.displayCutout());
            android.graphics.Insets im = lastInsets.getInsets(WindowInsets.Type.ime());
            top = sb.top; bottom = sb.bottom; ime = im.bottom;
        } else {
            top = lastInsets.getSystemWindowInsetTop(); bottom = lastInsets.getStableInsetBottom();
            int sys = lastInsets.getSystemWindowInsetBottom(); if (sys > bottom + 100) ime = sys;
        }
        root.setPadding(0, 0, 0, ime > 0 ? ime : 0);
        if (loaded) js("__native.onInsets(" + Math.round(top / dp) + "," + (ime > 0 ? 0 : Math.round(bottom / dp)) + ")");
    }

    private boolean isNight() { return (getResources().getConfiguration().uiMode & Configuration.UI_MODE_NIGHT_MASK) == Configuration.UI_MODE_NIGHT_YES; }

    @Override
    public void onConfigurationChanged(Configuration c) {
        super.onConfigurationChanged(c);
        if (loaded) js("A.applyTheme&&A.applyTheme()");
    }

    /* ---------- routing ---------- */
    private String routeOf(Intent i) {
        if (i == null) return null;
        Uri d = i.getData();
        if (d != null && "adhkar".equals(d.getScheme()) && "route".equals(d.getHost())) {
            String p = d.getPath() == null ? "" : d.getPath();
            return "#/" + p.replaceFirst("^/+", "");
        }
        return null;
    }
    @Override
    protected void onNewIntent(Intent i) {
        super.onNewIntent(i);
        String r = routeOf(i);
        if (r == null) return;
        if (loaded) js("__native.onRoute(" + JSONObject.quote(r) + ")"); else pendingRoute = r;
    }

    /* ---------- asset server ---------- */
    private WebResourceResponse asset(String path) {
        try {
            if (path == null || path.isEmpty() || path.equals("/")) path = "/index.html";
            String clean = path.replaceFirst("^/+", "");
            if (clean.contains("..") || clean.contains("\\")) return blocked();
            InputStream is = getAssets().open("www/" + clean);
            String ext = clean.substring(clean.lastIndexOf('.') + 1).toLowerCase(Locale.US);
            String mime = MIME.containsKey(ext) ? MIME.get(ext) : "application/octet-stream";
            Map<String, String> h = new HashMap<>();
            h.put("Cache-Control", "no-cache");
            h.put("X-Content-Type-Options", "nosniff");
            return new WebResourceResponse(mime, mime.startsWith("text") || ext.equals("js") || ext.equals("json") ? "utf-8" : null, 200, "OK", h, is);
        } catch (IOException e) { return blocked(); }
    }
    private WebResourceResponse blocked() {
        return new WebResourceResponse("text/plain", "utf-8", 404, "Not Found", Collections.<String, String>emptyMap(), new ByteArrayInputStream(new byte[0]));
    }
    private void external(Uri u) {
        String sc = u.getScheme() == null ? "" : u.getScheme().toLowerCase(Locale.US);
        if (!(sc.equals("https") || sc.equals("http") || sc.equals("mailto"))) return;
        try { startActivity(new Intent(sc.equals("mailto") ? Intent.ACTION_SENDTO : Intent.ACTION_VIEW, u).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)); }
        catch (ActivityNotFoundException e) { toast(L.t("No app can open this link", "لا يوجد تطبيق يفتح هذا الرابط")); }
    }

    /* ---------- lifecycle ---------- */
    @Override protected void onResume() { super.onResume(); visible = true; if (loaded) js("__native.onResume&&__native.onResume()"); }
    @Override protected void onPause() { visible = false; super.onPause(); stopCompass(); setKeepAwake(false); stopPreview(); }
    @Override protected void onSaveInstanceState(Bundle out) { super.onSaveInstanceState(out); if (web != null) web.saveState(out); }
    @Override protected void onDestroy() { stopCompass(); if (audio != null) audio.stop(); if (web != null) { web.destroy(); web = null; } super.onDestroy(); }

    /* back: Android 12 and older call onBackPressed; Android 13 and later go through Back (predictive back) */
    private final Back back = new Back(this, new Back.Host() {
        @Override public void step() { backStep(); }
        @Override public void js(String code) { MainActivity.this.js(code); }
    });

    @Override
    @SuppressWarnings("deprecation")
    public void onBackPressed() {
        if (!loaded || web == null) { super.onBackPressed(); return; }
        backStep();
    }

    /** one step back inside the app; if the page has nowhere left to go, the app goes to the background */
    private void backStep() {
        if (web == null) { moveTaskToBack(true); return; }
        web.evaluateJavascript("(window.__native&&__native.onBack)?__native.onBack():'exit'", v -> {
            if (v == null || v.contains("exit")) moveTaskToBack(true);
        });
    }

    @Override
    public boolean dispatchKeyEvent(KeyEvent e) {
        int k = e.getKeyCode();
        /* while a recitation is active the volume keys control volume, not the count */
        if (volumeKeys && !audioHold && (k == KeyEvent.KEYCODE_VOLUME_UP || k == KeyEvent.KEYCODE_VOLUME_DOWN)) {
            if (e.getAction() == KeyEvent.ACTION_DOWN) js("__native.onVolume&&__native.onVolume(" + (k == KeyEvent.KEYCODE_VOLUME_UP ? 1 : -1) + ")");
            return true;
        }
        return super.dispatchKeyEvent(e);
    }

    private void js(final String code) {
        if (web == null) return;
        ui.post(() -> { if (web != null) web.evaluateJavascript("try{" + code + "}catch(e){}", null); });
    }
    private void toast(String s) { ui.post(() -> Toast.makeText(this, s, Toast.LENGTH_SHORT).show()); }
    private void setKeepAwake(boolean on) {
        ui.post(() -> { if (on) getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON); else getWindow().clearFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON); });
    }

    /* ---------- permissions & results ---------- */
    @Override
    public void onRequestPermissionsResult(int req, String[] perms, int[] res) {
        super.onRequestPermissionsResult(req, perms, res);
        boolean ok = false; for (int r : res) if (r == PackageManager.PERMISSION_GRANTED) ok = true;
        if (req == REQ_LOC) { if (ok) locate(); else js("__native.onLocation('{\"error\":\"denied\"}')"); }
        if (req == REQ_NOTIF) { js("__native.onPermission&&__native.onPermission('notifications'," + ok + ")"); if (ok) Scheduler.run(this); }
    }

    @Override
    @SuppressWarnings("deprecation")
    protected void onActivityResult(int req, int code, Intent data) {
        super.onActivityResult(req, code, data);
        Uri u = data == null ? null : data.getData();
        if (req == REQ_EXPORT) {
            boolean ok = false;
            if (code == RESULT_OK && u != null && pendingExport != null) {
                try (OutputStream os = getContentResolver().openOutputStream(u, "wt")) { os.write(pendingExport.getBytes(StandardCharsets.UTF_8)); ok = true; } catch (Exception ignored) { }
            }
            pendingExport = null;
            js("__native.onExported&&__native.onExported(" + ok + ")");
        } else if (req == REQ_IMPORT && code == RESULT_OK && u != null) {
            try (InputStream is = getContentResolver().openInputStream(u); BufferedReader br = new BufferedReader(new InputStreamReader(is, StandardCharsets.UTF_8))) {
                StringBuilder sb = new StringBuilder(); char[] buf = new char[8192]; int n;
                while ((n = br.read(buf)) > 0) { sb.append(buf, 0, n); if (sb.length() > 20_000_000) break; }
                js("__native.onImport(" + JSONObject.quote(sb.toString()) + ")");
            } catch (Exception e) { toast(L.t("Could not read that file", "تعذّرت قراءة الملف")); }
        }
    }

    /* ---------- location ---------- */
    private boolean hasLoc() {
        return checkSelfPermission(Manifest.permission.ACCESS_COARSE_LOCATION) == PackageManager.PERMISSION_GRANTED
                || checkSelfPermission(Manifest.permission.ACCESS_FINE_LOCATION) == PackageManager.PERMISSION_GRANTED;
    }
    @SuppressWarnings({"MissingPermission", "deprecation"})
    private void locate() {
        final LocationManager lm = getSystemService(LocationManager.class);
        if (lm == null) { js("__native.onLocation('{\"error\":\"fail\"}')"); return; }
        Location best = null;
        for (String p : lm.getProviders(true)) {
            try { Location l = lm.getLastKnownLocation(p); if (l != null && (best == null || l.getTime() > best.getTime())) best = l; } catch (SecurityException ignored) { }
        }
        if (best != null && System.currentTimeMillis() - best.getTime() < 30 * 60000L) { deliver(best); return; }
        final boolean[] done = {false};
        final Location fallback = best;
        String provider = lm.isProviderEnabled(LocationManager.NETWORK_PROVIDER) ? LocationManager.NETWORK_PROVIDER
                : lm.isProviderEnabled(LocationManager.GPS_PROVIDER) ? LocationManager.GPS_PROVIDER : null;
        if (provider == null) { if (fallback != null) deliver(fallback); else { toast(L.t("Turn on location services", "شغّل خدمة الموقع")); js("__native.onLocation('{\"error\":\"off\"}')"); } return; }
        locListener = new LocationListener() {
            @Override public void onLocationChanged(Location l) { if (!done[0]) { done[0] = true; lm.removeUpdates(this); deliver(l); } }
            @Override public void onStatusChanged(String p, int s, Bundle b) { }
            @Override public void onProviderEnabled(String p) { }
            @Override public void onProviderDisabled(String p) { }
        };
        try { lm.requestLocationUpdates(provider, 0, 0, locListener, Looper.getMainLooper()); } catch (SecurityException e) { js("__native.onLocation('{\"error\":\"denied\"}')"); return; }
        ui.postDelayed(() -> {
            if (done[0]) return; done[0] = true;
            try { lm.removeUpdates(locListener); } catch (Exception ignored) { }
            if (fallback != null) deliver(fallback); else js("__native.onLocation('{\"error\":\"timeout\"}')");
        }, 20000);
    }
    private void deliver(final Location l) {
        final JSONObject o = new JSONObject();
        try { o.put("lat", l.getLatitude()); o.put("lng", l.getLongitude()); o.put("acc", l.getAccuracy()); } catch (Exception ignored) { }
        final boolean[] sent = {false};
        final Runnable send = () -> { synchronized (sent) { if (sent[0]) return; sent[0] = true; } js("__native.onLocation(" + JSONObject.quote(o.toString()) + ")"); };
        ui.postDelayed(send, 2500); // never wait long for a place name; the app falls back to the nearest city
        new Thread(() -> {
            try {
                if (Geocoder.isPresent()) {
                    @SuppressWarnings("deprecation")
                    List<Address> a = new Geocoder(this, Locale.ENGLISH).getFromLocation(l.getLatitude(), l.getLongitude(), 1);
                    if (a != null && !a.isEmpty()) {
                        Address ad = a.get(0);
                        String name = ad.getLocality() != null ? ad.getLocality() : ad.getSubAdminArea() != null ? ad.getSubAdminArea() : ad.getAdminArea();
                        if (name != null) o.put("name", name);
                        if (ad.getCountryCode() != null) o.put("cc", ad.getCountryCode());
                        if (ad.getCountryName() != null) o.put("country", ad.getCountryName());
                    }
                }
            } catch (Exception ignored) { }
            send.run();
        }).start();
    }

    /* ---------- compass ---------- */
    private void startCompass() {
        if (sensors == null) sensors = getSystemService(SensorManager.class);
        if (sensors == null) return;
        Sensor rv = sensors.getDefaultSensor(Sensor.TYPE_ROTATION_VECTOR);
        if (rv == null) rv = sensors.getDefaultSensor(Sensor.TYPE_GEOMAGNETIC_ROTATION_VECTOR);
        if (rv == null) { js("__native.onHeading&&0"); toast(L.t("This device has no compass sensor", "لا يحتوي الجهاز على بوصلة")); return; }
        try {
            JSONObject loc = Store.config(this).optJSONObject("loc");
            if (loc != null) declination = new GeomagneticField((float) loc.optDouble("lat"), (float) loc.optDouble("lng"), 0, System.currentTimeMillis()).getDeclination();
        } catch (Exception ignored) { }
        sensors.registerListener(this, rv, SensorManager.SENSOR_DELAY_GAME);
        Sensor mag = sensors.getDefaultSensor(Sensor.TYPE_MAGNETIC_FIELD);
        if (mag != null) sensors.registerListener(this, mag, SensorManager.SENSOR_DELAY_NORMAL);
    }
    private void stopCompass() { if (sensors != null) sensors.unregisterListener(this); }
    private final float[] rot = new float[9], rot2 = new float[9], ori = new float[3];
    @Override
    public void onSensorChanged(SensorEvent e) {
        int t = e.sensor.getType();
        if (t != Sensor.TYPE_ROTATION_VECTOR && t != Sensor.TYPE_GEOMAGNETIC_ROTATION_VECTOR) return;
        long now = System.currentTimeMillis();
        if (now - lastHeading < 33) return;
        lastHeading = now;
        SensorManager.getRotationMatrixFromVector(rot, e.values);
        int r = getWindowManager().getDefaultDisplay().getRotation();
        int ax = SensorManager.AXIS_X, ay = SensorManager.AXIS_Y;
        if (r == Surface.ROTATION_90) { ax = SensorManager.AXIS_Y; ay = SensorManager.AXIS_MINUS_X; }
        else if (r == Surface.ROTATION_180) { ax = SensorManager.AXIS_MINUS_X; ay = SensorManager.AXIS_MINUS_Y; }
        else if (r == Surface.ROTATION_270) { ax = SensorManager.AXIS_MINUS_Y; ay = SensorManager.AXIS_X; }
        SensorManager.remapCoordinateSystem(rot, ax, ay, rot2);
        SensorManager.getOrientation(rot2, ori);
        float az = (float) ((Math.toDegrees(ori[0]) + declination + 360) % 360);
        js("__native.onHeading&&__native.onHeading(" + String.format(Locale.US, "%.1f,%d,%.1f,%.1f", az, compassAcc, Math.toDegrees(ori[1]), Math.toDegrees(ori[2])) + ")");
    }
    @Override public void onAccuracyChanged(Sensor s, int acc) { if (s.getType() == Sensor.TYPE_MAGNETIC_FIELD) compassAcc = acc; }

    /* ---------- the bridge ---------- */
    private class Bridge {
        /** the web app says whether Back has somewhere to go inside the app */
        @JavascriptInterface public void setCanBack(final boolean can) { ui.post(() -> back.set(can)); }
        /* recited audio (optional downloads) */
        @JavascriptInterface public String audioHave(String names) { return audio().have(names); }
        @JavascriptInterface public double audioUsage() { return audio().usage(); }
        @JavascriptInterface public void audioDownload(String json, String tag) { audio().download(json, tag); }
        @JavascriptInterface public void audioCancel() { audio().cancel(); }
        @JavascriptInterface public void audioDeleteAll() { audio().deleteAll(); }
        @JavascriptInterface public void audioPlay(String names, double rate) { ui.post(() -> audio().play(names, (float) rate)); }
        @JavascriptInterface public void audioPause() { ui.post(() -> audio().pause()); }
        @JavascriptInterface public void audioResume() { ui.post(() -> audio().resume()); }
        @JavascriptInterface public void audioRate(double r) { ui.post(() -> audio().setRate((float) r)); }
        @JavascriptInterface public void audioStop() { ui.post(() -> audio().stop()); }
        /* the floating dhikr over other apps */
        @JavascriptInterface public boolean overlayOk() { return Overlay.allowed(MainActivity.this); }
        @JavascriptInterface public void openOverlay() { ui.post(() -> { Overlay.openSettings(MainActivity.this); toast(L.t("Allow Adhkār to display over other apps", "اسمح للتطبيق بالظهور فوق التطبيقات")); }); }
        @JavascriptInterface public String takeNudgeTally() { return Store.takeNudge(MainActivity.this); }
        /* Do Not Disturb access, for silencing the phone during ṣalāh */
        @JavascriptInterface public boolean dndOk() { android.app.NotificationManager nm = getSystemService(android.app.NotificationManager.class); return nm != null && nm.isNotificationPolicyAccessGranted(); }
        @JavascriptInterface public void openDndAccess() { ui.post(() -> { try { startActivity(new Intent(android.provider.Settings.ACTION_NOTIFICATION_POLICY_ACCESS_SETTINGS)); toast(L.t("Choose Adhkār, then allow", "اختر التطبيق ثم اسمح")); } catch (Exception ignored) { } }); }
        /* battery optimisation: null when not applicable (Android handles it), false when the app may be paused */
        @JavascriptInterface public boolean batteryOk() {
            android.os.PowerManager pm = getSystemService(android.os.PowerManager.class);
            return pm == null || pm.isIgnoringBatteryOptimizations(getPackageName());
        }
        @JavascriptInterface public void openBattery() {
            ui.post(() -> {
                try { startActivity(new Intent(android.provider.Settings.ACTION_IGNORE_BATTERY_OPTIMIZATION_SETTINGS)); toast(L.t("Choose Adhkār, then Don't optimise", "اختر التطبيق ثم «عدم التحسين»")); }
                catch (Exception e) { try { startActivity(new Intent(android.provider.Settings.ACTION_APPLICATION_DETAILS_SETTINGS, Uri.parse("package:" + getPackageName()))); } catch (Exception ignored) { } }
            });
        }
        /* first view painted: release the splash */
        @JavascriptInterface public void ready(final double ms) {
            if (ready) return;
            ready = true;
            android.util.Log.i("Adhkar", "first view in " + Math.round(ms) + " ms");
            ui.post(() -> root.invalidate());
        }
        /* durable mirror of the web state, used if WebView storage is ever wiped */
        @JavascriptInterface public void saveState(final String json) {
            if (json == null || json.length() > 8_000_000) return;
            new Thread(() -> {
                try {
                    File tmp = new File(getFilesDir(), "state.json.tmp"), dst = new File(getFilesDir(), "state.json");
                    try (FileOutputStream fo = new FileOutputStream(tmp)) { fo.write(json.getBytes(StandardCharsets.UTF_8)); fo.getFD().sync(); }
                    if (!tmp.renameTo(dst)) { dst.delete(); tmp.renameTo(dst); }
                } catch (Exception ignored) { }
            }).start();
        }
        @JavascriptInterface public String loadState() {
            File f = new File(getFilesDir(), "state.json");
            if (!f.exists()) return null;
            try (InputStream is = new java.io.FileInputStream(f)) {
                java.io.ByteArrayOutputStream bo = new java.io.ByteArrayOutputStream(); byte[] b = new byte[16384]; int n;
                while ((n = is.read(b)) > 0) bo.write(b, 0, n);
                return new String(bo.toByteArray(), StandardCharsets.UTF_8);
            } catch (Exception e) { return null; }
        }
        @JavascriptInterface public String version() {
            try { return getPackageManager().getPackageInfo(getPackageName(), 0).versionName; } catch (Exception e) { return "android"; }
        }
        @JavascriptInterface public boolean systemDark() { return isNight(); }

        @JavascriptInterface public void haptic(String k) {
            Vibrator vb = getSystemService(Vibrator.class);
            if (vb == null || !vb.hasVibrator()) return;
            try {
                VibrationEffect ef;
                if ("success".equals(k)) ef = VibrationEffect.createWaveform(new long[]{0, 14, 70, 22}, new int[]{0, 140, 0, 220}, -1);
                else if (Build.VERSION.SDK_INT >= 29) ef = VibrationEffect.createPredefined("heavy".equals(k) ? VibrationEffect.EFFECT_HEAVY_CLICK : "click".equals(k) ? VibrationEffect.EFFECT_CLICK : VibrationEffect.EFFECT_TICK);
                else ef = VibrationEffect.createOneShot("heavy".equals(k) ? 30 : "click".equals(k) ? 16 : 8, VibrationEffect.DEFAULT_AMPLITUDE);
                vb.vibrate(ef);
            } catch (Exception ignored) { }
        }
        @JavascriptInterface public void keepAwake(boolean on) { setKeepAwake(on); }
        @JavascriptInterface public void setSystemBars(final boolean light) {
            ui.post(() -> {
                int bg = light ? 0xFFF5F1E9 : 0xFF07080D;
                root.setBackgroundColor(bg); if (web != null) web.setBackgroundColor(bg);
                if (Build.VERSION.SDK_INT >= 30) {
                    WindowInsetsController c = getWindow().getInsetsController();
                    if (c != null) c.setSystemBarsAppearance(light ? WindowInsetsController.APPEARANCE_LIGHT_STATUS_BARS | WindowInsetsController.APPEARANCE_LIGHT_NAVIGATION_BARS : 0,
                            WindowInsetsController.APPEARANCE_LIGHT_STATUS_BARS | WindowInsetsController.APPEARANCE_LIGHT_NAVIGATION_BARS);
                } else {
                    View d = getWindow().getDecorView();
                    int f = View.SYSTEM_UI_FLAG_LAYOUT_STABLE | View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN | View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION;
                    if (light) f |= View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR | View.SYSTEM_UI_FLAG_LIGHT_NAVIGATION_BAR;
                    d.setSystemUiVisibility(f);
                }
            });
        }
        @JavascriptInterface public void shareText(String text) {
            Intent i = new Intent(Intent.ACTION_SEND).setType("text/plain").putExtra(Intent.EXTRA_TEXT, text);
            startActivity(Intent.createChooser(i, L.t("Share", "مشاركة")));
        }
        @JavascriptInterface public void shareImage(String b64, String text) {
            try {
                File dir = new File(getCacheDir(), "share"); dir.mkdirs();
                File[] old = dir.listFiles(); if (old != null) for (File f : old) f.delete();
                String name = "adhkar-" + System.currentTimeMillis() + ".png";
                try (FileOutputStream fo = new FileOutputStream(new File(dir, name))) { fo.write(Base64.decode(b64, Base64.DEFAULT)); }
                Uri u = Uri.parse("content://" + ShareProvider.AUTH + "/" + name);
                Intent i = new Intent(Intent.ACTION_SEND).setType("image/png").putExtra(Intent.EXTRA_STREAM, u).addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
                if (text != null && !text.isEmpty()) i.putExtra(Intent.EXTRA_TEXT, text);
                i.setClipData(ClipData.newRawUri(name, u));
                Intent ch = Intent.createChooser(i, L.t("Share", "مشاركة")); ch.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
                startActivity(ch);
            } catch (Exception e) { toast(L.t("Could not share the image", "تعذّرت مشاركة الصورة")); }
        }
        @JavascriptInterface public void openUrl(String url) { if (url == null || url.isEmpty()) return; ui.post(() -> external(Uri.parse(url))); }
        @JavascriptInterface public boolean setAlarm(int h, int m, String label) {
            Intent i = new Intent(AlarmClock.ACTION_SET_ALARM).putExtra(AlarmClock.EXTRA_HOUR, h).putExtra(AlarmClock.EXTRA_MINUTES, m)
                    .putExtra(AlarmClock.EXTRA_MESSAGE, label).putExtra(AlarmClock.EXTRA_SKIP_UI, true).putExtra(AlarmClock.EXTRA_VIBRATE, true);
            try { startActivity(i); return true; } catch (Exception e) { return false; }
        }
        @JavascriptInterface public void sync(String json) {
            Store.saveConfig(MainActivity.this, json);
            new Thread(() -> Scheduler.run(MainActivity.this)).start();
        }
        @JavascriptInterface public String takeTrackerEvents() {
            JSONObject t = Store.config(MainActivity.this).optJSONObject("tasbih");
            return Store.takeTracker(MainActivity.this, t == null ? null : t.optString("id", null));
        }
        @JavascriptInterface public String takeWidgetEvents() { return Store.takeEvents(MainActivity.this); }
        @JavascriptInterface public boolean pinWidget(String kind) {
            AppWidgetManager m = getSystemService(AppWidgetManager.class);
            if (m == null || !m.isRequestPinAppWidgetSupported()) return false;
            Class<?> w = "tasbih".equals(kind) ? TasbihWidget.class : "adhkar".equals(kind) ? AdhkarWidget.class : "dhikr".equals(kind) ? DhikrWidget.class : PrayerWidget.class;
            return m.requestPinAppWidget(new ComponentName(MainActivity.this, w), null, null);
        }
        @JavascriptInterface public void volumeKeys(boolean on) { volumeKeys = on; }
        @JavascriptInterface public void audioHold(boolean on) { audioHold = on; }
        /** plays (or stops) the prayer-time takbīr so it can be heard in Settings */
        @JavascriptInterface public boolean previewAdhan() {
            if (preview != null) { stopPreview(); return false; }
            try {
                preview = android.media.MediaPlayer.create(MainActivity.this, R.raw.adhan_takbir);
                if (preview == null) return false;
                preview.setOnCompletionListener(p -> { stopPreview(); js("__native.onAdhanEnd&&__native.onAdhanEnd()"); });
                preview.start(); return true;
            } catch (Exception e) { stopPreview(); return false; }
        }
        @JavascriptInterface public void startCompass() { ui.post(MainActivity.this::startCompass); }
        @JavascriptInterface public void stopCompass() { ui.post(MainActivity.this::stopCompass); }
        /** refresh location only if permission was already granted; never prompts */
        @JavascriptInterface public boolean locateQuiet() { if (!hasLoc()) return false; ui.post(MainActivity.this::locate); return true; }
        @JavascriptInterface public void requestLocation() {
            ui.post(() -> { if (hasLoc()) locate(); else requestPermissions(new String[]{Manifest.permission.ACCESS_COARSE_LOCATION, Manifest.permission.ACCESS_FINE_LOCATION}, REQ_LOC); });
        }
        @JavascriptInterface public boolean requestNotifications() {
            if (Build.VERSION.SDK_INT < 33 || checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) == PackageManager.PERMISSION_GRANTED) {
                NotificationManager nm = getSystemService(NotificationManager.class);
                boolean en = nm == null || nm.areNotificationsEnabled();
                if (!en) ui.post(() -> openSettings("notifications"));
                return en;
            }
            ui.post(() -> requestPermissions(new String[]{Manifest.permission.POST_NOTIFICATIONS}, REQ_NOTIF));
            return false;
        }
        @JavascriptInterface public String notificationState() {
            JSONObject o = new JSONObject();
            try {
                NotificationManager nm = getSystemService(NotificationManager.class);
                AlarmManager am = getSystemService(AlarmManager.class);
                o.put("granted", nm != null && nm.areNotificationsEnabled());
                o.put("exact", Build.VERSION.SDK_INT < 31 || (am != null && am.canScheduleExactAlarms()));
            } catch (Exception ignored) { }
            return o.toString();
        }
        @JavascriptInterface public void exportFile(String name, String text) {
            pendingExport = text;
            Intent i = new Intent(Intent.ACTION_CREATE_DOCUMENT).addCategory(Intent.CATEGORY_OPENABLE).setType("application/json").putExtra(Intent.EXTRA_TITLE, name);
            ui.post(() -> { try { startActivityForResult(i, REQ_EXPORT); } catch (Exception e) { toast(L.t("No file manager available", "لا يوجد مدير ملفات")); } });
        }
        @JavascriptInterface public void importFile() {
            Intent i = new Intent(Intent.ACTION_OPEN_DOCUMENT).addCategory(Intent.CATEGORY_OPENABLE).setType("*/*")
                    .putExtra(Intent.EXTRA_MIME_TYPES, new String[]{"application/json", "text/plain", "application/octet-stream"});
            ui.post(() -> { try { startActivityForResult(i, REQ_IMPORT); } catch (Exception e) { toast(L.t("No file manager available", "لا يوجد مدير ملفات")); } });
        }
        @JavascriptInterface public void openSettings(String which) { ui.post(() -> MainActivity.this.openSettings(which)); }
    }

    private void openSettings(String which) {
        Intent i;
        if ("exact".equals(which) && Build.VERSION.SDK_INT >= 31) i = new Intent(Settings.ACTION_REQUEST_SCHEDULE_EXACT_ALARM, Uri.parse("package:" + getPackageName()));
        else if ("battery".equals(which)) i = new Intent(Settings.ACTION_IGNORE_BATTERY_OPTIMIZATION_SETTINGS);
        else i = new Intent(Settings.ACTION_APP_NOTIFICATION_SETTINGS).putExtra(Settings.EXTRA_APP_PACKAGE, getPackageName());
        try { startActivity(i); } catch (Exception e) { try { startActivity(new Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS, Uri.parse("package:" + getPackageName()))); } catch (Exception ignored) { } }
    }
}
