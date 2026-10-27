package expo.modules.workoutworker

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import expo.modules.workoutworker.utils.WorkoutNotificationManager

/** Handles the rest notification's "Silence" action, which works without unlocking the phone. */
class RestAlarmSilenceReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context?, intent: Intent?) {
        if (context != null) {
            WorkoutNotificationManager(context).clearRestNotification()
        }
    }
}
