<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { computeJournalDayKeyLocal } from '../../lib/journal-day-key'
import { getWeekMondayKeyForDateKey } from '../../lib/journal-week-key'

type CompletedTaskDto = {
  id: string
  title: string
  projectName: string
  clientName: string
  dayKey: string
}

type MonthDataResponse = {
  success: boolean
  completedTasks?: CompletedTaskDto[]
  focusByDay?: Record<string, number>
  error?: string
}

type DaySegmentState = { value: string; locked: boolean }
type JournalDayEntryDto = {
  dayKey: string
  night: DaySegmentState
  morning: DaySegmentState
  day: DaySegmentState
  evening: DaySegmentState
}

type WeekDayDto = { dayId: string; dayKey: string; value: string; locked: boolean }
type WeekEntryDto = {
  mondayKey: string
  weekNumber: number
  summary: { value: string; locked: boolean }
  days: WeekDayDto[]
}

type CalendarCell = {
  day: number
  isCurrentMonth: boolean
  dayKey: string
  isToday: boolean
}

type DaySegmentId = 'night' | 'morning' | 'day' | 'evening'

const props = defineProps<{
  isAuthenticated: boolean
  journalMonthDataUrl: string
  journalDayGetUrl: string
  journalDaySaveUrl: string
  journalWeekGetUrl: string
  journalWeekSaveUrl: string
}>()

const MONTH_NAMES = [
  'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
  'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'
]

const MONTH_NAMES_GEN = [
  'января', 'февраля', 'марта', 'апреля', 'мая', 'июня',
  'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'
]

const DAY_NAMES_SHORT = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс']

const DAY_NAMES_FULL: Record<number, string> = {
  0: 'Воскресенье', 1: 'Понедельник', 2: 'Вторник',
  3: 'Среда', 4: 'Четверг', 5: 'Пятница', 6: 'Суббота'
}

const SEGMENT_LABELS: Record<DaySegmentId, string> = {
  night: 'Ночь', morning: 'Утро', day: 'День', evening: 'Вечер'
}

const SEGMENT_ORDER: DaySegmentId[] = ['night', 'morning', 'day', 'evening']

const mode = ref<'calendar' | 'day'>('calendar')
const currentYear = ref(new Date().getFullYear())
const currentMonth = ref(new Date().getMonth() + 1)
const selectedDayKey = ref('')

const loading = ref(false)
const loadingSwitch = ref(false)
const loadingDay = ref(false)
const globalError = ref('')

const completedTasks = ref<CompletedTaskDto[]>([])
const focusByDay = ref<Record<string, number>>({})

const dayEntry = ref<JournalDayEntryDto | null>(null)
const dayWeekPlan = ref('')
const dayWeekLocked = ref(false)
const savingWeekPlan = ref(false)
const savingDaySegment = ref<DaySegmentId | null>(null)

const showFocusStub = ref(false)

const todayKey = computed(() => computeJournalDayKeyLocal(Date.now()))

const isCurrentMonth = computed(() => {
  const now = new Date()
  return currentYear.value === now.getFullYear() && currentMonth.value === now.getMonth() + 1
})

const calendarCells = computed((): CalendarCell[] => {
  const year = currentYear.value
  const month = currentMonth.value
  const daysInMonth = new Date(year, month, 0).getDate()

  let startDow = new Date(year, month - 1, 1).getDay()
  startDow = startDow === 0 ? 6 : startDow - 1

  const cells: CalendarCell[] = []
  const today = todayKey.value

  const prevMonthLastDay = new Date(year, month - 1, 0).getDate()
  for (let i = startDow - 1; i >= 0; i--) {
    cells.push({ day: prevMonthLastDay - i, isCurrentMonth: false, dayKey: '', isToday: false })
  }

  for (let d = 1; d <= daysInMonth; d++) {
    const dayKey = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`
    cells.push({ day: d, isCurrentMonth: true, dayKey, isToday: dayKey === today })
  }

  const remainder = cells.length % 7
  if (remainder > 0) {
    for (let d = 1; d <= 7 - remainder; d++) {
      cells.push({ day: d, isCurrentMonth: false, dayKey: '', isToday: false })
    }
  }

  return cells
})

const tasksCountByDay = computed(() => {
  const map: Record<string, number> = {}
  for (const t of completedTasks.value) {
    map[t.dayKey] = (map[t.dayKey] ?? 0) + 1
  }
  return map
})

/** Всего завершённых задач в загруженном месяце (ответ API уже по year/month). */
const monthCompletedTasksTotal = computed(() => completedTasks.value.length)

/** Суммарное время фокуса (сек) за месяц по всем дням из focusByDay. */
const monthFocusTotalSec = computed(() => {
  let s = 0
  for (const v of Object.values(focusByDay.value)) {
    if (typeof v === 'number' && v > 0) s += v
  }
  return s
})

const selectedDayTasks = computed(() =>
  selectedDayKey.value ? completedTasks.value.filter((t) => t.dayKey === selectedDayKey.value) : []
)

const selectedDayFocusSec = computed(() => focusByDay.value[selectedDayKey.value] ?? 0)

const selectedDayFormatted = computed(() => {
  if (!selectedDayKey.value) return ''
  const d = new Date(selectedDayKey.value + 'T12:00:00')
  return `${d.getDate()} ${MONTH_NAMES_GEN[d.getMonth()]} ${d.getFullYear()}, ${DAY_NAMES_FULL[d.getDay()]}`
})

const daySegments = computed(() => {
  if (!dayEntry.value) return []
  const entry = dayEntry.value
  return SEGMENT_ORDER.map((id) => ({
    id,
    label: SEGMENT_LABELS[id],
    state: entry[id]
  }))
})

function formatFocusTime(sec: number): string {
  if (sec <= 0) return '0 мин'
  const hours = Math.floor(sec / 3600)
  const minutes = Math.floor((sec % 3600) / 60)
  if (hours === 0) return `${minutes} мин`
  if (minutes === 0) return `${hours} ч`
  return `${hours} ч ${minutes} мин`
}

/** Короткая подпись для ячейки календаря (минимум места, табличные цифры). */
function formatFocusTimeCompact(sec: number): string {
  if (sec <= 0) return ''
  const hours = Math.floor(sec / 3600)
  const minutes = Math.floor((sec % 3600) / 60)
  if (hours === 0) return `${minutes}м`
  if (minutes === 0) return `${hours}ч`
  return `${hours}ч${minutes}м`
}

const monthFocusLegendCompact = computed(() => {
  const sec = monthFocusTotalSec.value
  if (sec <= 0) return '0м'
  return formatFocusTimeCompact(sec)
})

async function fetchMonthData(isSwitch: boolean) {
  if (!props.isAuthenticated || !props.journalMonthDataUrl) return
  if (isSwitch) loadingSwitch.value = true
  else loading.value = true
  globalError.value = ''
  try {
    const url = new URL(props.journalMonthDataUrl, window.location.origin)
    url.searchParams.set('year', String(currentYear.value))
    url.searchParams.set('month', String(currentMonth.value))
    const r = await fetch(url.pathname + url.search, { credentials: 'include' })
    const j = (await r.json()) as MonthDataResponse
    if (!j.success) {
      globalError.value = j.error ?? 'Не удалось загрузить данные месяца'
      return
    }
    completedTasks.value = j.completedTasks ?? []
    focusByDay.value = j.focusByDay ?? {}
  } catch (e) {
    globalError.value = String(e)
  } finally {
    loading.value = false
    loadingSwitch.value = false
  }
}

async function fetchDayDetails(dayKey: string) {
  loadingDay.value = true
  dayEntry.value = null
  dayWeekPlan.value = ''
  dayWeekLocked.value = false

  try {
    const dayPromise = props.journalDayGetUrl
      ? fetch(
          (() => {
            const u = new URL(props.journalDayGetUrl, window.location.origin)
            u.searchParams.set('dayKey', dayKey)
            return u.pathname + u.search
          })(),
          { credentials: 'include' }
        ).then((r) => r.json() as Promise<{ success?: boolean; entry?: JournalDayEntryDto }>)
      : Promise.resolve(null)

    const mondayKey = getWeekMondayKeyForDateKey(dayKey)
    const weekPromise =
      props.journalWeekGetUrl && mondayKey
        ? fetch(
            (() => {
              const u = new URL(props.journalWeekGetUrl, window.location.origin)
              u.searchParams.set('mondayKey', mondayKey)
              return u.pathname + u.search
            })(),
            { credentials: 'include' }
          ).then((r) => r.json() as Promise<{ success?: boolean; week?: WeekEntryDto }>)
        : Promise.resolve(null)

    const [dayResult, weekResult] = await Promise.all([dayPromise, weekPromise])

    if (dayResult?.success && dayResult.entry) {
      dayEntry.value = dayResult.entry
    }
    if (weekResult?.success && weekResult.week) {
      const dayPlan = weekResult.week.days.find((d) => d.dayKey === dayKey)
      dayWeekPlan.value = dayPlan?.value ?? ''
      dayWeekLocked.value = dayPlan?.locked ?? false
    }
  } catch (e) {
    globalError.value = String(e)
  } finally {
    loadingDay.value = false
  }
}

async function saveWeekPlan() {
  if (!selectedDayKey.value || !props.journalWeekSaveUrl) return
  savingWeekPlan.value = true
  globalError.value = ''
  try {
    const r = await fetch(props.journalWeekSaveUrl, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        dayKey: selectedDayKey.value,
        value: dayWeekPlan.value,
        locked: dayWeekLocked.value
      })
    })
    const j = (await r.json()) as { success?: boolean; week?: WeekEntryDto; error?: string }
    if (!j.success || !j.week) {
      globalError.value = j.error ?? 'Не удалось сохранить план дня'
      return
    }
    const dayPlan = j.week.days.find((d) => d.dayKey === selectedDayKey.value)
    dayWeekPlan.value = dayPlan?.value ?? ''
    dayWeekLocked.value = dayPlan?.locked ?? false
  } catch (e) {
    globalError.value = String(e)
  } finally {
    savingWeekPlan.value = false
  }
}

function onToggleWeekPlanLock() {
  dayWeekLocked.value = !dayWeekLocked.value
  void saveWeekPlan()
}

async function saveDaySegment(segmentId: DaySegmentId) {
  if (!dayEntry.value || !props.journalDaySaveUrl || !selectedDayKey.value) return
  savingDaySegment.value = segmentId
  globalError.value = ''
  try {
    const payload = {
      dayKey: selectedDayKey.value,
      segment: segmentId,
      value: dayEntry.value[segmentId].value,
      locked: dayEntry.value[segmentId].locked
    }
    const r = await fetch(props.journalDaySaveUrl, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
    const j = (await r.json()) as { success?: boolean; entry?: JournalDayEntryDto; error?: string }
    if (!j.success || !j.entry) {
      globalError.value = j.error ?? 'Не удалось сохранить запись дня'
      return
    }
    dayEntry.value = j.entry
  } catch (e) {
    globalError.value = String(e)
  } finally {
    savingDaySegment.value = null
  }
}

function onToggleSegmentLock(segmentId: DaySegmentId) {
  if (!dayEntry.value) return
  dayEntry.value[segmentId].locked = !dayEntry.value[segmentId].locked
  void saveDaySegment(segmentId)
}

function goMonth(delta: number) {
  let y = currentYear.value
  let m = currentMonth.value + delta
  if (m < 1) { m = 12; y-- }
  if (m > 12) { m = 1; y++ }
  currentYear.value = y
  currentMonth.value = m
  void fetchMonthData(true)
}

function goToCurrentMonth() {
  if (isCurrentMonth.value) return
  const now = new Date()
  currentYear.value = now.getFullYear()
  currentMonth.value = now.getMonth() + 1
  void fetchMonthData(true)
}

function selectDay(dayKey: string) {
  if (!dayKey) return
  selectedDayKey.value = dayKey
  mode.value = 'day'
  showFocusStub.value = false
  void fetchDayDetails(dayKey)
}

function backToCalendar() {
  mode.value = 'calendar'
  selectedDayKey.value = ''
}

function goDay(delta: number) {
  if (!selectedDayKey.value) return
  const parts = selectedDayKey.value.split('-')
  if (parts.length !== 3) return
  const date = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10) + delta)
  const ny = date.getFullYear()
  const nm = date.getMonth() + 1
  const nd = date.getDate()
  const newKey = `${ny}-${String(nm).padStart(2, '0')}-${String(nd).padStart(2, '0')}`
  selectedDayKey.value = newKey
  showFocusStub.value = false

  if (ny !== currentYear.value || nm !== currentMonth.value) {
    currentYear.value = ny
    currentMonth.value = nm
    void fetchMonthData(true)
  }

  void fetchDayDetails(newKey)
}

onMounted(() => {
  void fetchMonthData(false)
})
</script>

<template>
  <div class="jm-root">
    <Transition name="jm-view" mode="out-in">
      <!-- CALENDAR MODE -->
      <div v-if="mode === 'calendar'" key="calendar" class="jm-calendar">
        <header class="jm-head">
          <div class="jm-controls">
            <button type="button" class="jm-switch" :disabled="loadingSwitch" @click="goMonth(-1)">← Пред.</button>
            <h2 class="jm-title">{{ MONTH_NAMES[currentMonth - 1] }} {{ currentYear }}</h2>
            <button type="button" class="jm-switch" :disabled="loadingSwitch" @click="goMonth(1)">След. →</button>
          </div>
          <div class="jm-sub-row">
            <p class="jm-sub">Выберите день для детального просмотра</p>
            <button
              type="button"
              class="jm-current-link"
              :disabled="loadingSwitch || isCurrentMonth"
              @click="goToCurrentMonth"
            >
              К текущему месяцу
            </button>
          </div>
        </header>

        <p v-if="!props.isAuthenticated" class="jm-hint">Войдите в аккаунт для просмотра месячного обзора.</p>
        <p v-else-if="loading" class="jm-hint">Загрузка данных месяца…</p>
        <p v-if="globalError" class="jm-error" role="alert">{{ globalError }}</p>

        <div class="jm-grid" :aria-busy="loadingSwitch">
          <div v-for="name in DAY_NAMES_SHORT" :key="name" class="jm-dow">{{ name }}</div>
          <button
            v-for="(cell, i) in calendarCells"
            :key="'c' + i"
            type="button"
            class="jm-cell"
            :class="{
              'jm-cell--other': !cell.isCurrentMonth,
              'jm-cell--today': cell.isToday,
              'jm-cell--has-tasks': cell.dayKey && tasksCountByDay[cell.dayKey],
              'jm-cell--has-focus': cell.dayKey && focusByDay[cell.dayKey]
            }"
            :disabled="!cell.isCurrentMonth"
            @click="cell.isCurrentMonth && selectDay(cell.dayKey)"
          >
            <span class="jm-cell-num">{{ cell.day }}</span>
            <div
              v-if="
                cell.isCurrentMonth &&
                (tasksCountByDay[cell.dayKey] || (focusByDay[cell.dayKey] && focusByDay[cell.dayKey] > 0))
              "
              class="jm-cell-meta"
            >
              <span v-if="tasksCountByDay[cell.dayKey]" class="jm-cell-badge">
                {{ tasksCountByDay[cell.dayKey] }}
              </span>
              <span
                v-if="focusByDay[cell.dayKey] && focusByDay[cell.dayKey] > 0"
                class="jm-cell-focus"
                :title="`Время фокуса: ${formatFocusTime(focusByDay[cell.dayKey])}`"
              >
                {{ formatFocusTimeCompact(focusByDay[cell.dayKey]) }}
              </span>
            </div>
          </button>
        </div>

        <div class="jm-legend">
          <span
            class="jm-legend-item"
            title="Всего по выбранному месяцу. В ячейке дня — сколько задач завершено в этот день."
          >
            <span class="jm-legend-badge">{{ monthCompletedTasksTotal }}</span>
            <span>завершённых задач за месяц</span>
          </span>
          <span
            class="jm-legend-item"
            title="Всего время фокуса за месяц. В ячейке — время фокуса за день."
          >
            <span class="jm-legend-focus-sample">{{ monthFocusLegendCompact }}</span>
            <span>время фокуса за месяц</span>
          </span>
        </div>
      </div>

      <!-- DAY VIEW MODE -->
      <div v-else key="day-view" class="jm-day">
        <header class="jm-head jm-head--day">
          <div class="jm-controls">
            <button type="button" class="jm-switch" @click="goDay(-1)">← Пред.</button>
            <h2 class="jm-title jm-title--day">{{ selectedDayFormatted }}</h2>
            <button type="button" class="jm-switch" @click="goDay(1)">След. →</button>
          </div>
          <div class="jm-sub-row">
            <button type="button" class="jm-current-link" @click="backToCalendar">← Назад к календарю</button>
          </div>
        </header>

        <p v-if="loadingDay" class="jm-hint">Загрузка данных дня…</p>
        <p v-if="globalError" class="jm-error" role="alert">{{ globalError }}</p>

        <div class="jm-day-stack">
          <section class="jm-section">
            <div class="jm-section-header">
              <h3 class="jm-section-title">Завершённые задачи</h3>
              <span v-if="selectedDayTasks.length > 0" class="jm-section-badge" aria-hidden="true">
                {{ selectedDayTasks.length }}
              </span>
            </div>
            <div class="jm-section-body">
              <p v-if="selectedDayTasks.length === 0" class="jm-section-empty">Нет завершённых задач за этот день</p>
              <ul v-else class="jm-task-list">
                <li v-for="t in selectedDayTasks" :key="t.id" class="jm-task-item">
                  <span class="jm-task-title">{{ t.title }}</span>
                  <span v-if="t.projectName || t.clientName" class="jm-task-meta">
                    <template v-if="t.clientName">{{ t.clientName }}</template>
                    <template v-if="t.clientName && t.projectName"> · </template>
                    <template v-if="t.projectName">{{ t.projectName }}</template>
                  </span>
                </li>
              </ul>
            </div>
          </section>

          <section class="jm-section jm-section--focus">
            <div class="jm-section-header jm-section-header--split">
              <div class="jm-focus-intro">
                <h3 class="jm-section-title">Время фокуса</h3>
                <p class="jm-focus-value">{{ formatFocusTime(selectedDayFocusSec) }}</p>
              </div>
              <button type="button" class="jm-focus-btn" @click="showFocusStub = !showFocusStub">
                {{ showFocusStub ? 'Скрыть' : 'Показать детали' }}
              </button>
            </div>
            <div v-if="showFocusStub" class="jm-section-body jm-section-body--flush-top">
              <div class="jm-focus-stub">
                <p class="jm-stub-label">В разработке</p>
              </div>
            </div>
          </section>

          <section class="jm-section">
            <div class="jm-section-header jm-section-header--split">
              <h3 class="jm-section-title">План на день (из недели)</h3>
              <button
                type="button"
                class="jm-segment-lock-btn"
                :class="{ 'jm-segment-lock-btn--active': dayWeekLocked }"
                :disabled="savingWeekPlan"
                @click="onToggleWeekPlanLock"
              >
                {{ dayWeekLocked ? 'Редактировать' : 'Зафиксировать' }}
              </button>
            </div>
            <div class="jm-section-body jm-section-body--flush-top">
              <textarea
                v-model="dayWeekPlan"
                class="jm-segment-textarea"
                rows="3"
                :disabled="dayWeekLocked || savingWeekPlan"
                placeholder="План на день из раздела Неделя…"
              />
            </div>
          </section>

          <section v-if="dayEntry" class="jm-section">
            <div class="jm-section-header">
              <h3 class="jm-section-title">Дневные записи</h3>
            </div>
            <div class="jm-section-body jm-section-body--segments">
              <div class="jm-segments">
                <article v-for="seg in daySegments" :key="seg.id" class="jm-segment">
                  <div class="jm-segment-head">
                    <h4 class="jm-segment-label">{{ seg.label }}</h4>
                    <button
                      type="button"
                      class="jm-segment-lock-btn"
                      :class="{ 'jm-segment-lock-btn--active': seg.state.locked }"
                      :disabled="savingDaySegment === seg.id"
                      @click="onToggleSegmentLock(seg.id)"
                    >
                      {{ seg.state.locked ? 'Редактировать' : 'Зафиксировать' }}
                    </button>
                  </div>
                  <textarea
                    v-model="seg.state.value"
                    class="jm-segment-textarea"
                    rows="3"
                    :disabled="seg.state.locked || savingDaySegment === seg.id"
                    :placeholder="`Запись: ${seg.label.toLowerCase()}…`"
                  />
                </article>
              </div>
            </div>
          </section>
        </div>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.jm-root {
  padding: 0.85rem 1rem 1.25rem;
}

.jm-head {
  margin-bottom: 0.85rem;
  padding-bottom: 0.65rem;
  border-bottom: 1px solid var(--color-border);
}

.jm-head--day {
  margin-bottom: 0.75rem;
}

.jm-controls {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.6rem;
}

.jm-title {
  margin: 0;
  font-size: 0.97rem;
  font-weight: 600;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--color-text);
  text-align: center;
  line-height: 1.35;
}

.jm-title--day {
  font-size: 0.88rem;
  letter-spacing: 0.1em;
}

.jm-switch {
  margin: 0;
  padding: 0.28rem 0.5rem;
  font-family: inherit;
  font-size: 0.76rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--color-text-secondary);
  background: var(--color-bg-secondary);
  border: 1px solid var(--color-border-light);
  border-radius: 2px;
  cursor: pointer;
  transition: var(--transition);
}

.jm-switch:hover:not(:disabled) {
  color: var(--color-text);
  border-color: var(--color-accent);
}

.jm-switch:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.jm-sub-row {
  margin-top: 0.3rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.6rem;
}

.jm-sub {
  margin: 0;
  font-size: 0.8rem;
  letter-spacing: 0.06em;
  color: var(--color-text-secondary);
}

.jm-current-link {
  margin: 0;
  padding: 0;
  border: 0;
  background: transparent;
  color: var(--color-text-secondary);
  font-family: inherit;
  font-size: 0.78rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  cursor: pointer;
  transition: var(--transition);
}

.jm-current-link:hover:not(:disabled) {
  color: var(--color-text);
  text-decoration: underline;
  text-underline-offset: 0.12rem;
}

.jm-current-link:disabled {
  opacity: 0.45;
  cursor: default;
}

.jm-hint {
  margin: 0.4rem 0 0.7rem;
  font-size: 0.84rem;
  color: var(--color-text-secondary);
}

.jm-error {
  margin: 0.4rem 0 0.7rem;
  font-size: 0.82rem;
  color: var(--color-accent-hover);
}

/* Calendar Grid */
.jm-calendar {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
}

.jm-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 2px;
  margin-top: 0.35rem;
  padding: 0.35rem;
  border-radius: 4px;
  border: 1px solid var(--color-border);
  background: var(--color-bg-secondary);
}

.jm-dow {
  padding: 0.4rem 0 0.35rem;
  font-size: 0.74rem;
  font-weight: 600;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  text-align: center;
  color: var(--color-text-tertiary);
  border-bottom: 1px solid var(--color-border-light);
}

.jm-cell {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.15rem;
  padding: 0.45rem 0.2rem 0.35rem;
  min-height: 3rem;
  font-family: inherit;
  font-size: 0.86rem;
  color: var(--color-text-secondary);
  background: var(--color-bg);
  border: 1px solid transparent;
  border-radius: 3px;
  cursor: pointer;
  transition: var(--transition);
}

.jm-cell:hover:not(:disabled) {
  background: var(--color-bg-tertiary);
  border-color: var(--color-border-light);
  box-shadow: 0 0 0 1px var(--color-accent-medium);
}

.jm-cell--other {
  opacity: 0.25;
  cursor: default;
}

.jm-cell--today {
  border-color: var(--color-accent);
  background: var(--color-accent-light);
}

.jm-cell--today .jm-cell-num {
  color: var(--color-accent-hover);
  font-weight: 700;
}

.jm-cell--has-tasks {
  color: var(--color-text);
}

.jm-cell-num {
  font-size: 0.84rem;
  line-height: 1;
  color: inherit;
}

.jm-cell-badge {
  font-size: 0.76rem;
  line-height: 1;
  letter-spacing: 0.04em;
  padding: 0.1rem 0.22rem;
  border-radius: 2px;
  background: var(--color-accent-medium);
  color: var(--color-accent-hover);
  font-weight: 600;
}

.jm-cell-meta {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: center;
  gap: 0.18rem 0.28rem;
  max-width: 100%;
}

.jm-cell-focus {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  max-width: 100%;
  padding: 0.08rem 0.24rem;
  font-size: 0.68rem;
  font-weight: 600;
  line-height: 1.15;
  letter-spacing: 0.03em;
  font-variant-numeric: tabular-nums;
  color: var(--color-accent-hover);
  background: linear-gradient(180deg, rgba(0, 0, 0, 0.28) 0%, rgba(0, 0, 0, 0.45) 100%);
  border: 1px solid var(--color-accent);
  border-radius: 3px;
  box-shadow:
    0 0 0 1px rgba(0, 0, 0, 0.2),
    0 1px 3px rgba(0, 0, 0, 0.35);
}

.jm-cell--today .jm-cell-focus {
  background: linear-gradient(180deg, rgba(0, 0, 0, 0.12) 0%, rgba(0, 0, 0, 0.22) 100%);
}

/* Legend */
.jm-legend {
  margin-top: 0.5rem;
  padding-top: 0.45rem;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.65rem 1rem;
  font-size: 0.74rem;
  letter-spacing: 0.06em;
  color: var(--color-text-tertiary);
  text-transform: uppercase;
}

.jm-legend-item {
  display: flex;
  align-items: center;
  gap: 0.3rem;
}

.jm-legend-badge {
  font-size: 0.74rem;
  line-height: 1;
  padding: 0.08rem 0.18rem;
  border-radius: 2px;
  background: var(--color-accent-medium);
  color: var(--color-accent-hover);
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  min-width: 1.15rem;
  text-align: center;
}

.jm-legend-focus-sample {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0.06rem 0.22rem;
  min-width: 2rem;
  font-size: 0.68rem;
  font-weight: 600;
  letter-spacing: 0.03em;
  font-variant-numeric: tabular-nums;
  color: var(--color-accent-hover);
  border: 1px solid var(--color-accent);
  border-radius: 3px;
  background: linear-gradient(180deg, rgba(0, 0, 0, 0.28) 0%, rgba(0, 0, 0, 0.45) 100%);
}

/* Day View */
.jm-day-stack {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  margin-top: 0.35rem;
}

.jm-section {
  margin: 0;
  padding: 0;
  overflow: hidden;
  border: 1px solid var(--color-border);
  border-left: 3px solid var(--color-accent);
  border-radius: 4px;
  background: var(--color-bg-secondary);
  box-shadow:
    0 1px 0 rgba(255, 255, 255, 0.04) inset,
    0 4px 14px rgba(0, 0, 0, 0.22);
}

.jm-section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.65rem;
  padding: 0.65rem 0.85rem;
  border-bottom: 1px solid var(--color-border);
  background: linear-gradient(180deg, rgba(0, 0, 0, 0.35) 0%, rgba(0, 0, 0, 0.12) 100%);
}

.jm-section-header--split {
  align-items: flex-start;
}

.jm-section-title {
  margin: 0;
  flex: 1 1 auto;
  min-width: 0;
  font-size: 0.82rem;
  font-weight: 600;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--color-text-secondary);
  line-height: 1.3;
}

.jm-section-badge {
  flex-shrink: 0;
  min-width: 1.35rem;
  padding: 0.12rem 0.4rem;
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-align: center;
  line-height: 1.2;
  color: var(--color-accent-hover);
  background: var(--color-accent-medium);
  border: 1px solid var(--color-accent);
  border-radius: 999px;
}

.jm-section-body {
  padding: 0.75rem 0.85rem 0.85rem;
}

.jm-section-body--flush-top {
  padding-top: 0.65rem;
}

.jm-section-body--segments {
  padding-top: 0.65rem;
}

.jm-section--focus .jm-section-header--split {
  align-items: center;
}

.jm-focus-intro {
  flex: 1 1 auto;
  min-width: 0;
}

.jm-focus-intro .jm-section-title {
  margin-bottom: 0.2rem;
}

.jm-section-empty {
  margin: 0;
  font-size: 0.82rem;
  line-height: 1.45;
  color: var(--color-text-tertiary);
}

.jm-task-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.jm-task-item {
  position: relative;
  padding: 0.55rem 0.65rem 0.55rem 0.75rem;
  background: var(--color-bg);
  border: 1px solid var(--color-border-light);
  border-radius: 3px;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.18);
}

.jm-task-item::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0.35rem;
  bottom: 0.35rem;
  width: 3px;
  border-radius: 0 2px 2px 0;
  background: var(--color-accent);
  opacity: 0.85;
}

.jm-task-title {
  display: block;
  font-size: 0.84rem;
  font-weight: 600;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: var(--color-text);
  word-break: break-word;
}

.jm-task-meta {
  display: block;
  margin-top: 0.28rem;
  padding-top: 0.28rem;
  border-top: 1px solid var(--color-border);
  font-size: 0.76rem;
  letter-spacing: 0.03em;
  color: var(--color-text-secondary);
}

.jm-focus-value {
  margin: 0;
  font-size: 1.05rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  font-variant-numeric: tabular-nums;
  color: var(--color-text);
}

.jm-focus-btn {
  margin: 0;
  padding: 0.28rem 0.5rem;
  font-family: inherit;
  font-size: 0.74rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--color-text-secondary);
  background: var(--color-bg-secondary);
  border: 1px solid var(--color-border-light);
  border-radius: 2px;
  cursor: pointer;
  transition: var(--transition);
}

.jm-focus-btn:hover {
  color: var(--color-text);
  border-color: var(--color-accent);
}

.jm-focus-stub {
  margin: 0;
  padding: 1rem;
  text-align: center;
  border: 1px dashed var(--color-border-light);
  border-radius: 3px;
  background: rgba(0, 0, 0, 0.2);
}

.jm-stub-label {
  margin: 0;
  font-size: 0.88rem;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--color-text-tertiary);
}

.jm-plan-text {
  margin: 0;
  padding: 0.45rem 0.5rem;
  font-family: inherit;
  font-size: 0.84rem;
  line-height: 1.45;
  letter-spacing: 0.04em;
  color: var(--color-text);
  white-space: pre-wrap;
  word-break: break-word;
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: 2px;
}

.jm-segments {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.65rem;
}

.jm-segment {
  padding: 0.5rem 0.55rem;
  border: 1px solid var(--color-border-light);
  background: var(--color-bg);
  border-radius: 3px;
  box-shadow: 0 1px 0 rgba(255, 255, 255, 0.03);
}

.jm-segment-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.3rem;
  margin-bottom: 0.3rem;
}

.jm-segment-label {
  margin: 0;
  font-size: 0.78rem;
  font-weight: 500;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--color-text);
}

.jm-segment-locked {
  font-size: 0.78rem;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--color-accent);
  padding: 0.1rem 0.25rem;
  border: 1px solid var(--color-accent);
  border-radius: 2px;
  background: var(--color-accent-light);
}

.jm-segment-text {
  margin: 0;
  font-family: inherit;
  font-size: 0.8rem;
  line-height: 1.4;
  letter-spacing: 0.04em;
  color: var(--color-text-secondary);
  white-space: pre-wrap;
  word-break: break-word;
}

.jm-segment-empty {
  margin: 0;
  font-size: 0.78rem;
  color: var(--color-text-tertiary);
}

.jm-segment-lock-btn {
  margin: 0;
  padding: 0.2rem 0.4rem;
  font-family: inherit;
  font-size: 0.7rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--color-text-secondary);
  background: var(--color-bg-secondary);
  border: 1px solid var(--color-border-light);
  border-radius: 2px;
  cursor: pointer;
  transition: var(--transition);
}

.jm-segment-lock-btn:hover:not(:disabled) {
  color: var(--color-text);
  border-color: var(--color-accent);
}

.jm-segment-lock-btn--active {
  color: var(--color-text);
  background: var(--color-accent-light);
  border-color: var(--color-accent);
  box-shadow: 0 0 8px var(--color-accent-medium);
}

.jm-segment-lock-btn:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.jm-segment-textarea {
  width: 100%;
  box-sizing: border-box;
  resize: vertical;
  margin: 0;
  padding: 0.45rem 0.5rem;
  font-family: inherit;
  font-size: 0.8rem;
  line-height: 1.4;
  letter-spacing: 0.04em;
  color: var(--color-text);
  border: 1px solid var(--color-border);
  border-radius: 2px;
  background-color: var(--color-bg);
  background-image: repeating-linear-gradient(
    0deg,
    rgba(0, 0, 0, 0.1),
    rgba(0, 0, 0, 0.1) 1px,
    transparent 1px,
    transparent 2px
  );
}

.jm-segment-textarea:disabled {
  opacity: 0.75;
}

/* Transitions */
.jm-view-enter-active,
.jm-view-leave-active {
  transition:
    opacity 0.2s cubic-bezier(0.4, 0, 0.2, 1),
    transform 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

.jm-view-enter-from {
  opacity: 0;
  transform: translateX(6px);
}

.jm-view-leave-to {
  opacity: 0;
  transform: translateX(-6px);
}

@media (max-width: 900px) {
  .jm-segments {
    grid-template-columns: 1fr;
  }

  .jm-title--day {
    font-size: 0.78rem;
    letter-spacing: 0.06em;
  }
}

@media (max-width: 520px) {
  .jm-cell {
    min-height: 2.75rem;
    padding: 0.28rem 0.08rem 0.22rem;
  }

  .jm-cell-num {
    font-size: 0.76rem;
  }

  .jm-cell-focus {
    font-size: 0.62rem;
    padding: 0.06rem 0.18rem;
  }

  .jm-cell-badge {
    font-size: 0.7rem;
    padding: 0.06rem 0.18rem;
  }
}
</style>
