package com.adhkar.app;

import android.app.PendingIntent;
import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.service.quicksettings.Tile;
import android.service.quicksettings.TileService;

/** Quick-settings tile: opens the dhikr tracker. */
public class TasbihTile extends TileService {
    @Override
    public void onStartListening() {
        Tile t = getQsTile();
        if (t == null) return;
        t.setState(Tile.STATE_INACTIVE);
        Store.config(this);   /* sets the language */
        t.setLabel(L.t("Tracker", "العدّاد"));
        if (Build.VERSION.SDK_INT >= 29) t.setSubtitle(L.t("Adhkār", "الأذكار"));
        t.updateTile();
    }

    @Override
    @SuppressWarnings("deprecation")
    public void onClick() {
        Intent i = new Intent(this, MainActivity.class).setAction(Intent.ACTION_VIEW).setData(Uri.parse("adhkar://route/tracker"))
                .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        if (Build.VERSION.SDK_INT >= 34) {
            startActivityAndCollapse(PendingIntent.getActivity(this, 300, i, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE));
        } else {
            startActivityAndCollapse(i);
        }
    }
}
