package com.teksti_tv_mobile

import android.app.Activity
import android.appwidget.AppWidgetManager
import android.content.Intent
import android.graphics.Color
import android.graphics.Typeface
import android.os.Bundle
import android.text.InputFilter
import android.text.InputType
import android.util.TypedValue
import android.view.Gravity
import android.view.ViewGroup.LayoutParams
import android.widget.Button
import android.widget.EditText
import android.widget.LinearLayout
import android.widget.ScrollView
import android.widget.TextView
import org.json.JSONObject

/** Lets the user pick the page when adding (or reconfiguring) a widget. */
class PageWidgetConfigActivity : Activity() {
  private var widgetId = AppWidgetManager.INVALID_APPWIDGET_ID

  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)
    setResult(RESULT_CANCELED)
    widgetId = intent?.extras?.getInt(AppWidgetManager.EXTRA_APPWIDGET_ID, AppWidgetManager.INVALID_APPWIDGET_ID)
      ?: AppWidgetManager.INVALID_APPWIDGET_ID
    if (widgetId == AppWidgetManager.INVALID_APPWIDGET_ID) {
      finish()
      return
    }

    val prefs = WidgetPrefs.get(this)
    val favorites = (prefs.getString("favorites", "") ?: "").split(",").filter { it.isNotBlank() }
    val titles = runCatching { JSONObject(prefs.getString("titles", "{}") ?: "{}") }.getOrNull()
    val dp = { v: Int -> TypedValue.applyDimension(TypedValue.COMPLEX_UNIT_DIP, v.toFloat(), resources.displayMetrics).toInt() }

    val root = LinearLayout(this).apply {
      orientation = LinearLayout.VERTICAL
      setPadding(dp(20), dp(32), dp(20), dp(20))
    }
    root.addView(TextView(this).apply {
      text = "Valitse sivu"
      setTextColor(Color.WHITE)
      textSize = 22f
      setTypeface(typeface, Typeface.BOLD)
    })

    val input = EditText(this).apply {
      hint = "Sivunumero (100–899)"
      setHintTextColor(Color.parseColor("#8A8F98"))
      setTextColor(Color.WHITE)
      inputType = InputType.TYPE_CLASS_NUMBER
      filters = arrayOf(InputFilter.LengthFilter(3))
      setText(prefs.getString(WidgetPrefs.pageKey(widgetId), null) ?: "")
    }
    root.addView(input, LinearLayout.LayoutParams(LayoutParams.MATCH_PARENT, LayoutParams.WRAP_CONTENT).apply {
      topMargin = dp(16)
    })
    root.addView(Button(this).apply {
      text = "Valmis"
      setOnClickListener {
        val page = input.text.toString()
        val n = page.toIntOrNull()
        if (page.length == 3 && n != null && n in 100..899) save(page) else input.error = "Sivunumeron pitää olla väliltä 100–899"
      }
    })

    if (favorites.isNotEmpty()) {
      root.addView(TextView(this).apply {
        text = "SUOSIKIT"
        setTextColor(Color.parseColor("#8A8F98"))
        textSize = 12f
        setPadding(0, dp(24), 0, dp(8))
      })
      favorites.forEach { page ->
        val title = titles?.optString(page).orEmpty()
        root.addView(TextView(this).apply {
          text = if (title.isNotEmpty()) "$page   $title" else page
          setTextColor(Color.WHITE)
          textSize = 18f
          typeface = Typeface.MONOSPACE
          gravity = Gravity.CENTER_VERTICAL
          minHeight = dp(48)
          setOnClickListener { save(page) }
        })
      }
    }
    setContentView(ScrollView(this).apply { addView(root) })
  }

  private fun save(page: String) {
    WidgetPrefs.get(this).edit()
      .putString(WidgetPrefs.pageKey(widgetId), page)
      .remove(WidgetPrefs.navKey(widgetId))
      .apply()
    PageWidgetProvider.updateAll(this)
    setResult(RESULT_OK, Intent().putExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, widgetId))
    finish()
  }
}
