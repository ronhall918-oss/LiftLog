export interface RestTimerControlsProps {
  paused: boolean;
  onRestart: () => void;
  onTogglePause: () => void;
  onDismiss: () => void;
  /** Set while the rest alarm is ringing; shows a button that silences it without stopping the timer. */
  onSilence?: () => void;
}

export const restControlIconSize = 20;
