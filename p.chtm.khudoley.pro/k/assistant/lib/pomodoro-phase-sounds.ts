// @shared
import { normalizePhaseChangeSoundId, type PomodoroPhaseChangeSoundId } from './pomodoro-types'

export const POMODORO_PHASE_CHANGE_SOUND_OPTIONS: {
  id: PomodoroPhaseChangeSoundId
  label: string
  hint: string
}[] = [
  { id: 1, label: 'Шёпот', hint: '3×2 звонка, едва слышно' },
  { id: 2, label: 'Мягкий', hint: '3×2 звонка, тихо' },
  { id: 3, label: 'Нейтральный', hint: '3×2 звонка, средне' },
  { id: 4, label: 'Яркий', hint: '3×2 звонка, заметно' },
  { id: 5, label: 'Настойчивый', hint: '3×2 звонка, громко' }
]

const CYCLES = 3

type Preset = {
  f1: number
  f2: number
  oscType: OscillatorType
  strikeSec: number
  /** пауза между 1-м и 2-м звонком в цикле */
  pairGapSec: number
  /** интервал между началами соседних циклов (три группы) */
  cycleStartGapSec: number
  peakGain: number
}

const PRESETS: Record<PomodoroPhaseChangeSoundId, Preset> = {
  1: {
    f1: 523.25,
    f2: 659.25,
    oscType: 'sine',
    strikeSec: 0.07,
    pairGapSec: 0.1,
    cycleStartGapSec: 0.38,
    peakGain: 0.05
  },
  2: {
    f1: 523.25,
    f2: 698.46,
    oscType: 'sine',
    strikeSec: 0.09,
    pairGapSec: 0.11,
    cycleStartGapSec: 0.44,
    peakGain: 0.09
  },
  3: {
    f1: 880,
    f2: 1046.5,
    oscType: 'sine',
    strikeSec: 0.11,
    pairGapSec: 0.13,
    cycleStartGapSec: 0.5,
    peakGain: 0.2
  },
  4: {
    f1: 1046.5,
    f2: 1318.51,
    oscType: 'triangle',
    strikeSec: 0.12,
    pairGapSec: 0.12,
    cycleStartGapSec: 0.48,
    peakGain: 0.27
  },
  5: {
    f1: 659.25,
    f2: 880,
    oscType: 'triangle',
    strikeSec: 0.14,
    pairGapSec: 0.13,
    cycleStartGapSec: 0.46,
    peakGain: 0.36
  }
}

/** Один контекст на страницу: после async (fetch → skip) новый AudioContext часто suspended и даёт один «дзинь»; переиспользование + resume() стабилизирует 3×2. */
let sharedAudioContext: AudioContext | null = null

function getSharedAudioContext(): AudioContext | null {
  try {
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!AC) return null
    if (sharedAudioContext && sharedAudioContext.state !== 'closed') {
      return sharedAudioContext
    }
    sharedAudioContext = new AC()
    return sharedAudioContext
  } catch {
    return null
  }
}

function connectOsc(
  ctx: AudioContext,
  frequency: number,
  type: OscillatorType,
  startTime: number,
  durationSec: number,
  peakGain: number
): void {
  const oscillator = ctx.createOscillator()
  const gainNode = ctx.createGain()
  oscillator.connect(gainNode)
  gainNode.connect(ctx.destination)
  oscillator.frequency.value = frequency
  oscillator.type = type
  const t0 = startTime
  const t1 = startTime + durationSec
  const eps = 0.001
  gainNode.gain.setValueAtTime(eps, t0)
  gainNode.gain.exponentialRampToValueAtTime(Math.max(eps, peakGain), t0 + 0.018)
  gainNode.gain.exponentialRampToValueAtTime(eps, t1)
  oscillator.start(t0)
  oscillator.stop(t1)
}

/**
 * Три цикла по два звонка (6 ударов): в каждом цикле два тона подряд, затем пауза до следующего цикла.
 */
function scheduleThreeCyclesTwoChimes(ctx: AudioContext, t0: number, preset: Preset): number {
  let lastEnd = t0
  for (let c = 0; c < CYCLES; c++) {
    const cycleT = t0 + c * preset.cycleStartGapSec
    const g1 = preset.peakGain
    const g2 = preset.peakGain * 0.93
    connectOsc(ctx, preset.f1, preset.oscType, cycleT, preset.strikeSec, g1)
    connectOsc(ctx, preset.f2, preset.oscType, cycleT + preset.pairGapSec, preset.strikeSec, g2)
    lastEnd = Math.max(lastEnd, cycleT + preset.pairGapSec + preset.strikeSec)
  }
  return lastEnd
}

/**
 * Сигнал при смене этапа таймера (Web Audio API, только в браузере).
 * После асинхронного ответа API контекст нужно явно resume(); контекст не закрываем сразу — иначе обрезается серия из 6 ударов.
 */
export function playPomodoroPhaseChangeSound(soundId: number): void {
  const id = normalizePhaseChangeSoundId(soundId)
  const preset = PRESETS[id]
  const ctx = getSharedAudioContext()
  if (!ctx) return

  const play = (): void => {
    const t0 = ctx.currentTime
    try {
      scheduleThreeCyclesTwoChimes(ctx, t0, preset)
    } catch {
      /* ignore */
    }
  }
  void ctx.resume().then(play).catch(play)
}
