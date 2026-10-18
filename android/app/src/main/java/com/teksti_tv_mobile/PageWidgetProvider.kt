package com.teksti_tv_mobile

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.net.Uri
import android.view.View
import android.widget.RemoteViews
import java.net.HttpURLConnection
import java.net.URL
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import java.util.concurrent.Executors
import kotlin.concurrent.thread
import kotlin.math.roundToInt
import org.json.JSONObject

/**
 * Home-screen widget showing one teletext page as an image, with the
 * teletext colour keys for previous/next page and subpage.
 */
class PageWidgetProvider : AppWidgetProvider() {

  override fun onUpdate(context: Context, manager: AppWidgetManager, ids: IntArray) {
    val pending = goAsync()
    thread {
      try {
        ids.forEach { update(context, manager, it) }
      } finally {
        pending.finish()
      }
    }
  }

  override fun onReceive(context: Context, intent: Intent) {
    if (intent.action != ACTION_NAVIGATE) {
      super.onReceive(context, intent)
      return
    }
    val id = intent.getIntExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, AppWidgetManager.INVALID_APPWIDGET_ID)
    val direction = intent.getStringExtra(EXTRA_DIRECTION) ?: return
    val pending = goAsync()
    // One tap at a time, so quick taps each move one step from the last result.
    taps.execute {
      try {
        navigate(context, id, direction)
        update(context, AppWidgetManager.getInstance(context), id)
      } finally {
        pending.finish()
      }
    }
  }

  override fun onDeleted(context: Context, ids: IntArray) {
    val edit = WidgetPrefs.get(context).edit()
    ids.forEach {
      edit.remove(WidgetPrefs.pageKey(it))
      edit.remove(WidgetPrefs.navKey(it))
    }
    edit.apply()
  }

  private class PageInfo(val subCount: Int, val prev: String?, val next: String?)

  companion object {
    const val ACTION_NAVIGATE = "com.teksti_tv_mobile.WIDGET_NAVIGATE"
    const val EXTRA_DIRECTION = "direction"

    private val taps = Executors.newSingleThreadExecutor()

    /** Navigated pages return to the chosen one after an hour without taps. */
    private const val NAV_EXPIRY_MS = 60 * 60 * 1000L

    /** Redraws every widget, e.g. after the app shared new data. */
    fun updateAll(context: Context) {
      val manager = AppWidgetManager.getInstance(context)
      val ids = manager.getAppWidgetIds(ComponentName(context, PageWidgetProvider::class.java))
      if (ids.isEmpty()) return
      thread { ids.forEach { update(context, manager, it) } }
    }

    private fun credentials(context: Context): Pair<String, String> {
      val prefs = WidgetPrefs.get(context)
      return (prefs.getString("appId", "") ?: "") to (prefs.getString("appKey", "") ?: "")
    }

    /** The page and subpage a widget shows now. */
    private fun current(context: Context, id: Int): Pair<String, Int> {
      val prefs = WidgetPrefs.get(context)
      val configured = prefs.getString(WidgetPrefs.pageKey(id), null) ?: "100"
      val nav = prefs.getString(WidgetPrefs.navKey(id), null)?.split(":")
      if (nav != null && nav.size == 3) {
        val at = nav[2].toLongOrNull() ?: 0
        if (System.currentTimeMillis() - at < NAV_EXPIRY_MS) {
          return nav[0] to (nav[1].toIntOrNull() ?: 1)
        }
      }
      return configured to 1
    }

    /** Runs [block] once more after a short pause if it fails (cold starts, flaky networks). */
    private fun <T> withRetry(block: () -> T?): T? =
      runCatching(block).getOrNull() ?: run {
        Thread.sleep(700)
        runCatching(block).getOrNull()
      }

    private fun fetchInfo(context: Context, page: String): PageInfo? {
      val (appId, appKey) = credentials(context)
      if (appId.isEmpty()) return null
      val prefs = WidgetPrefs.get(context)
      val info = withRetry {
        val url = URL("https://external.api.yle.fi/v1/teletext/pages/$page.json?app_id=$appId&app_key=$appKey")
        val conn = url.openConnection() as HttpURLConnection
        conn.connectTimeout = 8000
        conn.readTimeout = 8000
        val text = conn.inputStream.bufferedReader().use { it.readText() }
        val p = JSONObject(text).getJSONObject("teletext").getJSONObject("page")
        PageInfo(
          subCount = p.optString("subpagecount", "1").toIntOrNull() ?: 1,
          prev = p.optString("prevpg").takeIf { it.isNotEmpty() },
          next = p.optString("nextpg").takeIf { it.isNotEmpty() },
        )
      }
      // Remember the subpage count so the keys stay usable if a later fetch fails.
      if (info != null) {
        prefs.edit().putInt("subcount_$page", info.subCount).apply()
      }
      return info
    }

    private fun navigate(context: Context, id: Int, direction: String) {
      val (page, sub) = current(context, id)
      val info = fetchInfo(context, page) ?: return
      val (newPage, newSub) = when (direction) {
        "prevPage" -> (info.prev ?: return) to 1
        "nextPage" -> (info.next ?: return) to 1
        "prevSub" -> page to if (sub > 1) sub - 1 else info.subCount
        else -> page to if (sub < info.subCount) sub + 1 else 1
      }
      WidgetPrefs.get(context).edit()
        .putString(WidgetPrefs.navKey(id), "$newPage:$newSub:${System.currentTimeMillis()}")
        .apply()
    }

    /**
     * Yle's 720 × 432 images have an empty 18 px column on the left and row at
     * the bottom; cutting them off centres the page (the app does the same).
     */
    private fun cropBlankEdges(bitmap: Bitmap): Bitmap {
      val scale = bitmap.width / 720f
      val edge = (18 * scale).roundToInt()
      if (edge <= 0 || bitmap.width <= edge * 2 || bitmap.height <= edge * 2) return bitmap
      return Bitmap.createBitmap(bitmap, edge, 0, bitmap.width - edge, bitmap.height - edge)
    }

    private fun keyIntent(context: Context, id: Int, direction: String, request: Int): PendingIntent {
      val intent = Intent(context, PageWidgetProvider::class.java)
        .setAction(ACTION_NAVIGATE)
        .putExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, id)
        .putExtra(EXTRA_DIRECTION, direction)
      return PendingIntent.getBroadcast(
        context, id * 10 + request, intent, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
      )
    }

    fun update(context: Context, manager: AppWidgetManager, id: Int) {
      val prefs = WidgetPrefs.get(context)
      val (appId, appKey) = credentials(context)
      val (page, wantedSub) = current(context, id)
      val info = fetchInfo(context, page)
      val subCount = info?.subCount ?: prefs.getInt("subcount_$page", 1)
      val sub = wantedSub.coerceIn(1, subCount)
      val title = runCatching {
        JSONObject(prefs.getString("titles", "{}") ?: "{}").optString(page)
      }.getOrDefault("")

      val views = RemoteViews(context.packageName, R.layout.page_widget)
      views.setTextViewText(R.id.widget_page, page)
      views.setTextViewText(R.id.widget_title, title)
      val time = SimpleDateFormat("H.mm", Locale.ROOT).format(Date())
      views.setTextViewText(R.id.widget_time, if (subCount > 1) "$sub/$subCount  $time" else time)

      val open = Intent(Intent.ACTION_VIEW, Uri.parse("tekstitv://page/$page/$sub")).setPackage(context.packageName)
      views.setOnClickPendingIntent(
        R.id.widget_root,
        PendingIntent.getActivity(context, id, open, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE),
      )
      views.setOnClickPendingIntent(R.id.key_prev_page, keyIntent(context, id, "prevPage", 1))
      views.setOnClickPendingIntent(R.id.key_next_page, keyIntent(context, id, "nextPage", 2))
      views.setOnClickPendingIntent(R.id.key_prev_sub, keyIntent(context, id, "prevSub", 3))
      views.setOnClickPendingIntent(R.id.key_next_sub, keyIntent(context, id, "nextSub", 4))
      // Single-subpage pages dim the subpage keys instead of hiding them, so
      // the page keys never move under the user's finger.
      val subAlpha = if (subCount > 1) 1f else 0.3f
      views.setFloat(R.id.key_prev_sub, "setAlpha", subAlpha)
      views.setFloat(R.id.key_next_sub, "setAlpha", subAlpha)

      val bitmap = if (appId.isEmpty()) null else withRetry {
        val url = URL("https://external.api.yle.fi/v1/teletext/images/$page/$sub.png?app_id=$appId&app_key=$appKey&t=${System.currentTimeMillis()}")
        val conn = url.openConnection() as HttpURLConnection
        conn.connectTimeout = 8000
        conn.readTimeout = 8000
        conn.inputStream.use { BitmapFactory.decodeStream(it) }
      }?.let(::cropBlankEdges)

      if (bitmap != null) {
        views.setImageViewBitmap(R.id.widget_image, bitmap)
        views.setViewVisibility(R.id.widget_message, View.GONE)
      } else {
        views.setTextViewText(
          R.id.widget_message,
          if (appId.isEmpty()) "Avaa Teksti-TV-sovellus kerran" else "Sivua ei saatu. Yritä hetken päästä uudelleen.",
        )
        views.setViewVisibility(R.id.widget_message, View.VISIBLE)
      }
      manager.updateAppWidget(id, views)
    }
  }
}

/** Storage shared by the app (AppNativeModule) and the widget. */
object WidgetPrefs {
  fun get(context: Context) = context.getSharedPreferences("teksti_tv_widget", Context.MODE_PRIVATE)
  fun pageKey(id: Int) = "page_$id"
  fun navKey(id: Int) = "nav_$id"
}
