package com.adhkar.app;

import android.content.Context;
import android.media.AudioAttributes;
import android.media.MediaPlayer;
import android.media.PlaybackParams;
import android.os.Handler;
import android.os.Looper;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.File;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

/** Optional recited audio: downloads only from the two recitation sources, plays a playlist of local files. */
final class Audio {
    interface Sink { void send(String js); }

    private static final String[] HOSTS = {"https://www.hisnmuslim.com/audio/ar/", "https://everyayah.com/data/Alafasy_128kbps/"};
    private static final long MAX_BYTES = 12L * 1024 * 1024;
    private final Context c;
    private final Sink sink;
    private final Handler ui = new Handler(Looper.getMainLooper());
    private final ExecutorService net = Executors.newSingleThreadExecutor();
    private volatile boolean cancel;
    private MediaPlayer mp;
    private List<File> queue = new ArrayList<>();
    private int qi;
    private float rate = 1f;
    private final Runnable tick = new Runnable() {
        @Override public void run() {
            if (mp == null) return;
            try { sink.send("__native.onAudioPos&&__native.onAudioPos(" + qi + "," + queue.size() + "," + mp.getCurrentPosition() + "," + mp.getDuration() + "," + mp.isPlaying() + ")"); } catch (Exception ignored) { }
            ui.postDelayed(this, 200);
        }
    };

    Audio(Context c, Sink sink) { this.c = c.getApplicationContext(); this.sink = sink; }

    private File dir() { File d = new File(c.getFilesDir(), "audio"); if (!d.exists()) d.mkdirs(); return d; }
    private static boolean safeName(String n) { return n != null && n.matches("[a-z0-9]{1,24}\\.mp3"); }
    private static boolean allowed(String u) { if (u == null) return false; for (String h : HOSTS) if (u.startsWith(h) && u.substring(h.length()).matches("[0-9]{1,6}\\.mp3")) return true; return false; }

    /** names (JSON array) → the subset already on the device */
    String have(String names) {
        JSONArray out = new JSONArray();
        try { JSONArray a = new JSONArray(names); for (int i = 0; i < a.length(); i++) { String n = a.optString(i); if (safeName(n) && new File(dir(), n).isFile()) out.put(n); } } catch (Exception ignored) { }
        return out.toString();
    }

    long usage() { long s = 0; File[] f = dir().listFiles(); if (f != null) for (File x : f) s += x.length(); return s; }

    void deleteAll() { stop(); File[] f = dir().listFiles(); if (f != null) for (File x : f) x.delete(); }

    void cancel() { cancel = true; }

    /** [{n: name, u: url}] downloaded one by one; progress goes to __native.onAudio */
    void download(final String json, final String tag) {
        cancel = false;
        net.execute(() -> {
            /* every file is tried (twice, on a flaky connection); one failure never stops the rest */
            int done = 0, total = 0, failed = 0; String state = "done";
            try {
                JSONArray a = new JSONArray(json); total = a.length();
                for (int i = 0; i < a.length(); i++) {
                    if (cancel) { state = "cancelled"; break; }
                    JSONObject o = a.getJSONObject(i); String n = o.optString("n"), u = o.optString("u");
                    File f = new File(dir(), n);
                    boolean ok = false;
                    for (int attempt = 0; attempt < 2 && !ok && !cancel; attempt++) {
                        try {
                            if (u.startsWith("asset:") && safeName(n) && u.substring(6).matches("audio/[a-z0-9-]{1,40}\\.mp3")) { if (!f.isFile()) copyAsset(u.substring(6), f); ok = true; }
                            else if (!safeName(n) || !allowed(u)) break;
                            else { if (!f.isFile()) fetch(u, f); ok = true; }
                        } catch (Exception e) { new File(f.getPath() + ".part").delete(); }
                    }
                    if (ok) done++; else failed++;
                    report(tag, "progress", done + failed, total);
                }
            } catch (Exception e) { state = "error"; }
            if (state.equals("done") && failed > 0) state = done > 0 ? "partial" : "error";
            report(tag, state, done, total);
        });
    }

    /* recordings bundled with the app (web/audio) are copied out once and then play like downloads */
    private void copyAsset(String path, File dst) throws Exception {
        File tmp = new File(dst.getPath() + ".part");
        try (InputStream in = c.getAssets().open("www/" + path); FileOutputStream out = new FileOutputStream(tmp)) { byte[] b = new byte[32768]; int r; while ((r = in.read(b)) > 0) out.write(b, 0, r); }
        if (!tmp.renameTo(dst)) throw new Exception("rename");
    }

    private void fetch(String u, File dst) throws Exception {
        HttpURLConnection h = (HttpURLConnection) new URL(u).openConnection();
        h.setConnectTimeout(15000); h.setReadTimeout(20000); h.setInstanceFollowRedirects(false);
        try {
            if (h.getResponseCode() != 200) throw new Exception("http " + h.getResponseCode());
            String ct = h.getContentType();
            if (ct != null && !ct.startsWith("audio/")) throw new Exception("type " + ct);
            File tmp = new File(dst.getPath() + ".part");
            long n = 0;
            try (InputStream in = h.getInputStream(); FileOutputStream out = new FileOutputStream(tmp)) {
                byte[] b = new byte[32768]; int r;
                while ((r = in.read(b)) > 0) { if (cancel) throw new Exception("cancelled"); n += r; if (n > MAX_BYTES) throw new Exception("too large"); out.write(b, 0, r); }
            }
            if (!tmp.renameTo(dst)) throw new Exception("rename");
        } finally { h.disconnect(); }
    }

    private void report(String tag, String state, int done, int total) {
        try { sink.send("__native.onAudio&&__native.onAudio(" + JSONObject.quote(new JSONObject().put("tag", tag).put("state", state).put("done", done).put("total", total).toString()) + ")"); } catch (Exception ignored) { }
    }

    /** plays the named local files in order at the given speed */
    void play(String names, float speed) {
        stop();
        queue = new ArrayList<>();
        try { JSONArray a = new JSONArray(names); for (int i = 0; i < a.length(); i++) { String n = a.optString(i); File f = new File(dir(), n); if (safeName(n) && f.isFile()) queue.add(f); } } catch (Exception ignored) { }
        if (queue.isEmpty()) return;
        rate = Math.max(.5f, Math.min(1.5f, speed));
        qi = 0; start();
    }

    private void start() {
        try {
            mp = new MediaPlayer();
            mp.setAudioAttributes(new AudioAttributes.Builder().setUsage(AudioAttributes.USAGE_MEDIA).setContentType(AudioAttributes.CONTENT_TYPE_SPEECH).build());
            mp.setDataSource(queue.get(qi).getPath());
            mp.setOnCompletionListener(p -> {
                p.release(); mp = null;
                if (++qi < queue.size()) start();
                else { ui.removeCallbacks(tick); sink.send("__native.onAudioEnd&&__native.onAudioEnd()"); }
            });
            mp.prepare();
            if (rate != 1f) mp.setPlaybackParams(new PlaybackParams().setSpeed(rate));
            mp.start();
            ui.removeCallbacks(tick); ui.post(tick);
        } catch (Exception e) { stop(); sink.send("__native.onAudioEnd&&__native.onAudioEnd()"); }
    }

    void pause() { if (mp != null && mp.isPlaying()) mp.pause(); }
    void resume() { if (mp != null && !mp.isPlaying()) { mp.start(); ui.removeCallbacks(tick); ui.post(tick); } }
    void setRate(float r) { rate = Math.max(.5f, Math.min(1.5f, r)); try { if (mp != null) { boolean was = mp.isPlaying(); mp.setPlaybackParams(new PlaybackParams().setSpeed(rate)); if (!was) mp.pause(); } } catch (Exception ignored) { } }
    void stop() { ui.removeCallbacks(tick); if (mp != null) { try { mp.stop(); } catch (Exception ignored) { } mp.release(); mp = null; } }
}
