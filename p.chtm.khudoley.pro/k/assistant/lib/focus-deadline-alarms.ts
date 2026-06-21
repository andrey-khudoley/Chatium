// @shared
import type { FocusToolsStateData } from '../shared/focus-tools-types'
import { getPhaseCompletionActionForPhase, normalizePhaseChangeSoundId } from './pomodoro-types'
import { playPomodoroPhaseChangeSound } from './pomodoro-phase-sounds'

export type FocusDeadlineAlarmsHandle = {
  reschedule: (snapshot: FocusToolsStateData) => void
  dispose: () => void
}

function showDeadlineNotification(title: string): void {
  if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return
  try {
    new Notification(title, {
      icon: '/favicon.ico',
      badge: '/favicon.ico',
      tag: 'assistant-focus-deadline',
    })
  } catch {
    // ignore
  }
}

/**
 * Планирует звук и системное уведомление на wall-clock момент окончания фазы помидора (режим овертайма)
 * или таймера — чтобы срабатывало в свёрнутой вкладке, когда setInterval троттлится.
 */
export function createFocusDeadlineAlarms(options: {
  isEnabled: () => boolean
  onAfterAlarm: () => void
}): FocusDeadlineAlarmsHandle {
  let pomodoroTimer: ReturnType<typeof setTimeout> | null = null
  let timerDeadlineTimer: ReturnType<typeof setTimeout> | null = null

  function clearAll(): void {
    if (pomodoroTimer !== null) {
      clearTimeout(pomodoroTimer)
      pomodoroTimer = null
    }
    if (timerDeadlineTimer !== null) {
      clearTimeout(timerDeadlineTimer)
      timerDeadlineTimer = null
    }
  }

  function vibrateShort(): void {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate([200, 100, 200])
    }
  }

  function reschedule(snapshot: FocusToolsStateData): void {
    clearAll()
    if (!options.isEnabled()) return

    const p = snapshot.pomodoro
    if (p.status === 'running' && p.phaseEndsAtMs > 0) {
      const action = getPhaseCompletionActionForPhase(p, p.phase)
      if (action === 'overtime') {
        const delay = Math.max(0, p.phaseEndsAtMs - Date.now())
        const soundId = normalizePhaseChangeSoundId(p.phaseChangeSound)
        pomodoroTimer = window.setTimeout(() => {
          pomodoroTimer = null
          playPomodoroPhaseChangeSound(soundId)
          vibrateShort()
          showDeadlineNotification('Цикл таймера завершён')
          options.onAfterAlarm()
        }, delay)
      }
    }

    const t = snapshot.timer
    if (t.status === 'running' && t.endsAtMs > 0) {
      const delay = Math.max(0, t.endsAtMs - Date.now())
      timerDeadlineTimer = window.setTimeout(() => {
        timerDeadlineTimer = null
        playPomodoroPhaseChangeSound(3)
        vibrateShort()
        showDeadlineNotification('Таймер завершён')
        options.onAfterAlarm()
      }, delay)
    }
  }

  return {
    reschedule,
    dispose: clearAll,
  }
}
