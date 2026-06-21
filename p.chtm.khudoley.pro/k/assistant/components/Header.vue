<template>
  <LogoutModal
    :visible="showLogoutModal"
    @confirm="confirmLogout"
    @cancel="cancelLogout"
  />
  <header class="header" :class="{ 'header-hidden': showLogoutModal }">
    <div class="container mx-auto px-4 max-w-6xl header-content">
      <div class="header-title-section">
        <a :href="props.indexUrl" class="header-logo-and-title">
          <div class="header-logo-link">
            <img 
              src="https://fs-thb03.getcourse.ru/fileservice/file/thumbnail/h/246c9167ba22ef571b50a2a795ee1186.png/s/300x/a/565681/sc/95" 
              alt="Логотип" 
              class="header-logo"
            />
          </div>
          <h1 class="header-title">{{ projectTitle }}</h1>
        </a>
      </div>
      <div class="header-right">
        <div class="header-clock-tools">
          <span
            ref="clockTriggerRef"
            class="header-clock"
            :class="{
              'header-clock--interactive': headerFocusToolsUi && widgetMode !== 'clock',
              'header-clock--attention': clockNeedsAttention
            }"
            @click="onClockClick"
          >
            <span
              class="header-clock-progress"
              :style="{ width: `${Math.round(headerClockProgressFill * 10000) / 100}%` }"
              aria-hidden="true"
            />
            <span class="header-clock-row">
              <i :class="clockIconClass"></i>
              <span class="clock-time">{{ headerClockDisplay }}</span>
              <template v-if="headerFocusToolsUi && widgetMode !== 'clock'">
                <button
                  type="button"
                  class="header-tool-btn"
                  :disabled="focusToolsControlsDisabled"
                  @click.stop="handleToolStartPause"
                >
                  {{ startPauseLabel }}
                </button>
                <button
                  type="button"
                  class="header-tool-btn header-tool-btn--danger"
                  :disabled="focusToolsControlsDisabled"
                  @click.stop="handleToolReset"
                >
                  Сброс
                </button>
              </template>
            </span>
          </span>
          <div v-if="headerFocusToolsUi && showToolPicker" ref="toolPickerRef" class="header-tool-picker" role="group" aria-label="Выбор инструмента">
            <button
              type="button"
              class="header-tool-picker-btn"
              :class="{ 'header-tool-picker-btn--active': widgetMode === 'clock' }"
              :aria-pressed="widgetMode === 'clock'"
              title="Показать часы"
              :disabled="focusToolsControlsDisabled"
              @click="selectWidgetMode('clock')"
            >
              <i class="fas fa-clock" aria-hidden="true"></i>
              <span>Часы</span>
            </button>
            <button
              type="button"
              class="header-tool-picker-btn"
              :class="{ 'header-tool-picker-btn--active': widgetMode === 'pomodoro' }"
              :aria-pressed="widgetMode === 'pomodoro'"
              title="Показать помидор"
              :disabled="focusToolsControlsDisabled"
              @click="selectWidgetMode('pomodoro')"
            >
              <i class="fas fa-hourglass-half" aria-hidden="true"></i>
              <span>Помидор</span>
            </button>
            <button
              type="button"
              class="header-tool-picker-btn"
              :class="{ 'header-tool-picker-btn--active': widgetMode === 'timer' }"
              :aria-pressed="widgetMode === 'timer'"
              title="Показать таймер"
              :disabled="focusToolsControlsDisabled"
              @click="selectWidgetMode('timer')"
            >
              <i class="fas fa-stopwatch-20" aria-hidden="true"></i>
              <span>Таймер</span>
            </button>
            <button
              type="button"
              class="header-tool-picker-btn"
              :class="{ 'header-tool-picker-btn--active': widgetMode === 'stopwatch' }"
              :aria-pressed="widgetMode === 'stopwatch'"
              title="Показать секундомер"
              :disabled="focusToolsControlsDisabled"
              @click="selectWidgetMode('stopwatch')"
            >
              <i class="fas fa-stopwatch" aria-hidden="true"></i>
              <span>Секундомер</span>
            </button>
          </div>
        </div>
        <div class="header-actions">
        <a 
          v-if="props.isAdmin && props.adminUrl"
          :href="props.adminUrl" 
          class="header-action-btn"
          title="Настройки админа"
        >
          <i class="fas fa-cog"></i>
        </a>
        <a 
          v-if="props.testsUrl"
          :href="props.testsUrl" 
          class="header-action-btn"
          title="Тесты"
        >
          <i class="fas fa-flask"></i>
        </a>
        <button 
          @click="triggerGlitch"
          class="header-action-btn"
        >
          <i class="fas fa-window-minimize"></i>
        </button>
        <a 
          v-if="props.isAuthenticated"
          :href="props.profileUrl" 
          class="header-action-btn"
          title="Профиль пользователя"
        >
          <i class="fas fa-window-maximize"></i>
        </a>
        <a 
          v-else
          :href="props.loginUrl" 
          class="header-action-btn"
          title="Войти в систему"
        >
          <i class="fas fa-window-maximize"></i>
        </a>
        <button 
          @click="handleCloseClick"
          class="header-action-btn"
          title="Закрыть"
        >
          <i class="fas fa-times"></i>
        </button>
      </div>
      </div>
    </div>
  </header>
</template>

<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted, watch, withDefaults } from 'vue'
import LogoutModal from './LogoutModal.vue'
import { createComponentLogger } from '../shared/logger'
import { formatPomodoroSecondsDisplay, type PomodoroPhase, type PomodoroStateDto } from '../lib/pomodoro-types'
import { computePomodoroStatsDayKeyForUtcOffsetHours } from '../lib/pomodoro-stats-day'
import { DEFAULT_USER_TIMEZONE_OFFSET_HOURS } from '../shared/user-settings-defaults'
import type { FocusToolsStateData, HeaderWidgetMode } from '../shared/focus-tools-types'
import { createFocusDeadlineAlarms, type FocusDeadlineAlarmsHandle } from '../lib/focus-deadline-alarms'
import { getOrCreateBrowserSocketClient } from '@app/socket'

const log = createComponentLogger('Header')
type LocalClockStatus = 'stopped' | 'running' | 'paused'

const props = withDefaults(
  defineProps<{
    projectTitle: string
    pageName?: string
    indexUrl: string
    profileUrl: string
    loginUrl: string
    isAuthenticated: boolean
    isAdmin?: boolean
    adminUrl?: string
    testsUrl?: string
    /** Смещение UTC из профиля — граница суток статистики focus-tools (полночь). */
    timezoneOffsetHours?: number
    enableToolClockWidget?: boolean
    toolsStateUrl?: string
    toolsControlUrl?: string
    encodedFocusToolsSocketId?: string
  }>(),
  { timezoneOffsetHours: DEFAULT_USER_TIMEZONE_OFFSET_HOURS },
)

const isGlitching = ref(false)
const showLogoutModal = ref(false)
const currentTime = ref('')
const pomodoroStatus = ref<'stopped' | 'running' | 'paused' | 'awaiting_continue'>('stopped')
const pomodoroEndsAtMs = ref(0)
const pomodoroRemainingSec = ref(0)
const pomodoroPhase = ref<PomodoroPhase>('work')
const pomodoroWorkMinutes = ref(25)
const pomodoroRestMinutes = ref(5)
const pomodoroLongRestMinutes = ref(20)
const nowTick = ref(Date.now())
const widgetMode = ref<HeaderWidgetMode>('clock')
const showToolPicker = ref(false)
const clockActionPending = ref(false)
const timerStatus = ref<LocalClockStatus>('stopped')
const timerRemainingSec = ref(0)
const timerEndsAtMs = ref(0)
const timerDurationSettingMin = ref(25)
const timerDurationSettingSec = ref(0)
const stopwatchStatus = ref<LocalClockStatus>('stopped')
const stopwatchElapsedSec = ref(0)
const stopwatchStartedAtMs = ref(0)
const clockNeedsAttention = ref(false)
const focusToolsWsConnected = ref(false)
const pomodoroDisplaySec = computed(() => {
  if (pomodoroStatus.value === 'running') {
    return Math.max(0, Math.floor((pomodoroEndsAtMs.value - nowTick.value) / 1000))
  }
  if (pomodoroStatus.value === 'awaiting_continue') {
    return Math.max(0, Math.floor((nowTick.value - pomodoroEndsAtMs.value) / 1000))
  }
  return Math.max(0, pomodoroRemainingSec.value)
})
const pomodoroDisplay = computed(() => {
  const sec = pomodoroDisplaySec.value
  const s = formatPomodoroSecondsDisplay(sec)
  if (pomodoroStatus.value === 'awaiting_continue') return `+${s}`
  return s
})
const timerDisplaySec = computed(() => {
  if (timerStatus.value === 'running') {
    return Math.max(0, Math.floor((timerEndsAtMs.value - nowTick.value) / 1000))
  }
  return Math.max(0, timerRemainingSec.value)
})
const stopwatchDisplaySec = computed(() => {
  if (stopwatchStatus.value === 'running') {
    return Math.max(0, stopwatchElapsedSec.value + Math.floor((nowTick.value - stopwatchStartedAtMs.value) / 1000))
  }
  return Math.max(0, stopwatchElapsedSec.value)
})
const headerClockDisplay = computed(() => {
  if (widgetMode.value === 'clock') return currentTime.value
  if (widgetMode.value === 'pomodoro') return pomodoroDisplay.value
  if (widgetMode.value === 'timer') return formatPomodoroSecondsDisplay(timerDisplaySec.value)
  return formatPomodoroSecondsDisplay(stopwatchDisplaySec.value)
})

function pomodoroPhaseDurationSec(phase: PomodoroPhase, wm: number, rm: number, lrm: number): number {
  if (phase === 'work') return Math.max(1, wm * 60)
  if (phase === 'rest') return Math.max(1, rm * 60)
  return Math.max(1, lrm * 60)
}

function applyPomodoroStateDto(state: PomodoroStateDto): void {
  pomodoroStatus.value = state.status
  pomodoroEndsAtMs.value = state.phaseEndsAtMs
  pomodoroRemainingSec.value = state.phaseRemainingSec
  pomodoroPhase.value = state.phase
  pomodoroWorkMinutes.value = state.workMinutes
  pomodoroRestMinutes.value = state.restMinutes
  pomodoroLongRestMinutes.value = state.longRestMinutes
}

function timerDurationTotalSecFromSettings(): number {
  return Math.max(1, timerDurationSettingMin.value * 60 + timerDurationSettingSec.value)
}

/** Доля заполнения слева направо (0–1) для помидора и таймера в шапке */
const headerClockProgressFill = computed(() => {
  if (!isToolClockWidgetEnabled.value) return 0
  if (widgetMode.value === 'pomodoro') {
    if (pomodoroStatus.value === 'stopped') return 0
    if (pomodoroStatus.value === 'awaiting_continue') return 1
    const total = pomodoroPhaseDurationSec(
      pomodoroPhase.value,
      pomodoroWorkMinutes.value,
      pomodoroRestMinutes.value,
      pomodoroLongRestMinutes.value
    )
    const rem = pomodoroDisplaySec.value
    return Math.min(1, Math.max(0, 1 - rem / total))
  }
  if (widgetMode.value === 'timer') {
    if (timerStatus.value === 'stopped') return 0
    const total = timerDurationTotalSecFromSettings()
    if (total <= 0) return 0
    const rem = timerDisplaySec.value
    return Math.min(1, Math.max(0, 1 - rem / total))
  }
  return 0
})
const clockIconClass = computed(() => {
  if (widgetMode.value === 'clock') return 'fas fa-clock'
  if (widgetMode.value === 'pomodoro') return 'fas fa-hourglass-half'
  if (widgetMode.value === 'timer') return 'fas fa-stopwatch-20'
  return 'fas fa-stopwatch'
})
const startPauseLabel = computed(() => {
  if (widgetMode.value === 'pomodoro') return pomodoroStatus.value === 'running' ? 'Пауза' : 'Запуск'
  if (widgetMode.value === 'timer') return timerStatus.value === 'running' ? 'Пауза' : 'Запуск'
  if (widgetMode.value === 'stopwatch') return stopwatchStatus.value === 'running' ? 'Пауза' : 'Запуск'
  return 'Запуск'
})
const isToolClockWidgetEnabled = computed(() => !!props.enableToolClockWidget)

/** Часы Pomodoro/таймер/секундомер в шапке только для авторизованных с API */
const headerFocusToolsUi = computed(
  () =>
    isToolClockWidgetEnabled.value &&
    props.isAuthenticated &&
    !!props.toolsStateUrl &&
    !!props.toolsControlUrl,
)

const focusToolsControlsDisabled = computed(
  () => clockActionPending.value || !focusToolsWsConnected.value,
)

// Функция для форматирования времени
const updateTime = () => {
  const now = new Date()
  const hours = String(now.getHours()).padStart(2, '0')
  const minutes = String(now.getMinutes()).padStart(2, '0')
  const seconds = String(now.getSeconds()).padStart(2, '0')
  currentTime.value = `${hours}:${minutes}:${seconds}`
}

let timeInterval: number | null = null
let nowTickInterval: number | null = null
let escHandler: ((e: KeyboardEvent) => void) | null = null
let outsideToolPickerClickHandler: ((e: MouseEvent) => void) | null = null
let focusTaskEventHandler: ((e: Event) => void) | null = null
let focusToolsSocketUnsub: (() => void) | null = null
let wsRetryTimer: ReturnType<typeof setTimeout> | null = null
let wsAttempt = 0
let onlineHandler: (() => void) | null = null
let focusDeadlineAlarms: FocusDeadlineAlarmsHandle | null = null
const toolPickerRef = ref<HTMLElement | null>(null)
const clockTriggerRef = ref<HTMLElement | null>(null)

const readApiJson = async <T,>(response: Response): Promise<T> => {
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`)
  }
  const contentType = response.headers.get('content-type') ?? ''
  if (!contentType.toLowerCase().includes('application/json')) {
    throw new Error('Non-JSON response')
  }
  return response.json() as Promise<T>
}

const focusToolsStatsDayKey = computed(() =>
  computePomodoroStatsDayKeyForUtcOffsetHours(nowTick.value, props.timezoneOffsetHours),
)

function toolsStateUrlWithDay(base: string): string {
  const key = encodeURIComponent(focusToolsStatsDayKey.value)
  return base.includes('?') ? `${base}&statsDayKey=${key}` : `${base}?statsDayKey=${key}`
}

function applyFocusToolsState(snapshot: FocusToolsStateData): void {
  widgetMode.value = snapshot.activeMode
  applyPomodoroStateDto(snapshot.pomodoro)
  timerStatus.value = snapshot.timer.status
  timerRemainingSec.value = snapshot.timer.remainingSec
  timerEndsAtMs.value = snapshot.timer.endsAtMs
  timerDurationSettingMin.value = snapshot.timer.durationSettingMin
  timerDurationSettingSec.value = snapshot.timer.durationSettingSec
  stopwatchStatus.value = snapshot.stopwatch.status
  stopwatchElapsedSec.value = snapshot.stopwatch.elapsedSec
  stopwatchStartedAtMs.value = snapshot.stopwatch.startedAtMs
  focusDeadlineAlarms?.reschedule(snapshot)
}

async function syncFocusToolsFromHttp(): Promise<void> {
  if (!props.toolsStateUrl) return
  try {
    const r = await fetch(toolsStateUrlWithDay(props.toolsStateUrl), { credentials: 'include' })
    const j = await readApiJson<{ success?: boolean; state?: FocusToolsStateData }>(r)
    if (j.success && j.state) applyFocusToolsState(j.state)
  } catch (error) {
    log.warning('Focus tools GET failed', { error: String(error) })
  }
}

watch(focusToolsStatsDayKey, (next, prev) => {
  if (prev !== undefined && next !== prev && props.toolsStateUrl) {
    void syncFocusToolsFromHttp()
  }
})

type FocusToolsCommand =
  | { kind: 'pomodoro'; action: 'start' | 'resume' | 'pause' | 'stop' | 'skip' | 'reset' }
  | { kind: 'timer'; action: 'start' | 'resume' | 'pause' | 'reset' }
  | { kind: 'stopwatch'; action: 'start' | 'resume' | 'pause' | 'reset' }
  | { kind: 'widget-mode'; mode: HeaderWidgetMode }
  | { kind: 'assign-task'; taskId: string }

async function postFocusToolsCommand(
  command: FocusToolsCommand,
  options?: { allowDisconnected?: boolean },
): Promise<boolean> {
  if (!props.toolsControlUrl) return false
  if (!focusToolsWsConnected.value && !options?.allowDisconnected) return false
  try {
    const r = await fetch(props.toolsControlUrl, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        statsDayKey: focusToolsStatsDayKey.value,
        command,
      }),
    })
    const j = await readApiJson<{ success?: boolean; state?: FocusToolsStateData }>(r)
    if (j.success && j.state) {
      applyFocusToolsState(j.state)
      return true
    }
  } catch (error) {
    log.warning('Focus tools command failed', { error: String(error) })
  }
  return false
}

function clearWsRetry(): void {
  if (wsRetryTimer != null) {
    clearTimeout(wsRetryTimer)
    wsRetryTimer = null
  }
}

function scheduleFocusToolsWsRetry(): void {
  clearWsRetry()
  const delay = Math.min(30_000, 1000 * 2 ** Math.min(wsAttempt, 8))
  wsAttempt += 1
  wsRetryTimer = window.setTimeout(() => {
    wsRetryTimer = null
    void connectFocusToolsWebSocket()
  }, delay)
}

async function connectFocusToolsWebSocket(): Promise<void> {
  if (!headerFocusToolsUi.value || !props.encodedFocusToolsSocketId) {
    focusToolsWsConnected.value = false
    return
  }
  try {
    const client = await getOrCreateBrowserSocketClient()
    focusToolsSocketUnsub?.()
    const sub = client.subscribeToData(props.encodedFocusToolsSocketId)
    focusToolsSocketUnsub = () => {
      if (typeof sub.unsubscribe === 'function') sub.unsubscribe()
      focusToolsSocketUnsub = null
    }
    focusToolsWsConnected.value = true
    wsAttempt = 0
    sub.listen((msg: { type?: string; data?: { state?: FocusToolsStateData } }) => {
      if (msg?.type === 'state-update' && msg.data?.state) {
        applyFocusToolsState(msg.data.state)
      }
    })
  } catch (error) {
    log.warning('Focus tools WebSocket failed', { error: String(error) })
    focusToolsWsConnected.value = false
    scheduleFocusToolsWsRetry()
  }
}

function onClockClick(): void {
  if (!headerFocusToolsUi.value) return
  showToolPicker.value = !showToolPicker.value
}

async function selectWidgetMode(mode: HeaderWidgetMode): Promise<void> {
  if (!headerFocusToolsUi.value) return
  showToolPicker.value = false
  if (!focusToolsWsConnected.value) return
  clockActionPending.value = true
  try {
    await postFocusToolsCommand({ kind: 'widget-mode', mode })
  } finally {
    clockActionPending.value = false
  }
}

async function handleToolStartPause(): Promise<void> {
  if (clockActionPending.value || !focusToolsWsConnected.value) return
  clockActionPending.value = true
  try {
    if (widgetMode.value === 'pomodoro') {
      if (pomodoroStatus.value === 'running') await postFocusToolsCommand({ kind: 'pomodoro', action: 'pause' })
      else if (pomodoroStatus.value === 'paused' || pomodoroStatus.value === 'awaiting_continue') {
        await postFocusToolsCommand({ kind: 'pomodoro', action: 'resume' })
      } else {
        await postFocusToolsCommand({ kind: 'pomodoro', action: 'start' })
      }
      return
    }
    if (widgetMode.value === 'timer') {
      if (timerStatus.value === 'running') await postFocusToolsCommand({ kind: 'timer', action: 'pause' })
      else if (timerStatus.value === 'paused') await postFocusToolsCommand({ kind: 'timer', action: 'resume' })
      else await postFocusToolsCommand({ kind: 'timer', action: 'start' })
      return
    }
    if (widgetMode.value === 'stopwatch') {
      if (stopwatchStatus.value === 'running') await postFocusToolsCommand({ kind: 'stopwatch', action: 'pause' })
      else if (stopwatchStatus.value === 'paused') await postFocusToolsCommand({ kind: 'stopwatch', action: 'resume' })
      else await postFocusToolsCommand({ kind: 'stopwatch', action: 'start' })
    }
  } finally {
    clockActionPending.value = false
  }
}

async function handleToolReset(): Promise<void> {
  if (clockActionPending.value || !focusToolsWsConnected.value) return
  clockActionPending.value = true
  try {
    if (widgetMode.value === 'pomodoro') await postFocusToolsCommand({ kind: 'pomodoro', action: 'reset' })
    else if (widgetMode.value === 'timer') {
      const ok = await postFocusToolsCommand({ kind: 'timer', action: 'reset' })
      if (ok) window.dispatchEvent(new CustomEvent('assistant:focus-task-cleared'))
    } else if (widgetMode.value === 'stopwatch') {
      const ok = await postFocusToolsCommand({ kind: 'stopwatch', action: 'reset' })
      if (ok) window.dispatchEvent(new CustomEvent('assistant:focus-task-cleared'))
    }
  } finally {
    clockActionPending.value = false
  }
}

function blinkClockAttention(): void {
  clockNeedsAttention.value = false
  window.setTimeout(() => {
    clockNeedsAttention.value = true
    window.setTimeout(() => {
      clockNeedsAttention.value = false
    }, 900)
  }, 0)
}

async function startSelectedToolIfStopped(): Promise<void> {
  if (!focusToolsWsConnected.value) return
  if (widgetMode.value === 'pomodoro') {
    if (pomodoroStatus.value === 'running') return
    if (pomodoroStatus.value === 'paused' || pomodoroStatus.value === 'awaiting_continue') {
      await postFocusToolsCommand({ kind: 'pomodoro', action: 'resume' })
    } else {
      await postFocusToolsCommand({ kind: 'pomodoro', action: 'start' })
    }
    return
  }
  if (widgetMode.value === 'timer') {
    if (timerStatus.value === 'running') return
    if (timerStatus.value === 'paused') await postFocusToolsCommand({ kind: 'timer', action: 'resume' })
    else await postFocusToolsCommand({ kind: 'timer', action: 'start' })
    return
  }
  if (widgetMode.value === 'stopwatch') {
    if (stopwatchStatus.value === 'running') return
    if (stopwatchStatus.value === 'paused') await postFocusToolsCommand({ kind: 'stopwatch', action: 'resume' })
    else await postFocusToolsCommand({ kind: 'stopwatch', action: 'start' })
  }
}

onMounted(() => {
  log.info('Component mounted, clock started')
  updateTime()
  timeInterval = window.setInterval(updateTime, 1000)
  nowTick.value = Date.now()
  nowTickInterval = window.setInterval(() => {
    nowTick.value = Date.now()
  }, 1000)

  if (headerFocusToolsUi.value) {
    focusDeadlineAlarms = createFocusDeadlineAlarms({
      isEnabled: () => headerFocusToolsUi.value,
      onAfterAlarm: () => {
        window.dispatchEvent(new CustomEvent('assistant:focus-tools-deadline'))
        void syncFocusToolsFromHttp()
      },
    })
    if ('Notification' in window && Notification.permission === 'default') {
      void Notification.requestPermission()
    }
    void syncFocusToolsFromHttp().then(() => {
      void connectFocusToolsWebSocket()
    })
    onlineHandler = () => {
      void syncFocusToolsFromHttp()
      void connectFocusToolsWebSocket()
    }
    window.addEventListener('online', onlineHandler)
  }

  escHandler = (e: KeyboardEvent) => {
    if (e.key === 'Escape' && showToolPicker.value) {
      showToolPicker.value = false
      return
    }
    if (e.key === 'Escape' && showLogoutModal.value) {
      cancelLogout()
    }
  }

  window.addEventListener('keydown', escHandler)
  outsideToolPickerClickHandler = (e: MouseEvent) => {
    if (!showToolPicker.value) return
    const target = e.target as Node | null
    if (!target) return
    const picker = toolPickerRef.value
    const trigger = clockTriggerRef.value
    if (picker?.contains(target) || trigger?.contains(target)) return
    showToolPicker.value = false
  }
  window.addEventListener('mousedown', outsideToolPickerClickHandler)
  focusTaskEventHandler = (e: Event) => {
    const customEvent = e as CustomEvent<{
      taskId?: string
      pomodoroSessionStartedFromTasksPage?: boolean
    }>
    const taskId = customEvent.detail?.taskId
    if (!taskId || !headerFocusToolsUi.value) return
    void (async () => {
      clockActionPending.value = true
      try {
        const ok = await postFocusToolsCommand({ kind: 'assign-task', taskId }, { allowDisconnected: true })
        if (!ok) return
        if (widgetMode.value === 'clock') {
          blinkClockAttention()
          return
        }
        if (widgetMode.value === 'pomodoro' && customEvent.detail?.pomodoroSessionStartedFromTasksPage) {
          await syncFocusToolsFromHttp()
          return
        }
        await startSelectedToolIfStopped()
      } finally {
        clockActionPending.value = false
      }
    })()
  }
  window.addEventListener('assistant:focus-task-selected', focusTaskEventHandler)
})

onUnmounted(() => {
  log.info('Component unmounted')
  clearWsRetry()
  focusToolsSocketUnsub?.()
  focusToolsSocketUnsub = null
  if (timeInterval) {
    clearInterval(timeInterval)
  }
  if (nowTickInterval) clearInterval(nowTickInterval)

  if (escHandler) {
    window.removeEventListener('keydown', escHandler)
  }
  if (outsideToolPickerClickHandler) {
    window.removeEventListener('mousedown', outsideToolPickerClickHandler)
  }
  if (focusTaskEventHandler) {
    window.removeEventListener('assistant:focus-task-selected', focusTaskEventHandler)
  }
  if (onlineHandler) {
    window.removeEventListener('online', onlineHandler)
    onlineHandler = null
  }
  focusDeadlineAlarms?.dispose()
  focusDeadlineAlarms = null
})

const triggerGlitch = () => {
  if (isGlitching.value) return
  log.notice('Header glitch triggered')
  
  isGlitching.value = true
  
  // Добавляем глитч эффект ко всей странице
  const appLayout = document.querySelector('.app-layout')
  if (appLayout) {
    appLayout.classList.add('global-glitch-active')
    
    setTimeout(() => {
      appLayout.classList.remove('global-glitch-active')
      isGlitching.value = false
    }, 500)
  }
}

const handleCloseClick = () => {
  if (props.isAuthenticated) {
    log.notice('Logout modal opened')
    // Показываем модальное окно для авторизованных
    showLogoutModal.value = true
    // Скрываем весь контент страницы
    const appLayout = document.querySelector('.app-layout')
    const contentWrapper = document.querySelector('.content-wrapper')
    const footer = document.querySelector('.app-footer')
    
    if (appLayout) appLayout.classList.add('content-hidden')
    if (contentWrapper) contentWrapper.classList.add('hidden-for-modal')
    if (footer) footer.classList.add('hidden-for-modal')
  } else {
    log.debug('Close button clicked (guest), triggering glitch')
    // Глитч эффект для неавторизованных
    triggerGlitch()
  }
}

const confirmLogout = () => {
  log.critical('User confirmed logout')
  window.location.href = '/s/logout'
}

const cancelLogout = () => {
  log.info('Logout cancelled')
  showLogoutModal.value = false
  // Восстанавливаем видимость контента
  const appLayout = document.querySelector('.app-layout')
  const contentWrapper = document.querySelector('.content-wrapper')
  const footer = document.querySelector('.app-footer')
  
  if (appLayout) appLayout.classList.remove('content-hidden')
  if (contentWrapper) contentWrapper.classList.remove('hidden-for-modal')
  if (footer) footer.classList.remove('hidden-for-modal')
}
</script>

<style scoped>
.header {
  background: transparent;
  padding: 1.25rem 0;
  padding-top: calc(1.25rem + env(safe-area-inset-top, 0px));
  position: relative;
  z-index: 200;
  transition: all 0.25s ease;
}

.header-hidden {
  opacity: 0;
  pointer-events: none;
}

/* Скрытие контента при открытии модального окна */
.hidden-for-modal {
  opacity: 0 !important;
  pointer-events: none !important;
  transition: opacity 0.3s ease;
}

.content-hidden {
  transition: opacity 0.3s ease;
}

/* Terminal-style corner brackets for header */
.header::before {
  content: '';
  position: absolute;
  top: 10px;
  left: 10px;
  width: 20px;
  height: 20px;
  border-left: 2px solid rgba(211, 35, 75, 0.3);
  border-top: 2px solid rgba(211, 35, 75, 0.3);
  pointer-events: none;
}

.header::after {
  content: '';
  position: absolute;
  top: 10px;
  right: 10px;
  width: 20px;
  height: 20px;
  border-right: 2px solid rgba(211, 35, 75, 0.3);
  border-top: 2px solid rgba(211, 35, 75, 0.3);
  pointer-events: none;
}

.header-content {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
}

.header-title-section {
  display: flex;
  align-items: center;
  gap: 0;
  min-width: 0;
  position: relative;
}

.header-logo-and-title {
  display: flex;
  align-items: center;
  gap: 1rem;
  cursor: pointer;
  text-decoration: none;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 1rem;
  flex-shrink: 0;
}

/* Анимация срабатывает только при ховере на сами элементы (логотип или заголовок) */
.header-logo-and-title:has(.header-logo:hover) .header-logo,
.header-logo-and-title:has(.header-logo:hover) .header-title,
.header-logo-and-title:has(.header-title:hover) .header-logo,
.header-logo-and-title:has(.header-title:hover) .header-title {
  animation: glitch-text 0.5s cubic-bezier(0.25, 0.46, 0.45, 0.94) both;
}

/* Основная анимация глитча с RGB-разделением */
@keyframes glitch-text {
  0%, 100% {
    transform: translate(0);
    filter: none;
  }
  10% {
    transform: translate(-1.5px, 0);
    filter: drop-shadow(1px 0 0 #ff00ff) drop-shadow(-1px 0 0 #00ffff);
  }
  20% {
    transform: translate(1.5px, 0);
    filter: drop-shadow(-1px 0 0 #ff00ff) drop-shadow(1px 0 0 #00ffff);
  }
  30% {
    transform: translate(-1px, 0);
    filter: drop-shadow(1.5px 0 0 #ff00ff) drop-shadow(-1.5px 0 0 #00ffff);
  }
  40% {
    transform: translate(1px, 0);
    filter: drop-shadow(-1.5px 0 0 #ff00ff) drop-shadow(1.5px 0 0 #00ffff);
  }
  50% {
    transform: translate(-1.5px, 0);
    filter: drop-shadow(1px 0 0 #ff00ff) drop-shadow(-1px 0 0 #00ffff);
  }
  60% {
    transform: translate(1.5px, 0);
    filter: drop-shadow(-1px 0 0 #ff00ff) drop-shadow(1px 0 0 #00ffff);
  }
  70% {
    transform: translate(-1px, 0);
    filter: drop-shadow(1px 0 0 #ff00ff) drop-shadow(-1px 0 0 #00ffff);
  }
  80% {
    transform: translate(1px, 0);
    filter: drop-shadow(-1.5px 0 0 #ff00ff) drop-shadow(1.5px 0 0 #00ffff);
  }
  90% {
    transform: translate(-0.5px, 0);
    filter: drop-shadow(0.5px 0 0 #ff00ff) drop-shadow(-0.5px 0 0 #00ffff);
  }
}

.header-logo-link {
  display: flex;
  align-items: center;
  flex-shrink: 0;
  position: relative;
}

/* Легкие CRT scanlines для логотипа */
.header-logo-link::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: repeating-linear-gradient(
    0deg,
    rgba(0, 0, 0, 0.08) 0px,
    rgba(0, 0, 0, 0.08) 1px,
    transparent 1px,
    transparent 2px
  );
  pointer-events: none;
  z-index: 1;
  opacity: 0;
  transition: opacity 0.3s ease;
}

.header-logo-and-title:hover .header-logo-link::before {
  opacity: 1;
  animation: scanline-flicker-subtle 4s linear infinite;
}

@keyframes scanline-flicker-subtle {
  0%, 100% { opacity: 0.6; }
  50% { opacity: 0.4; }
}

.header-logo {
  height: 2.5rem;
  width: auto;
  object-fit: contain;
  filter: brightness(0.98) contrast(1.05) drop-shadow(0 0 3px rgba(211, 35, 75, 0.15));
  cursor: pointer;
  transition: all 0.3s ease;
  position: relative;
  z-index: 2;
}

.header-logo-and-title:hover .header-logo {
  filter: brightness(1.05) contrast(1.1) drop-shadow(0 0 6px rgba(211, 35, 75, 0.3));
  animation: logo-rgb-glitch 3s ease-in-out infinite;
}

/* Периодический тонкий RGB-глитч для логотипа */
@keyframes logo-rgb-glitch {
  0%, 85%, 100% {
    filter: brightness(1.05) contrast(1.1);
  }
  86% {
    filter: brightness(1.05) contrast(1.1) drop-shadow(1px 0 0 rgba(255, 0, 255, 0.4)) drop-shadow(-1px 0 0 rgba(0, 255, 255, 0.4));
  }
  87% {
    filter: brightness(1.05) contrast(1.1) drop-shadow(-1px 0 0 rgba(255, 0, 255, 0.4)) drop-shadow(1px 0 0 rgba(0, 255, 255, 0.4));
  }
  88% {
    filter: brightness(1.05) contrast(1.1);
  }
  91% {
    filter: brightness(1.05) contrast(1.1) drop-shadow(1px 0 0 rgba(255, 0, 255, 0.3)) drop-shadow(-1px 0 0 rgba(0, 255, 255, 0.3));
  }
  92% {
    filter: brightness(1.05) contrast(1.1);
  }
}

.header-title {
  font-size: 1.25rem;
  font-weight: 400;
  color: var(--color-text);
  margin: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  letter-spacing: 0.08em;
  text-shadow: 
    0 0 8px rgba(232, 232, 232, 0.25),
    0.5px 0 0 rgba(255, 0, 255, 0.08),
    -0.5px 0 0 rgba(0, 255, 255, 0.08);
  position: relative;
  cursor: pointer;
  transition: all 0.3s ease;
}

/* Мерцающий курсор после текста - появляется при hover на логотип ИЛИ заголовок */
.header-title::after {
  content: '▮';
  margin-left: 0.25rem;
  opacity: 0;
  color: var(--color-accent);
  text-shadow: 0 0 8px rgba(211, 35, 75, 0.5);
  transition: opacity 0.3s ease;
}

.header-logo-and-title:hover .header-title::after {
  opacity: 1;
  animation: terminal-cursor-blink 1s step-end infinite;
}

@keyframes terminal-cursor-blink {
  0%, 50% { opacity: 1; }
  51%, 100% { opacity: 0; }
}

.header-clock {
  display: flex;
  align-items: stretch;
  position: relative;
  overflow: hidden;
  font-size: 0.98rem;
  font-weight: 700;
  color: var(--color-text-secondary);
  letter-spacing: 0.1em;
  text-shadow: 0 0 4px rgba(160, 160, 160, 0.3);
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
  transition: all 0.25s ease;
  cursor: default;
  padding: 0.25rem 0.6rem 0.25rem 0.5rem;
  background: rgba(0, 0, 0, 0.3);
  border: 1px solid var(--color-border);
  border-radius: 0;
  image-rendering: pixelated;
  -webkit-font-smoothing: none;
  -moz-osx-font-smoothing: grayscale;
  box-shadow: 
    inset 0 1px 2px rgba(0, 0, 0, 0.4),
    0 0 6px rgba(160, 160, 160, 0.08);
  clip-path: polygon(
    0 2px, 2px 2px, 2px 0,
    calc(100% - 2px) 0, calc(100% - 2px) 2px, 100% 2px,
    100% calc(100% - 2px), calc(100% - 2px) calc(100% - 2px), calc(100% - 2px) 100%,
    2px 100%, 2px calc(100% - 2px), 0 calc(100% - 2px)
  );
}

.header-clock-progress {
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  z-index: 0;
  width: 0;
  pointer-events: none;
  /* Сильнее, чем --color-accent-light (часто ~10% альфа): иначе на тёмном header-clock не читается */
  background: linear-gradient(
    90deg,
    color-mix(in srgb, var(--color-accent) 72%, #140508),
    color-mix(in srgb, var(--color-accent) 48%, rgba(0, 0, 0, 0.45))
  );
  box-shadow:
    inset 0 1px 0 rgba(255, 130, 150, 0.35),
    0 0 22px color-mix(in srgb, var(--color-accent) 55%, transparent),
    inset -1px 0 0 rgba(255, 200, 210, 0.22);
  transition: width 0.95s linear;
}

.header-clock-row {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  gap: 0.4rem;
  min-width: 0;
}
.header-clock--interactive { cursor: pointer; }
.header-clock--attention {
  animation: header-clock-attention-blink 0.9s ease-in-out;
}

@keyframes header-clock-attention-blink {
  0%,
  100% {
    color: var(--color-text-secondary);
    border-color: var(--color-border);
    box-shadow:
      inset 0 1px 2px rgba(0, 0, 0, 0.4),
      0 0 6px rgba(160, 160, 160, 0.08);
  }
  10%,
  30%,
  50% {
    color: #ffd7dd;
    border-color: var(--color-accent-hover);
    box-shadow:
      inset 0 1px 2px rgba(0, 0, 0, 0.4),
      0 0 12px rgba(211, 35, 75, 0.45);
    background: rgba(90, 14, 26, 0.7);
  }
  20%,
  40%,
  60% {
    color: var(--color-text-secondary);
    border-color: var(--color-border);
    box-shadow:
      inset 0 1px 2px rgba(0, 0, 0, 0.4),
      0 0 6px rgba(160, 160, 160, 0.08);
  }
}

.header-clock-tools {
  position: relative;
}

.header-clock i {
  font-size: 0.9rem;
  opacity: 0.7;
}

.clock-time {
  font-family: 'Share Tech Mono', 'Courier New', monospace;
}

.header-tool-btn {
  border: 1px solid var(--color-border-light);
  background: var(--color-bg-tertiary);
  color: var(--color-text);
  min-height: 1.65rem;
  padding: 0 0.5rem;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  font-size: 0.88rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.header-tool-btn--danger {
  border-color: rgba(255, 107, 107, 0.35);
  color: #e8a0a0;
}

.header-tool-picker {
  position: absolute;
  top: calc(100% + 0.35rem);
  right: 0;
  z-index: 320;
  display: flex;
  flex-direction: column;
  gap: 0.16rem;
  align-items: stretch;
  width: min(11.5rem, calc(100vw - 1rem));
  border: 1px solid var(--color-border);
  background: var(--color-bg-secondary);
  padding: 0.2rem;
  box-shadow:
    inset 0 1px 1px rgba(255, 255, 255, 0.04),
    0 2px 7px rgba(0, 0, 0, 0.35);
}

.header-tool-picker-btn {
  border: 1px solid transparent;
  background: transparent;
  color: var(--color-text-secondary);
  min-height: 2rem;
  padding: 0 0.5rem;
  font-size: 0.88rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  justify-content: flex-start;
  transition: color 0.18s ease, border-color 0.18s ease, background 0.18s ease;
}

.header-tool-picker-btn i {
  font-size: 0.92rem;
  opacity: 0.8;
}

.header-tool-picker-btn:hover {
  color: var(--color-text);
  border-color: rgba(255, 255, 255, 0.12);
  background: rgba(255, 255, 255, 0.04);
}

.header-tool-picker-btn:focus-visible {
  outline: none;
  border-color: var(--color-accent);
}

.header-tool-picker-btn--active {
  color: var(--color-text);
  border-color: var(--color-accent);
  background: rgba(211, 35, 75, 0.16);
}

.header-tool-picker-btn--active i {
  opacity: 1;
}

.header-clock:hover {
  color: var(--color-text);
  border-color: var(--color-border-light);
  text-shadow: 0 0 6px rgba(232, 232, 232, 0.5);
  background: rgba(0, 0, 0, 0.4);
}

.header-clock:hover i {
  opacity: 1;
  animation: clock-icon-pulse 2s ease-in-out infinite;
}

@keyframes clock-icon-pulse {
  0%, 100% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.1);
  }
}


.header-right {
  display: flex;
  align-items: center;
  gap: 1rem;
  flex-shrink: 0;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-shrink: 0;
}

.header-action-btn {
  width: 2.25rem;
  height: 2.25rem;
  border-radius: 0;
  background: var(--color-bg-tertiary);
  border: 2px solid var(--color-border);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.06rem;
  transition: all 0.25s ease;
  color: var(--color-text);
  text-decoration: none;
  cursor: pointer;
  position: relative;
  box-shadow: 
    0 2px 4px rgba(0, 0, 0, 0.3),
    inset 0 1px 0 rgba(255, 255, 255, 0.03),
    inset 0 0 0 1px rgba(0, 0, 0, 0.2);
  overflow: hidden;
  clip-path: polygon(
    0 3px, 3px 3px, 3px 0,
    calc(100% - 3px) 0, calc(100% - 3px) 3px, 100% 3px,
    100% calc(100% - 3px), calc(100% - 3px) calc(100% - 3px), calc(100% - 3px) 100%,
    3px 100%, 3px calc(100% - 3px), 0 calc(100% - 3px)
  );
}

/* CRT scanlines для кнопок хедера */
.header-action-btn::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: repeating-linear-gradient(
    0deg,
    rgba(0, 0, 0, 0.12) 0px,
    rgba(0, 0, 0, 0.12) 1px,
    transparent 1px,
    transparent 2px
  );
  pointer-events: none;
  z-index: 0;
}

.header-action-btn::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 0;
  width: 100%;
  height: 2px;
  background: var(--color-accent);
  transform: scaleX(0);
  transform-origin: left;
  transition: transform 0.3s ease;
  z-index: 2;
}

.header-action-btn i {
  transition: all 0.25s ease;
  position: relative;
  z-index: 2;
}

.header-action-btn:hover {
  border-color: var(--color-border-light);
  transform: translateY(-2px);
  box-shadow: 
    0 4px 8px rgba(0, 0, 0, 0.4),
    0 2px 4px rgba(0, 0, 0, 0.3),
    inset 0 1px 0 rgba(255, 255, 255, 0.05);
}

.header-action-btn:hover::after {
  transform: scaleX(1);
}

.header-action-btn:hover i.fa-times {
  transform: rotate(90deg) scale(1.1);
}

.header-action-btn:hover i.fa-window-maximize {
  transform: scale(1.15);
}

.header-action-btn:hover i.fa-window-minimize {
  transform: translateY(2px) scaleY(0.7);
}

.header-action-btn:hover i.fa-cog {
  transform: rotate(90deg);
}

.header-action-btn:active {
  transform: translateY(0);
  box-shadow: 
    0 1px 2px rgba(0, 0, 0, 0.3),
    inset 0 1px 0 rgba(255, 255, 255, 0.03);
}

.header-action-btn:active i {
  transform: scale(0.95);
}

@media (max-width: 640px) {
  .header {
    padding: 1rem 0;
    padding-top: calc(1rem + env(safe-area-inset-top, 0px));
  }

  .header-title {
    font-size: 1.125rem;
  }

  .header-clock {
    font-size: 1rem;
    padding: 0.3rem 0.5rem;
    gap: 0.35rem;
  }

  .header-clock i {
    font-size: 0.9rem;
  }

  .clock-time {
    font-size: 1rem;
  }

  .header-action-btn {
    width: 2rem;
    height: 2rem;
    font-size: 1.02rem;
  }
}

@media (max-width: 480px) {
  .header-clock {
    display: none;
  }
}

@media (max-width: 380px) {
  .header-title {
    white-space: normal;
    line-height: 1.25;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
    max-width: 100%;
  }

  .header-logo-and-title {
    align-items: flex-start;
    gap: 0.65rem;
  }
}
</style>
