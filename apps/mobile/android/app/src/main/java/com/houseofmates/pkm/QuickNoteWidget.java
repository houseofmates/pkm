package com.houseofmates.pkm;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.Context;
import android.content.Intent;
import android.widget.RemoteViews;

/** * implementation of app widget functionality.
 */
public class QuickNoteWidget extends AppWidgetProvider {

    static void updateAppWidget(Context context, AppWidgetManager appWidgetManager,
            int appWidgetId) {

        // construct the remoteviews object        RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.quick_note_widget);

        // intent to launch the app        Intent intent = new Intent(context, MainActivity.class);
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);

        // use a pendingintent to launch the app when the widget is clicked        PendingIntent pendingIntent = PendingIntent.getActivity(
                context,
                0,
                intent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        views.setOnClickPendingIntent(R.id.widget_container, pendingIntent);

        // instruct the widget manager to update the widget        appWidgetManager.updateAppWidget(appWidgetId, views);
    }

    @Override
    public void onUpdate(Context context, AppWidgetManager appWidgetManager, int[] appWidgetIds) {
        // there may be multiple widgets active, so update all of them        for (int appWidgetId : appWidgetIds) {
            updateAppWidget(context, appWidgetManager, appWidgetId);
        }
    }

    @Override
    public void onEnabled(Context context) {
        // enter relevant functionality for when the first widget is created    }

    @Override
    public void onDisabled(Context context) {
        // enter relevant functionality for when the last widget is disabled    }
}
