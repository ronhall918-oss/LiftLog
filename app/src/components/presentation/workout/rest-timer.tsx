import React, { useCallback, useEffect, useState } from 'react';
import { ColorChoice } from '@/hooks/useAppTheme';
import { Rest } from '@/models/blueprint-models';
import { Duration, OffsetDateTime } from '@js-joda/core';
import { ViewStyle } from 'react-native';
import { impactAsync, ImpactFeedbackStyle } from 'expo-haptics';
import { RestTimerControls } from '@/components/presentation/workout/rest-timer-controls';
import { formatTimeSpan, TimerPane, TimerSegment } from '@/components/presentation/workout/timer-pane';
import { useTranslate } from '@tolgee/react';
import { useDerivedState } from '@/hooks/useDerivedState';

interface RestTimerProps {
  rest: Rest;
  startTime: OffsetDateTime;
  pausedAt: OffsetDateTime | undefined;
  failed: boolean;
  style?: ViewStyle;
  onRestart: () => void;
  onDismiss: () => void;
  onTogglePause: () => void;
  onSilence?: () => void;
}

type RestPhase = 'resting' | 'over';

const phaseColor: Record<RestPhase, ColorChoice> = {
  resting: 'onSurfaceVariant',
  over: 'red',
};

export default function RestTimer({
  rest,
  startTime,
  pausedAt,
  failed,
  style,
  onRestart,
  onDismiss,
  onTogglePause,
  onSilence,
}: RestTimerProps) {
  const { t } = useTranslate();
  const paused = pausedAt !== undefined;
  const [jiggled, setJiggled] = useDerivedState(startTime, () => [] as string[]);
  // Silencing is remembered per phase, so a timer reset (new startTime) brings the button back.
  const [silencedPhase, setSilencedPhase] = useDerivedState(startTime, () => undefined as RestPhase | undefined);

  const getTimerState = useCallback(() => {
    const now = pausedAt ?? OffsetDateTime.now();
    const elapsed = Duration.between(startTime, now).toMillis();
    // Rest is a single target (failure rest after a failed set, otherwise min rest); max rest is
    // ignored, so the timer counts down once and then counts up the overtime.
    const target = (failed ? rest.failureRest : rest.minRest).toMillis();

    if (elapsed < target) {
      return {
        phase: 'resting' as const,
        remaining: formatTimeSpan(target - elapsed),
        restProgress: elapsed / target,
      };
    }
    return {
      phase: 'over' as const,
      remaining: `+${formatTimeSpan(elapsed - target)}`,
      restProgress: 1,
    };
  }, [startTime, pausedAt, rest, failed]);

  const [timerState, setTimerState] = useState(getTimerState());
  const [jiggling, setJiggling] = useState(false);

  const triggerJiggle = useCallback(
    (milestone: string) => {
      if (jiggled.includes(milestone)) return;
      impactAsync(ImpactFeedbackStyle.Heavy).catch(console.log);
      setJiggling(true);
      setTimeout(() => setJiggling(false), 10);
      setJiggled((j) => [...j, milestone]);
    },
    [jiggled, setJiggled],
  );

  useEffect(() => {
    const timer = setInterval(() => {
      const state = getTimerState();
      setTimerState(state);
      if (state.phase === 'over') triggerJiggle('over');
    }, 200);
    return () => clearInterval(timer);
  }, [getTimerState, triggerJiggle]);

  const { phase } = timerState;
  const alarmRinging = !!onSilence && !paused && phase !== 'resting' && silencedPhase !== phase;
  const accent = phaseColor[phase];

  const status = paused
    ? t('rest_timer.status.paused')
    : phase === 'resting'
      ? t('rest_timer.status.resting')
      : t('rest_timer.status.over');

  const segments: TimerSegment[] = [{ flex: 1, progress: timerState.restProgress, color: phaseColor[phase] }];

  return (
    <TimerPane
      testID="rest-timer"
      time={timerState.remaining}
      status={status}
      accent={accent}
      segments={segments}
      jiggling={jiggling}
      style={style}
      controls={
        <RestTimerControls
          paused={paused}
          onRestart={() => {
            onRestart();
            triggerJiggle('reset');
          }}
          onTogglePause={onTogglePause}
          onDismiss={onDismiss}
          onSilence={
            alarmRinging
              ? () => {
                  onSilence?.();
                  setSilencedPhase(phase);
                }
              : undefined
          }
        />
      }
    />
  );
}
