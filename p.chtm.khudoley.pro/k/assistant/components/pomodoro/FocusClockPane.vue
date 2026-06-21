<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import PomodoroTimerDial from './PomodoroTimerDial.vue'
import PomodoroTaskSelectDropdown from './PomodoroTaskSelectDropdown.vue'
import { formatPomodoroSecondsDisplay as fmt } from '../../lib/pomodoro-types'
import type {
  FocusToolsFullStateDto,
  StopwatchToolSnapshot,
  TimerToolSnapshot,
} from '../../shared/focus-tools-types'

type TaskItem = {
  id: string
  title: string
  projectId: string
  projectName?: string
  clientName?: string
}

const props = defineProps<{
  mode: 'timer' | 'stopwatch'
  getTasksUrl: string
  selectedTaskId?: string
  toolsControlUrl: string
  statsDayKey: string
  timerSnapshot: TimerToolSnapshot
  stopwatchSnapshot: StopwatchToolSnapshot
  localTickMs: number
  focusToolsWsConnected: boolean
}>()

const emit = defineEmits<{
  (e: 'taskSelected', taskId: string): void
  (e: 'focus-tools-sync', payload: FocusToolsFullStateDto): void
}>()

const pageError = ref('')
const settingsOpen = ref(false)
const tasks = ref<TaskItem[]>([])
const tasksLoading = ref(false)
const clockActionPending = ref(false)

const timerMin = ref(25)
const timerSec = ref(0)

const isTimer = computed(() => props.mode === 'timer')
const modeTitle = computed(() => (props.mode === 'timer' ? 'Таймер' : 'Секундомер'))

const slice = computed(() => (isTimer.value ? props.timerSnapshot : props.stopwatchSnapshot))

const displaySec = computed(() => {
  if (isTimer.value) {
    const t = props.timerSnapshot
    if (t.status === 'running') {
      return Math.max(0, Math.floor((t.endsAtMs - props.localTickMs) / 1000))
    }
    return Math.max(0, t.remainingSec)
  }
  const s = props.stopwatchSnapshot
  if (s.status === 'running') {
    return Math.max(0, s.elapsedSec + Math.floor((props.localTickMs - s.startedAtMs) / 1000))
  }
  return Math.max(0, s.elapsedSec)
})

const dialStatus = computed<'stopped' | 'running' | 'paused' | 'awaiting_continue'>(() => slice.value.status)
const timerPhaseDurationSec = computed(() => {
  if (!isTimer.value) return 3600
  return Math.max(1, props.timerSnapshot.durationSettingMin * 60 + props.timerSnapshot.durationSettingSec)
})
const stopwatchDialRemainingSec = computed(() => 3600)
const stopwatchDialPhaseDurationSec = computed(() => 3600)
const statusLabel = computed(() =>
  slice.value.status === 'running' ? 'Идёт' : slice.value.status === 'paused' ? 'Пауза' : 'Остановлен',
)

const controlsDisabled = computed(() => !props.focusToolsWsConnected || clockActionPending.value)

watch(
  () => [props.timerSnapshot.durationSettingMin, props.timerSnapshot.durationSettingSec] as const,
  ([m, s]) => {
    timerMin.value = m
    timerSec.value = s
  },
  { immediate: true },
)

const selectedTaskId = ref('')

watch(
  () => slice.value.currentTaskId,
  (id) => {
    if (typeof id === 'string') selectedTaskId.value = id
  },
  { immediate: true },
)

watch(
  () => props.selectedTaskId,
  (id) => {
    if (typeof id === 'string') selectedTaskId.value = id
  },
  { immediate: true },
)

async function readApiJson<T>(response: Response): Promise<T> {
  if (!response.ok) throw new Error(`HTTP ${response.status}`)
  const contentType = response.headers.get('content-type') ?? ''
  if (!contentType.toLowerCase().includes('application/json')) throw new Error('Сервер вернул не-JSON ответ')
  return response.json() as Promise<T>
}

async function loadTasks(): Promise<void> {
  tasksLoading.value = true
  try {
    const response = await fetch(props.getTasksUrl, { credentials: 'include' })
    const json = await readApiJson<{ success?: boolean; tasks?: TaskItem[] }>(response)
    if (json.success && Array.isArray(json.tasks)) tasks.value = json.tasks
  } catch (error) {
    pageError.value = String(error)
  } finally {
    tasksLoading.value = false
  }
}

void loadTasks()

function onTaskSelected(taskId: string): void {
  selectedTaskId.value = taskId
  emit('taskSelected', taskId)
}

async function postControl(
  command:
    | { kind: 'timer'; action: 'start' | 'resume' | 'pause' | 'reset' }
    | { kind: 'stopwatch'; action: 'start' | 'resume' | 'pause' | 'reset' },
): Promise<void> {
  if (!props.focusToolsWsConnected) return
  clockActionPending.value = true
  pageError.value = ''
  try {
    const r = await fetch(props.toolsControlUrl, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        statsDayKey: props.statsDayKey,
        command,
      }),
    })
    const j = await readApiJson<{ success?: boolean; state?: FocusToolsFullStateDto['state']; serverNowMs?: number; error?: string }>(
      r,
    )
    if (j.success && j.state != null && typeof j.serverNowMs === 'number') {
      emit('focus-tools-sync', { state: j.state, serverNowMs: j.serverNowMs })
      if (command.kind === 'timer' && command.action === 'reset') {
        window.dispatchEvent(new CustomEvent('assistant:focus-task-cleared'))
      }
      if (command.kind === 'stopwatch' && command.action === 'reset') {
        window.dispatchEvent(new CustomEvent('assistant:focus-task-cleared'))
      }
      return
    }
    pageError.value = j.error ?? 'Не удалось выполнить команду'
  } catch (error) {
    pageError.value = error instanceof Error ? error.message : String(error)
  } finally {
    clockActionPending.value = false
  }
}

async function saveTimerSettings(): Promise<void> {
  if (!props.focusToolsWsConnected) return
  const m = Math.max(0, Math.min(999, Math.floor(timerMin.value || 0)))
  const s = Math.max(0, Math.min(59, Math.floor(timerSec.value || 0)))
  timerMin.value = m
  timerSec.value = s
  clockActionPending.value = true
  pageError.value = ''
  try {
    const r = await fetch(props.toolsControlUrl, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        statsDayKey: props.statsDayKey,
        command: { kind: 'timer-settings', minutes: m, seconds: s },
      }),
    })
    const j = await readApiJson<{ success?: boolean; state?: FocusToolsFullStateDto['state']; serverNowMs?: number; error?: string }>(
      r,
    )
    if (j.success && j.state != null && typeof j.serverNowMs === 'number') {
      emit('focus-tools-sync', { state: j.state, serverNowMs: j.serverNowMs })
      settingsOpen.value = false
      return
    }
    pageError.value = j.error ?? 'Не удалось сохранить настройки таймера'
  } catch (error) {
    pageError.value = error instanceof Error ? error.message : String(error)
  } finally {
    clockActionPending.value = false
  }
}

function startClock(): void {
  void postControl(isTimer.value ? { kind: 'timer', action: 'start' } : { kind: 'stopwatch', action: 'start' })
}

function pauseClock(): void {
  void postControl(isTimer.value ? { kind: 'timer', action: 'pause' } : { kind: 'stopwatch', action: 'pause' })
}

function resumeClock(): void {
  void postControl(isTimer.value ? { kind: 'timer', action: 'resume' } : { kind: 'stopwatch', action: 'resume' })
}

function resetClock(): void {
  void postControl(isTimer.value ? { kind: 'timer', action: 'reset' } : { kind: 'stopwatch', action: 'reset' })
}

watch(
  () => props.mode,
  () => {
    pageError.value = ''
    void loadTasks()
  },
)
</script>

<template>
  <div class="focus-clock-shell">
    <p v-if="pageError" class="pomodoro-tool-error"><i class="fa-solid fa-triangle-exclamation" /> {{ pageError }}</p>
    <p v-if="!focusToolsWsConnected" class="pomodoro-tool-error pomodoro-tool-error--muted">
      <i class="fa-solid fa-plug-circle-xmark" /> Нет WebSocket — управление недоступно. Ожидаем подключение…
    </p>

    <div class="pomodoro-phase-bar">
      <span class="phase-indicator"><span class="phase-dot"></span>{{ modeTitle }}</span>
      <span class="cycle-dots" aria-hidden="true">
        <span v-for="i in 4" :key="i" class="cycle-dot"></span>
      </span>
      <button v-if="isTimer" type="button" class="settings-trigger" :disabled="controlsDisabled" @click="settingsOpen = true">
        <i class="fa-solid fa-sliders" />
      </button>
      <span v-else class="settings-trigger settings-trigger--placeholder" aria-hidden="true"></span>
    </div>

    <PomodoroTimerDial
      v-if="isTimer"
      phase="work"
      :remaining-sec="displaySec"
      :overtime-sec="0"
      :phase-duration-sec="timerPhaseDurationSec"
      :status="dialStatus"
      phase-label="Работа"
      :status-label="statusLabel"
      :time-label="fmt(displaySec)"
    />
    <div v-else class="stopwatch-dial-shell">
      <PomodoroTimerDial
        phase="work"
        :remaining-sec="stopwatchDialRemainingSec"
        :overtime-sec="0"
        :phase-duration-sec="stopwatchDialPhaseDurationSec"
        :status="dialStatus"
        phase-label="Секундомер"
        :status-label="statusLabel"
        :time-label="fmt(displaySec)"
      />
    </div>

    <PomodoroTaskSelectDropdown
      :tasks="tasks"
      :selected-task-id="selectedTaskId"
      :loading="tasksLoading"
      @select="onTaskSelected"
    />

    <div class="pomodoro-actions">
      <div class="pomodoro-actions__panel" :class="slice.status === 'stopped' ? 'pomodoro-actions__panel--n1' : 'pomodoro-actions__panel--n2'">
        <button
          v-if="slice.status === 'stopped'"
          type="button"
          class="pomo-btn pomo-btn--primary"
          :disabled="controlsDisabled"
          @click="startClock"
        >
          <i class="fa-solid fa-play pomo-btn__icon" aria-hidden="true" />
          <span class="pomo-btn__label">Старт</span>
        </button>
        <template v-else-if="slice.status === 'running'">
          <button type="button" class="pomo-btn pomo-btn--secondary" :disabled="controlsDisabled" @click="pauseClock">
            <i class="fa-solid fa-pause pomo-btn__icon" aria-hidden="true" />
            <span class="pomo-btn__label">Пауза</span>
          </button>
          <button type="button" class="pomo-btn pomo-btn--danger" :disabled="controlsDisabled" @click="resetClock">
            <i class="fa-solid fa-rotate-left pomo-btn__icon" aria-hidden="true" />
            <span class="pomo-btn__label">Сброс</span>
          </button>
        </template>
        <template v-else>
          <button type="button" class="pomo-btn pomo-btn--primary" :disabled="controlsDisabled" @click="resumeClock">
            <i class="fa-solid fa-play pomo-btn__icon" aria-hidden="true" />
            <span class="pomo-btn__label">Продолжить</span>
          </button>
          <button type="button" class="pomo-btn pomo-btn--danger" :disabled="controlsDisabled" @click="resetClock">
            <i class="fa-solid fa-rotate-left pomo-btn__icon" aria-hidden="true" />
            <span class="pomo-btn__label">Сброс</span>
          </button>
        </template>
      </div>
    </div>
  </div>

  <div v-if="settingsOpen && isTimer" class="clock-settings-backdrop" @click.self="settingsOpen = false">
    <div class="clock-settings-modal">
      <h3 class="clock-settings-title">Настройки / {{ modeTitle }}</h3>
      <div class="clock-settings-row clock-settings-grid">
        <label
          >Минуты<input v-model.number="timerMin" type="number" min="0" max="999" :disabled="slice.status !== 'stopped' || controlsDisabled"
        /></label>
        <label
          >Секунды<input v-model.number="timerSec" type="number" min="0" max="59" :disabled="slice.status !== 'stopped' || controlsDisabled"
        /></label>
      </div>
      <p class="clock-settings-hint">Длительность и сессии хранятся на сервере; сегменты пишутся в журнал при старте/паузе/сбросе.</p>
      <div class="clock-settings-actions">
        <button type="button" class="pomo-btn" @click="settingsOpen = false">Закрыть</button>
        <button type="button" class="pomo-btn pomo-btn--primary" :disabled="controlsDisabled || slice.status !== 'stopped'" @click="saveTimerSettings">
          Сохранить
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.focus-clock-shell {
  width: 100%;
  max-width: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}
.stopwatch-dial-shell :deep(.dial-progress) {
  stroke-dashoffset: 565.4866776461628 !important;
  opacity: 0.45;
  filter: none;
}
.pomodoro-tool-error--muted {
  opacity: 0.85;
  font-size: 0.75rem;
}
.settings-trigger--placeholder {
  visibility: hidden;
  pointer-events: none;
}
.clock-settings-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.65);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 300000;
  padding: 1rem;
}
.clock-settings-modal {
  width: min(30rem, 100%);
  background: var(--color-bg-secondary);
  border: 1px solid var(--color-border-light);
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.8rem;
}
.clock-settings-title {
  margin: 0;
  font-size: 0.82rem;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--color-text);
}
.clock-settings-row {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}
.clock-settings-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.5rem;
}
.clock-settings-grid label {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
  font-size: 0.68rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--color-text-secondary);
}
.clock-settings-grid input {
  border: 1px solid var(--color-border);
  background: var(--color-bg-tertiary);
  color: var(--color-text);
  padding: 0.45rem 0.5rem;
  font-family: inherit;
}
.clock-settings-hint {
  margin: 0;
  font-size: 0.74rem;
  color: var(--color-text-secondary);
  line-height: 1.45;
}
.clock-settings-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
}
</style>
