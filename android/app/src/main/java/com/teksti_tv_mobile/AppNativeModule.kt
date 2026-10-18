package com.teksti_tv_mobile

import android.content.pm.ActivityInfo
import com.facebook.react.ReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.ReadableMap
import org.json.JSONObject
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
