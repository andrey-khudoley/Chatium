<script setup lang="ts">
import { computed, onActivated, onDeactivated, onMounted, onUnmounted, ref, watch } from 'vue'
import { shiftWeekMondayKey } from '../../lib/journal-week-key'
import type { JournalHabitsWeekDto, JournalHabitRowDto } from '../../lib/journal-habits-time'

const props = defineProps<{
  isAuthenticated: boolean
  journalHabitsGetUrl: string
  journalHabitsSaveUrl: string
  journalHabitsInitial: JournalHabitsWeekDto | null
}>()

const dayShort = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс']
const monthNames = ['янв', 'фев', 'мар', 'апр', 'мая', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек']

const mondayKey = ref('')
const weekNumber = ref(0)
const dayKeys = ref<string[]>([])
const rows = ref<JournalHabitRowDto[]>([])
const todayColumnIndex = ref<number | null>(null)
const interactionMode = ref<'current' | 'past' | 'future'>('current')
const effectiveDayKey = ref('')
const currentWeekMondayKey = ref('')

const loading = ref(false)
const loadingSwitch = ref(false)
const saving = ref(false)
const globalError = ref('')
const draggingHabitId = ref<string | null>(null)

let saveTimer: ReturnType<typeof setTimeout> | null = null
let pollTimer: ReturnType<typeof setInterval> | null = null

function newHabitId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID()
  return `h_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 9)}`
}

function formatDayKeyShort(dayKey: string): string {
  const d = Number(dayKey.slice(8, 10))
  const m = Number(dayKey.slice(5, 7))
  if (!Number.isFinite(d) || !Number.isFinite(m)) return ''
  return `${d} ${monthNames[m - 1] ?? ''}`
}

function applyHabits(h: JournalHabitsWeekDto) {
  mondayKey.value = h.mondayKey
  weekNumber.value = h.weekNumber
  dayKeys.value = [...h.dayKeys]
  rows.value = h.rows.map((r) => ({
    id: r.id,
    title: r.title,
    days: Array.from({ length: 7 }, (_, i) => Boolean(r.days[i]))
  }))
  todayColumnIndex.value = h.todayColumnIndex
  interactionMode.value = h.interactionMode
  effectiveDayKey.value = h.effectiveDayKey
  currentWeekMondayKey.value = h.currentWeekMondayKey
}

watch(
  () => props.journalHabitsInitial,
  (next) => {
    if (!next) return
    // SSR initial — только для той же недели или до первой загрузки; иначе при KeepAlive и
    // навигации по неделям повторное применение затрёт выбранную неделю данными с первого рендера.
    if (mondayKey.value && mondayKey.value !== next.mondayKey) return
    applyHabits(next)
  },
  { immediate: true }
)

const canEditStructure = computed(() => props.isAuthenticated && interactionMode.value === 'current')
const isCurrentWeek = computed(() => interactionMode.value === 'current')

/** Следующая неделя относительно просмотра — не позже текущей календарной недели (по 05:00). */
const canGoNextWeek = computed(() => {
  if (!mondayKey.value || !currentWeekMondayKey.value) return false
  const next = shiftWeekMondayKey(mondayKey.value, 1)
  return next.localeCompare(currentWeekMondayKey.value) <= 0
})

const weekRangeLabel = computed(() => {
  const keys = dayKeys.value
  if (keys.length < 2) return ''
  const a = formatDayKeyShort(keys[0])
  const b = formatDayKeyShort(keys[6])
  return `${a} — ${b}`
})

function checkboxDisabled(colIdx: number): boolean {
  if (!props.isAuthenticated) return true
  if (interactionMode.value !== 'current') return true
  const t = todayColumnIndex.value
  if (t === null) return true
  return colIdx !== t
}

function columnHighlightClass(colIdx: number): string {
  const t = todayColumnIndex.value
  if (t !== null && colIdx === t) return 'habits-col--today'
  return ''
}

async function fetchWeek(targetMonday: string | undefined, isSwitch: boolean) {
  if (!props.isAuthenticated || !props.journalHabitsGetUrl) return
  if (isSwitch) loadingSwitch.value = true
  else loading.value = true
  globalError.value = ''
  try {
    const url = new URL(props.journalHabitsGetUrl, window.location.origin)
    if (targetMonday) url.searchParams.set('mondayKey', targetMonday)
    const r = await fetch(url.pathname + url.search, { credentials: 'include' })
    const j = await r.json() as { success?: boolean; habits?: JournalHabitsWeekDto; error?: string }
    if (!j.success || !j.habits) {
      globalError.value = j.error ?? 'Не удалось загрузить привычки'
      return
    }
    applyHabits(j.habits)
  } catch (e) {
    globalError.value = String(e)
  } finally {
    loading.value = false
    loadingSwitch.value = false
  }
}

async function saveNow() {
  if (!props.isAuthenticated || !props.journalHabitsSaveUrl) return
  if (interactionMode.value !== 'current') return
  saving.value = true
  globalError.value = ''
  try {
    const payload = {
      mondayKey: mondayKey.value,
      rows: rows.value.map((r) => ({
        id: r.id,
        title: r.title,
        days: Array.from({ length: 7 }, (_, i) => Boolean(r.days[i]))
      }))
    }
    const r = await fetch(props.journalHabitsSaveUrl, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
    const j = await r.json() as { success?: boolean; habits?: JournalHabitsWeekDto; error?: string }
    if (!j.success || !j.habits) {
      globalError.value = j.error ?? 'Не удалось сохранить'
      return
    }
    applyHabits(j.habits)
  } catch (e) {
    globalError.value = String(e)
  } finally {
    saving.value = false
  }
}

function scheduleSave() {
  if (!canEditStructure.value) return
  if (saveTimer) clearTimeout(saveTimer)
  saveTimer = setTimeout(() => {
    saveTimer = null
    void saveNow()
  }, 520)
}

function onTitleInput(row: JournalHabitRowDto, value: string) {
  row.title = value
  scheduleSave()
}

function onTitleInputEvent(row: JournalHabitRowDto, e: Event) {
  const t = e.target
  if (!(t instanceof HTMLInputElement)) return
  onTitleInput(row, t.value)
}

function onToggleDay(row: JournalHabitRowDto, colIdx: number) {
  if (checkboxDisabled(colIdx)) return
  row.days[colIdx] = !row.days[colIdx]
  void saveNow()
}

function addRow() {
  if (!canEditStructure.value) return
  rows.value.push({
    id: newHabitId(),
    title: '',
    days: [false, false, false, false, false, false, false]
  })
  scheduleSave()
}

function removeRow(id: string) {
  if (!canEditStructure.value) return
  rows.value = rows.value.filter((r) => r.id !== id)
  void saveNow()
}

function onHabitDragStart(row: JournalHabitRowDto, e: DragEvent) {
  if (!canEditStructure.value) return
  draggingHabitId.value = row.id
  e.dataTransfer?.setData('text/plain', row.id)
  if (e.dataTransfer) e.dataTransfer.effectAllowed = 'move'
}

function onHabitDragEnd() {
  draggingHabitId.value = null
}

function onHabitDragOver(e: DragEvent) {
  if (!canEditStructure.value || !draggingHabitId.value) return
  e.preventDefault()
  if (e.dataTransfer) e.dataTransfer.dropEffect = 'move'
}

function onHabitDrop(targetRow: JournalHabitRowDto) {
  if (!canEditStructure.value) return
  const fromId = draggingHabitId.value
  onHabitDragEnd()
  if (!fromId || fromId === targetRow.id) return
  const a = [...rows.value]
  const fromIdx = a.findIndex((r) => r.id === fromId)
  let toIdx = a.findIndex((r) => r.id === targetRow.id)
  if (fromIdx < 0 || toIdx < 0) return
  const [item] = a.splice(fromIdx, 1)
  if (fromIdx < toIdx) toIdx -= 1
  a.splice(toIdx, 0, item)
  rows.value = a
  scheduleSave()
}

function goPrevWeek() {
  const next = shiftWeekMondayKey(mondayKey.value, -1)
  void fetchWeek(next, true)
}

function goNextWeek() {
  if (!canGoNextWeek.value) return
  const next = shiftWeekMondayKey(mondayKey.value, 1)
  void fetchWeek(next, true)
}

function goCurrentWeek() {
  void fetchWeek(undefined, true)
}

function pollCurrentWeek() {
  if (!props.isAuthenticated || !props.journalHabitsGetUrl) return
  if (interactionMode.value !== 'current') return
  void fetchWeek(undefined, false)
}

function startHabitsPoll() {
  if (pollTimer != null || !props.isAuthenticated || !props.journalHabitsGetUrl) return
  pollTimer = setInterval(pollCurrentWeek, 60000)
}

function stopHabitsPoll() {
  if (pollTimer != null) clearInterval(pollTimer)
  pollTimer = null
}

onMounted(() => {
  if (props.isAuthenticated && props.journalHabitsGetUrl && !props.journalHabitsInitial) {
    void fetchWeek(undefined, false)
  }
  startHabitsPoll()
})

onActivated(() => {
  startHabitsPoll()
})

onDeactivated(() => {
  stopHabitsPoll()
})

onUnmounted(() => {
  if (saveTimer) clearTimeout(saveTimer)
  stopHabitsPoll()
})
</script>

<template>
  <div class="habits-root">
    <header class="habits-header">
      <div class="habits-header-main">
        <h2 class="habits-title">Привычки</h2>
        <p class="habits-sub">
          Неделя {{ weekNumber }}<span v-if="weekRangeLabel" class="habits-sub-dim"> · {{ weekRangeLabel }}</span>
        </p>
        <p class="habits-hint">
          Сутки для «сегодня» и смены недели — с 05:00. В прошлых днях текущей недели отметки недоступны; хранятся только
          прошлые недели и текущая. Порядок строк можно менять перетаскиванием за ручку слева от названия.
        </p>
      </div>

      <div v-if="isAuthenticated" class="habits-toolbar" role="toolbar" aria-label="Навигация по неделям">
        <button type="button" class="habits-nav-btn" :disabled="loadingSwitch" @click="goPrevWeek" aria-label="Предыдущая неделя">
          <i class="fa-solid fa-chevron-left" aria-hidden="true" />
        </button>
        <button type="button" class="habits-nav-btn habits-nav-btn--text" :disabled="loadingSwitch" @click="goCurrentWeek">
          Текущая
        </button>
        <button
          type="button"
          class="habits-nav-btn"
          :disabled="loadingSwitch || !canGoNextWeek"
          @click="goNextWeek"
          aria-label="Следующая неделя"
        >
          <i class="fa-solid fa-chevron-right" aria-hidden="true" />
        </button>
      </div>
    </header>

    <div v-if="!isAuthenticated" class="habits-guest">
      <p class="habits-guest-text">Войдите, чтобы вести привычки — данные сохраняются в вашем аккаунте.</p>
    </div>

    <div v-else class="habits-body">
      <div v-if="globalError" class="habits-error" role="alert">{{ globalError }}</div>

      <div v-if="loading && !rows.length" class="habits-loading">Загрузка…</div>

      <div v-else class="habits-table-wrap">
        <table class="habits-table" :aria-busy="loadingSwitch || saving">
          <thead>
            <tr>
              <th scope="col" class="habits-th habits-th--title">Привычка</th>
              <th
                v-for="(dk, idx) in dayKeys"
                :key="dk"
                scope="col"
                class="habits-th habits-th--day"
                :class="columnHighlightClass(idx)"
              >
                <span class="habits-th-day">{{ dayShort[idx] }}</span>
                <span class="habits-th-date">{{ formatDayKeyShort(dk) }}</span>
              </th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="rows.length === 0" class="habits-tr habits-tr--empty">
              <td colspan="8" class="habits-td habits-td--empty">
                <span v-if="canEditStructure">Нет привычек — нажмите «Добавить привычку».</span>
                <span v-else>Нет данных за эту неделю.</span>
              </td>
            </tr>
            <tr
              v-for="row in rows"
              :key="row.id"
              class="habits-tr"
              :class="{ 'habits-tr--dragging': draggingHabitId === row.id }"
              @dragover="onHabitDragOver"
              @drop.prevent="onHabitDrop(row)"
            >
              <td class="habits-td habits-td--title">
                <div class="habits-title-cell">
                  <span
                    v-if="canEditStructure"
                    class="habits-drag-handle"
                    draggable="true"
                    title="Перетащить"
                    aria-label="Перетащить, чтобы изменить порядок строк"
                    :aria-grabbed="draggingHabitId === row.id"
                    @dragstart.stop="onHabitDragStart(row, $event)"
                    @dragend="onHabitDragEnd"
                  >
                    <i class="fa-solid fa-grip-vertical" aria-hidden="true" />
                  </span>
                  <input
                    :value="row.title"
                    class="habits-title-input"
                    type="text"
                    maxlength="200"
                    placeholder="Название"
                    :readonly="!canEditStructure"
                    :aria-readonly="!canEditStructure"
                    @input="onTitleInputEvent(row, $event)"
                  />
                  <button
                    v-if="canEditStructure"
                    type="button"
                    class="habits-row-del"
                    :aria-label="'Удалить привычку'"
                    @click="removeRow(row.id)"
                  >
                    <i class="fa-solid fa-trash-can" aria-hidden="true" />
                  </button>
                </div>
              </td>
              <td
                v-for="(_checked, colIdx) in row.days"
                :key="`${row.id}-${colIdx}`"
                class="habits-td habits-td--check"
                :class="columnHighlightClass(colIdx)"
              >
                <label class="habits-check-label">
                  <input
                    type="checkbox"
                    class="habits-check"
                    :checked="row.days[colIdx]"
                    :disabled="checkboxDisabled(colIdx)"
                    :aria-label="`День ${dayShort[colIdx]}, ${formatDayKeyShort(dayKeys[colIdx] ?? '')}`"
                    @change="onToggleDay(row, colIdx)"
                  />
                  <span class="habits-check-ui" aria-hidden="true" />
                </label>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div v-if="isAuthenticated && canEditStructure" class="habits-footer">
        <button type="button" class="habits-add-btn" @click="addRow">
          <i class="fa-solid fa-plus" aria-hidden="true" />
          Добавить привычку
        </button>
        <span v-if="saving" class="habits-saving">Сохранение…</span>
      </div>

      <p v-if="isAuthenticated && !isCurrentWeek" class="habits-archive-hint">
        Просмотр архива: отметки недоступны для редактирования.
      </p>

      <p v-if="isAuthenticated && isCurrentWeek && todayColumnIndex !== null" class="habits-today-hint">
        Сегодня: <strong>{{ formatDayKeyShort(effectiveDayKey) }}</strong> (колонка «{{ dayShort[todayColumnIndex] }}»).
      </p>
    </div>
  </div>
</template>

<style scoped>
.habits-root {
  padding: 1rem 1rem 1.5rem;
  min-height: 14rem;
}

.habits-header {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 1rem;
}

.habits-title {
  margin: 0 0 0.25rem;
  font-size: 1.15rem;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--color-text);
}

.habits-sub {
  margin: 0 0 0.5rem;
  font-size: 0.9rem;
  color: var(--color-text-secondary);
}

.habits-sub-dim {
  color: var(--color-text-tertiary);
}

.habits-hint {
  margin: 0;
  max-width: 52rem;
  font-size: 0.78rem;
  line-height: 1.45;
  color: var(--color-text-tertiary);
}

.habits-toolbar {
  display: flex;
  align-items: center;
  gap: 0.35rem;
}

.habits-nav-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 2.25rem;
  min-height: 2.25rem;
  padding: 0 0.5rem;
  border: 1px solid var(--color-border);
  border-radius: 2px;
  background: var(--color-bg-tertiary);
  color: var(--color-text-secondary);
  cursor: pointer;
  transition: var(--transition, border-color 0.2s, color 0.2s);
}

.habits-nav-btn:hover:not(:disabled) {
  border-color: var(--color-accent);
  color: var(--color-text);
}

.habits-nav-btn:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.habits-nav-btn--text {
  min-width: auto;
  padding: 0 0.75rem;
  font-size: 0.75rem;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

.habits-guest {
  padding: 2rem 0;
  text-align: center;
}

.habits-guest-text {
  margin: 0;
  color: var(--color-text-secondary);
  font-size: 0.9rem;
}

.habits-error {
  margin-bottom: 0.75rem;
  padding: 0.5rem 0.65rem;
  border: 1px solid rgba(211, 35, 75, 0.45);
  border-radius: 2px;
  background: var(--color-accent-light);
  color: var(--color-accent-hover);
  font-size: 0.82rem;
}

.habits-loading {
  padding: 2rem;
  text-align: center;
  color: var(--color-text-secondary);
  letter-spacing: 0.1em;
  text-transform: uppercase;
  font-size: 0.8rem;
}

.habits-table-wrap {
  overflow-x: auto;
  margin: 0 -0.25rem;
  padding: 0 0.25rem 0.5rem;
  -webkit-overflow-scrolling: touch;
}

.habits-table {
  width: 100%;
  min-width: 640px;
  border-collapse: separate;
  border-spacing: 0;
}

.habits-th {
  padding: 0.5rem 0.35rem;
  text-align: center;
  font-size: 0.68rem;
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--color-text-tertiary);
  border-bottom: 1px solid var(--color-border);
  vertical-align: bottom;
}

.habits-th--title {
  text-align: left;
  min-width: 10rem;
  position: sticky;
  left: 0;
  z-index: 2;
  background: linear-gradient(90deg, var(--color-bg-secondary) 85%, transparent);
}

.habits-th--day {
  min-width: 2.6rem;
}

.habits-th-day {
  display: block;
}

.habits-th-date {
  display: block;
  margin-top: 0.15rem;
  font-weight: 400;
  font-size: 0.62rem;
  opacity: 0.85;
}

.habits-col--today {
  color: var(--color-accent);
  border-bottom-color: rgba(211, 35, 75, 0.5);
  box-shadow: inset 0 -2px 0 rgba(211, 35, 75, 0.55);
}

.habits-tr:hover .habits-td--title {
  background: rgba(211, 35, 75, 0.04);
}

.habits-tr--dragging {
  opacity: 0.55;
}

.habits-tr--dragging .habits-td {
  border-bottom-color: rgba(211, 35, 75, 0.35);
}

.habits-td--empty {
  padding: 1.5rem 0.75rem;
  text-align: center;
  font-size: 0.85rem;
  color: var(--color-text-tertiary);
  border-bottom: 1px solid var(--color-border);
}

.habits-td {
  padding: 0.4rem 0.35rem;
  border-bottom: 1px solid var(--color-border);
  vertical-align: middle;
}

.habits-td--title {
  position: sticky;
  left: 0;
  z-index: 1;
  background: var(--color-bg-secondary);
  min-width: 10rem;
}

.habits-td--check {
  text-align: center;
}

.habits-title-cell {
  display: flex;
  align-items: center;
  gap: 0.35rem;
}

.habits-drag-handle {
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.35rem;
  align-self: stretch;
  margin: -0.15rem 0 -0.15rem -0.05rem;
  padding: 0 0.1rem;
  border-radius: 2px;
  color: var(--color-text-tertiary);
  cursor: grab;
  user-select: none;
  touch-action: none;
}

.habits-drag-handle:active {
  cursor: grabbing;
}

.habits-drag-handle:hover {
  color: var(--color-accent);
  background: rgba(211, 35, 75, 0.06);
}

.habits-drag-handle:focus-visible {
  outline: 2px solid var(--color-accent);
  outline-offset: 1px;
}

.habits-title-input {
  flex: 1;
  min-width: 0;
  padding: 0.35rem 0.45rem;
  border: 1px solid var(--color-border);
  border-radius: 2px;
  background: var(--color-bg);
  color: var(--color-text);
  font: inherit;
  font-size: 0.85rem;
}

.habits-title-input:focus {
  outline: none;
  border-color: var(--color-accent);
  box-shadow: 0 0 0 1px rgba(211, 35, 75, 0.25);
}

.habits-title-input:read-only {
  opacity: 0.85;
  cursor: default;
}

.habits-row-del {
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.75rem;
  height: 1.75rem;
  padding: 0;
  border: none;
  border-radius: 2px;
  background: transparent;
  color: var(--color-text-tertiary);
  cursor: pointer;
  transition: color 0.2s, background 0.2s;
}

.habits-row-del:hover {
  color: var(--color-accent);
  background: var(--color-accent-light);
}

.habits-check-label {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  position: relative;
}

.habits-check {
  position: absolute;
  opacity: 0;
  width: 1.25rem;
  height: 1.25rem;
  margin: 0;
  cursor: inherit;
}

.habits-check:disabled {
  cursor: not-allowed;
}

.habits-check-ui {
  display: block;
  width: 1.15rem;
  height: 1.15rem;
  border: 1px solid var(--color-border-light);
  border-radius: 3px;
  background: var(--color-bg);
  transition:
    border-color 0.2s,
    background 0.2s,
    box-shadow 0.2s;
}

.habits-check:checked + .habits-check-ui {
  border-color: var(--color-accent);
  background: var(--color-accent-medium);
  box-shadow: inset 0 0 0 2px var(--color-bg);
}

.habits-check:focus-visible + .habits-check-ui {
  outline: 2px solid var(--color-accent);
  outline-offset: 2px;
}

.habits-check:disabled + .habits-check-ui {
  opacity: 0.35;
}

.habits-col--today .habits-check-ui {
  border-color: rgba(211, 35, 75, 0.65);
}

.habits-footer {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-top: 1rem;
  flex-wrap: wrap;
}

.habits-add-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  padding: 0.45rem 0.85rem;
  border: 1px dashed var(--color-border-light);
  border-radius: 2px;
  background: transparent;
  color: var(--color-text-secondary);
  font: inherit;
  font-size: 0.8rem;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  cursor: pointer;
  transition:
    border-color 0.2s,
    color 0.2s,
    background 0.2s;
}

.habits-add-btn:hover {
  border-color: var(--color-accent);
  color: var(--color-accent);
  background: var(--color-accent-light);
}

.habits-saving {
  font-size: 0.75rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--color-text-tertiary);
}

.habits-archive-hint,
.habits-today-hint {
  margin: 0.85rem 0 0;
  font-size: 0.78rem;
  color: var(--color-text-tertiary);
}

.habits-today-hint strong {
  color: var(--color-text-secondary);
  font-weight: 500;
}

@media (max-width: 700px) {
  .habits-header {
    flex-direction: column;
  }
}
</style>
