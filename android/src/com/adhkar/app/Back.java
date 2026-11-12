package com.adhkar.app;

import android.annotation.TargetApi;
import android.app.Activity;
import android.os.Build;
import android.window.BackEvent;
import android.window.OnBackAnimationCallback;
import android.window.OnBackInvokedCallback;
import android.window.OnBackInvokedDispatcher;

/**
 * Predictive back (Android 13 and later).
 * When the app has nowhere to go back to, no callback is registered and the system previews "back to home".
 * When it has (a sheet, the reader, any page but Today), a callback takes the gesture; on Android 14 and later its
 * progress is passed to the web app, which previews its own step back while the finger is down.
 * The web app reports which applies through setCanBack. Android 12 and older use onBackPressed as before.
 */
final class Back {
    interface Host {
        /** perform one step back */
        void step();
        /** run script in the page */
        void js(String code);
    }

    private final Activity activity;
    private final Host host;
    private Object callback;
    private boolean registered;

    Back(Activity activity, Host host) { this.activity = activity; this.host = host; }

    /** called on the UI thread whenever the web app's answer to "can you go back?" changes */
    @TargetApi(33)
    void set(boolean can) {
        if (Build.VERSION.SDK_INT < 33 || can == registered) return;
        OnBackInvokedDispatcher d = activity.getOnBackInvokedDispatcher();
        if (callback == null) callback = Build.VERSION.SDK_INT >= 34 ? new Preview(host) : new Plain(host);
        if (can) d.registerOnBackInvokedCallback(OnBackInvokedDispatcher.PRIORITY_DEFAULT, (OnBackInvokedCallback) callback);
        else d.unregisterOnBackInvokedCallback((OnBackInvokedCallback) callback);
        registered = can;
    }

    @TargetApi(33)
    private static final class Plain implements OnBackInvokedCallback {
        private final Host host;
        Plain(Host host) { this.host = host; }
        @Override public void onBackInvoked() { host.step(); }
    }

    /** the gesture as it happens: started (from which edge), progress 0 to 1, cancelled, or completed */
    @TargetApi(34)
    private static final class Preview implements OnBackAnimationCallback {
        private final Host host;
        Preview(Host host) { this.host = host; }
        @Override public void onBackStarted(BackEvent e) { host.js("__native.onBackStart&&__native.onBackStart(" + (e.getSwipeEdge() == BackEvent.EDGE_RIGHT ? 1 : 0) + ")"); }
        @Override public void onBackProgressed(BackEvent e) { host.js("__native.onBackProgress&&__native.onBackProgress(" + e.getProgress() + ")"); }
        @Override public void onBackCancelled() { host.js("__native.onBackCancel&&__native.onBackCancel()"); }
        @Override public void onBackInvoked() { host.step(); }
    }
}
