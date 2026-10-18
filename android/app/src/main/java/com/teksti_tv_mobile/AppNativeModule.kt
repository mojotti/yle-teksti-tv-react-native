package com.teksti_tv_mobile

import android.content.pm.ActivityInfo
import com.facebook.react.ReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.ReadableMap
import org.json.JSONObject
import android.appwidget.AppWidgetManager
import android.content.ComponentName
import android.os.Build
import com.facebook.react.uimanager.ViewManager

/** Small native helpers the JS side needs (see src/utils/native.ts). */
class AppNativeModule(context: ReactApplicationContext) : ReactContextBaseJavaModule(context) {
  override fun getName() = "AppNative"

  /** Shares what the home-screen widget needs and redraws the widgets. */
  @ReactMethod
  fun setWidgetData(data: ReadableMap) {
    val favorites = data.getArray("favorites")?.toArrayList()?.joinToString(",") ?: ""
    val titles = data.getMap("titles")?.toHashMap()?.let { JSONObject(it as Map<*, *>).toString() } ?: "{}"
    WidgetPrefs.get(reactApplicationContext).edit()
      .putString("appId", data.getString("appId"))
      .putString("appKey", data.getString("appKey"))
      .putString("favorites", favorites)
      .putString("titles", titles)
      .apply()
    PageWidgetProvider.updateAll(reactApplicationContext)
  }

  /** Locks the app to portrait, or allows all orientations again. */
  /** The home-screen widgets and the page each one shows. */
  @ReactMethod
  fun getWidgets(promise: Promise) {
    val context = reactApplicationContext
    val ids = AppWidgetManager.getInstance(context)
      .getAppWidgetIds(ComponentName(context, PageWidgetProvider::class.java))
    val prefs = WidgetPrefs.get(context)
    val list = Arguments.createArray()
    ids.forEach { id ->
      val item = Arguments.createMap()
      item.putInt("id", id)
      item.putString("page", prefs.getString(WidgetPrefs.pageKey(id), "100"))
      list.pushMap(item)
    }
    promise.resolve(list)
  }

  /** Changes the page a widget shows (and forgets pages browsed on it). */
  @ReactMethod
  fun setWidgetPage(id: Int, page: String) {
    val context = reactApplicationContext
    WidgetPrefs.get(context).edit()
      .putString(WidgetPrefs.pageKey(id), page)
      .remove(WidgetPrefs.navKey(id))
      .apply()
    PageWidgetProvider.updateAll(context)
  }

  /** Asks the launcher to add a widget; resolves false if it can't. */
  @ReactMethod
  fun requestPinWidget(promise: Promise) {
    val context = reactApplicationContext
    val manager = AppWidgetManager.getInstance(context)
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O || !manager.isRequestPinAppWidgetSupported) {
      promise.resolve(false)
      return
    }
    promise.resolve(
      manager.requestPinAppWidget(ComponentName(context, PageWidgetProvider::class.java), null, null),
    )
  }

  @ReactMethod
  fun setPortraitLock(locked: Boolean) {
    val activity = reactApplicationContext.currentActivity ?: return
    activity.runOnUiThread {
      activity.requestedOrientation =
        if (locked) ActivityInfo.SCREEN_ORIENTATION_PORTRAIT
        else ActivityInfo.SCREEN_ORIENTATION_UNSPECIFIED
    }
  }
}

class AppNativePackage : ReactPackage {
  override fun createNativeModules(context: ReactApplicationContext): List<NativeModule> =
    listOf(AppNativeModule(context))

  override fun createViewManagers(context: ReactApplicationContext): List<ViewManager<*, *>> =
    emptyList()
}
