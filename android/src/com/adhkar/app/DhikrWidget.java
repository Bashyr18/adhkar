package com.adhkar.app;

import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.Context;

public class DhikrWidget extends AppWidgetProvider {
    @Override
    public void onUpdate(Context c, AppWidgetManager m, int[] ids) { Widgets.updateAll(c); }
}
