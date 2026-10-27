package expo.modules.workoutworker

import android.app.Activity
import android.app.KeyguardManager
import android.graphics.Color
import android.graphics.Typeface
import android.os.Build
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.util.TypedValue
import android.view.Gravity
import android.view.KeyEvent
import android.view.ViewGroup
import android.view.WindowManager
import android.widget.Button
import android.widget.LinearLayout
import android.widget.TextView
import expo.modules.workoutworker.WorkoutConstants.getLaunchAppAtWorkoutPageIntent
import expo.modules.workoutworker.utils.WorkoutNotificationManager

/**
 * Full-screen "rest is over" alarm, launched over the lock screen by the rest notification's
 * full-screen intent so the alarm can be silenced without unlocking the phone.
 *
 * It lives exactly as long as the rest notification: silencing it from anywhere else (the
 * notification, the app, logging the next set) cancels the notification, and this screen closes.
 */
class RestAlarmActivity : Activity() {
    companion object {
        const val EXTRA_TITLE = "expo.modules.workoutworker.REST_ALARM_TITLE"
        const val EXTRA_REST_END_MS = "expo.modules.workoutworker.REST_ALARM_END_MS"
    }

    private val handler = Handler(Looper.getMainLooper())
    private lateinit var notificationManager: WorkoutNotificationManager
    private lateinit var overtimeView: TextView
    private var restEndMs = 0L

    private val tick = object : Runnable {
        override fun run() {
            if (!notificationManager.isRestNotificationActive()) {
                finish()
                return
            }
            val overtimeSecs = ((System.currentTimeMillis() - restEndMs) / 1000).coerceAtLeast(0)
            overtimeView.text = String.format("+%d:%02d", overtimeSecs / 60, overtimeSecs % 60)
            handler.postDelayed(this, 500)
        }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        notificationManager = WorkoutNotificationManager(this)
        restEndMs = intent.getLongExtra(EXTRA_REST_END_MS, System.currentTimeMillis())
        showOverLockScreen()
        setContentView(buildLayout(intent.getStringExtra(EXTRA_TITLE) ?: "Rest over"))
    }

    override fun onResume() {
        super.onResume()
        handler.post(tick)
    }

    override fun onPause() {
        super.onPause()
        handler.removeCallbacks(tick)
    }

    // Like a clock alarm, either volume key silences it.
    override fun onKeyDown(keyCode: Int, event: KeyEvent?): Boolean {
        if (keyCode == KeyEvent.KEYCODE_VOLUME_UP || keyCode == KeyEvent.KEYCODE_VOLUME_DOWN) {
            silence()
            return true
        }
        return super.onKeyDown(keyCode, event)
    }

    private fun showOverLockScreen() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O_MR1) {
            setShowWhenLocked(true)
            setTurnScreenOn(true)
        } else {
            @Suppress("DEPRECATION")
            window.addFlags(
                WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED or
                    WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON
            )
        }
        window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
    }

    private fun silence() {
        handler.removeCallbacks(tick)
        notificationManager.clearRestNotification()
        finish()
    }

    private fun openApp() {
        handler.removeCallbacks(tick)
        notificationManager.clearRestNotification()
        val keyguard = getSystemService(KeyguardManager::class.java)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O && keyguard != null && keyguard.isKeyguardLocked) {
            keyguard.requestDismissKeyguard(this, object : KeyguardManager.KeyguardDismissCallback() {
                override fun onDismissSucceeded() {
                    launchAppAndFinish()
                }

                override fun onDismissCancelled() {
                    finish()
                }
            })
        } else {
            launchAppAndFinish()
        }
    }

    private fun launchAppAndFinish() {
        startActivity(getLaunchAppAtWorkoutPageIntent())
        finish()
    }

    private fun dp(value: Int): Int =
        TypedValue.applyDimension(TypedValue.COMPLEX_UNIT_DIP, value.toFloat(), resources.displayMetrics).toInt()

    private fun buildLayout(title: String): LinearLayout {
        val match = ViewGroup.LayoutParams.MATCH_PARENT
        val wrap = ViewGroup.LayoutParams.WRAP_CONTENT

        val titleView = TextView(this).apply {
            text = title
            setTextColor(Color.WHITE)
            setTextSize(TypedValue.COMPLEX_UNIT_SP, 28f)
            gravity = Gravity.CENTER
        }
        overtimeView = TextView(this).apply {
            text = "+0:00"
            setTextColor(Color.rgb(255, 82, 82))
            setTextSize(TypedValue.COMPLEX_UNIT_SP, 72f)
            typeface = Typeface.DEFAULT_BOLD
            gravity = Gravity.CENTER
        }
        val silenceButton = Button(this).apply {
            text = "Silence"
            setTextSize(TypedValue.COMPLEX_UNIT_SP, 36f)
            setTextColor(Color.WHITE)
            setBackgroundColor(Color.rgb(198, 40, 40))
            setOnClickListener { silence() }
        }
        val openAppButton = Button(this).apply {
            text = "Open LiftLog"
            setTextSize(TypedValue.COMPLEX_UNIT_SP, 18f)
            setOnClickListener { openApp() }
        }

        return LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            gravity = Gravity.CENTER
            setBackgroundColor(Color.rgb(24, 18, 18))
            setPadding(dp(24), dp(48), dp(24), dp(48))
            addView(titleView, LinearLayout.LayoutParams(match, wrap))
            addView(overtimeView, LinearLayout.LayoutParams(match, wrap).apply { topMargin = dp(16) })
            addView(silenceButton, LinearLayout.LayoutParams(match, dp(180)).apply { topMargin = dp(48) })
            addView(openAppButton, LinearLayout.LayoutParams(match, dp(64)).apply { topMargin = dp(24) })
        }
    }
}
