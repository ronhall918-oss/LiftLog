import { RootState } from '@/store';
import { Duration, OffsetDateTime } from '@js-joda/core';
import { Dispatch } from '@reduxjs/toolkit';
import {
  AndroidImportance,
  AndroidNotificationVisibility,
  setNotificationChannelAsync,
  setNotificationHandler,
} from 'expo-notifications';
import { Platform } from 'react-native';
import WorkoutWorkerModule from '~/modules/workout-worker/src/WorkoutWorkerModule';

setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

if (Platform.OS === 'android') {
  void setNotificationChannelAsync('workout_channel', {
    name: 'Workout',
    description: 'A persistent notification showing your time throughout the workout',
    importance: AndroidImportance.HIGH,
    enableVibrate: true,
    showBadge: true,
    lockscreenVisibility: AndroidNotificationVisibility.PUBLIC,
    bypassDnd: false,
  });
  void setNotificationChannelAsync('rest_channel', {
    name: 'Rest Notifications',
    description: 'A notification alerting you that your rest is over',
    // High importance pops the alarm up as a banner, so it can be silenced with a tap.
    importance: AndroidImportance.HIGH,
    enableVibrate: true,
    showBadge: true,
    lockscreenVisibility: AndroidNotificationVisibility.PUBLIC,
    bypassDnd: false,
  });
}
/**
 * Notification service is used for displaying dumb notifications through expo notifications
 * on iOS; android uses richer notifications via WorkoutWorker. On android it can instead hand
 * the rest alarm to the phone's Clock app, which rings over the lock screen like any timer.
 */
export class NotificationService {
  // Rest timers are re-announced whenever the session changes; only start one Clock timer per rest.
  private lastClockTimerEnd: OffsetDateTime | undefined;

  constructor(
    readonly getState: () => RootState,
    readonly dispatch: Dispatch,
  ) {}

  async scheduleNextSetNotification(time: OffsetDateTime) {
    if (Platform.OS !== 'android' || !this.getState().settings.useClockAppForRestAlarm) {
      return;
    }
    if (this.lastClockTimerEnd?.isEqual(time)) {
      return;
    }
    const seconds = Math.round(Duration.between(OffsetDateTime.now(), time).toMillis() / 1000);
    if (seconds < 1) {
      return;
    }
    this.lastClockTimerEnd = time;
    // The Clock app owns the timer from here: LiftLog has no way to cancel it.
    WorkoutWorkerModule.startClockTimer(seconds, 'LiftLog rest');
  }

  async clearSetTimerNotification() {}
}
