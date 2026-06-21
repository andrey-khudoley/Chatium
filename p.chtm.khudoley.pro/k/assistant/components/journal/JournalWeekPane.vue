<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import {
  computeJournalWeekMondayKeyLocal,
  getWeekDayKeysFromMonday,
  getWeekNumberFromMondayKey,
  shiftWeekMondayKey
} from '../../lib/journal-week-key'

type DayId = 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun'
type WeekDayDto = { dayId: DayId; dayKey: string; value: string; locked: boolean }
type WeekSummaryDto = { value: string; locked: boolean }
type WeekEntryDto = { mondayKey: string; weekNumber: number; summary: WeekSummaryDto; days: WeekDayDto[] }

const props = defineProps<{
  isAuthenticated: boolean
  journalWeekGetUrl: string
  journalWeekSaveUrl: string
  journalWeekSaveSummaryUrl: string
  journalWeekEntryInitial: WeekEntryDto | null
}>()

const dayOrder: DayId[] = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']
const dayLabels: Record<DayId, string> = {
  mon: 'Понедельник',
  tue: 'Вторник',
  wed: 'Среда',
  thu: 'Четверг',
  fri: 'Пятница',
  sat: 'Суббота',
  sun: 'Воскресенье'
}

const monthNames = ['янв', 'фев', 'мар', 'апр', 'мая', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек']

const mondayKey = ref(computeJournalWeekMondayKeyLocal(Date.now()))
const weekNumber = ref(getWeekNumberFromMondayKey(mondayKey.value))
const loading = ref(false)
const loadingSwitch = ref(false)
const globalError = ref('')
const savingDayKey = ref('')
const savingSummary = ref(false)
const weekSummary = ref<WeekSummaryDto>({ value: '', locked: false })

const days = ref<WeekDayDto[]>(
  getWeekDayKeysFromMonday(mondayKey.value).map((dayKey, i) => ({
    dayId: dayOrder[i],
    dayKey,
    value: '',
    locked: false
  }))
)

function formatDayKey(dayKey: string): string {
  const y = Number(dayKey.slice(0, 4))
  const m = Number(dayKey.slice(5, 7))
  const d = Number(dayKey.slice(8, 10))
  if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(d)) return dayKey
  return `${d} ${monthNames[m - 1]}`
}

function applyWeek(week: WeekEntryDto) {
  mondayKey.value = week.mondayKey
  weekNumber.value = week.weekNumber
  weekSummary.value = { ...week.summary }
  days.value = [...week.days]
}

watch(
  () => props.journalWeekEntryInitial,
  (next) => {
    if (!next) return
    applyWeek(next)
  },
  { immediate: true, deep: true }
)

async function fetchWeek(targetMondayKey: string, isSwitch: boolean) {
  if (!props.isAuthenticated || !props.journalWeekGetUrl) return
  if (isSwitch) loadingSwitch.value = true
  else loading.value = true
  globalError.value = ''
  try {
    const url = new URL(props.journalWeekGetUrl, window.location.origin)
    url.searchParams.set('mondayKey', targetMondayKey)
    const r = await fetch(url.pathname + url.search, { credentials: 'include' })
    const j = await r.json() as { success?: boolean; week?: WeekEntryDto; error?: string }
    if (!j.success || !j.week) {
      globalError.value = j.error ?? 'Не удалось загрузить неделю'
      return
    }
    applyWeek(j.week)
  } catch (e) {
    globalError.value = String(e)
  } finally {
    loading.value = false
    loadingSwitch.value = false
  }
}

async function saveDay(dayKey: string, value: string, locked: boolean) {
  if (!props.journalWeekSaveUrl) return
  savingDayKey.value = dayKey
  globalError.value = ''
  try {
    const payload = { dayKey, value, locked }
    const r = await fetch(props.journalWeekSaveUrl, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
    const j = await r.json() as { success?: boolean; week?: WeekEntryDto; error?: string }
    if (!j.success || !j.week) {
      globalError.value = j.error ?? 'Не удалось сохранить день'
      return
    }
    applyWeek(j.week)
  } catch (e) {
    globalError.value = String(e)
  } finally {
    savingDayKey.value = ''
  }
}

async function saveSummary(value: string, locked: boolean) {
  if (!props.journalWeekSaveSummaryUrl) return
  savingSummary.value = true
  globalError.value = ''
  try {
    const payload = { mondayKey: mondayKey.value, value, locked }
    const r = await fetch(props.journalWeekSaveSummaryUrl, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
    const j = await r.json() as { success?: boolean; week?: WeekEntryDto; error?: string }
    if (!j.success || !j.week) {
      globalError.value = j.error ?? 'Не удалось сохранить план недели'
      return
    }
    applyWeek(j.week)
  } catch (e) {
    globalError.value = String(e)
  } finally {
    savingSummary.value = false
  }
}

function goWeek(delta: number) {
  const target = shiftWeekMondayKey(mondayKey.value, delta)
  void fetchWeek(target, true)
}

function goToCurrentWeek() {
  const currentMondayKey = computeJournalWeekMondayKeyLocal(Date.now())
  if (mondayKey.value === currentMondayKey) return
  void fetchWeek(currentMondayKey, true)
}

function toggleLock(day: WeekDayDto) {
  const nextLocked = !day.locked
  void saveDay(day.dayKey, day.value, nextLocked)
}

function setDayValue(dayKey: string, value: string) {
  days.value = days.value.map((d) => (d.dayKey === dayKey ? { ...d, value } : d))
}

function onDayInput(dayKey: string, event: Event) {
  const target = event.target as HTMLTextAreaElement
  setDayValue(dayKey, target.value)
}

function onSummaryInput(event: Event) {
  const target = event.target as HTMLTextAreaElement
  weekSummary.value = { ...weekSummary.value, value: target.value }
}

function onToggleSummaryLock() {
  const nextLocked = !weekSummary.value.locked
  void saveSummary(weekSummary.value.value, nextLocked)
}

const canEdit = computed(() => props.isAuthenticated && !loading.value && !loadingSwitch.value)
const isCurrentWeek = computed(() => mondayKey.value === computeJournalWeekMondayKeyLocal(Date.now()))

onMounted(() => {
  void fetchWeek(mondayKey.value, false)
})
</script>

<template>
  <div class="journal-week">
    <header class="journal-week-head">
      <div class="journal-week-controls">
        <button type="button" class="journal-week-switch" :disabled="loadingSwitch" @click="goWeek(-1)">← Пред.</button>
        <p class="journal-week-title">Неделя #{{ weekNumber }}</p>
        <button type="button" class="journal-week-switch" :disabled="loadingSwitch" @click="goWeek(1)">След. →</button>
      </div>
      <div class="journal-week-sub-row">
        <p class="journal-week-sub">Начало недели: {{ mondayKey }}</p>
        <button
          type="button"
          class="journal-week-current-link"
          :disabled="loadingSwitch || isCurrentWeek"
          @click="goToCurrentWeek"
        >
          К текущей неделе
        </button>
      </div>
    </header>

    <p v-if="!props.isAuthenticated" class="journal-week-hint">Войдите в аккаунт, чтобы вести недельный план.</p>
    <p v-else-if="loading" class="journal-week-hint">Загрузка недельного плана…</p>
    <p v-if="globalError" class="journal-week-error" role="alert">{{ globalError }}</p>

    <div class="journal-week-list" :aria-busy="loadingSwitch || Boolean(savingDayKey) || savingSummary">
      <article v-for="day in days" :key="day.dayKey" class="journal-week-day">
        <div class="journal-week-day-head">
          <div class="journal-week-day-caption">
            <h3 class="journal-week-day-title">{{ dayLabels[day.dayId] }}</h3>
            <p class="journal-week-day-date">{{ formatDayKey(day.dayKey) }}</p>
          </div>
          <button
            type="button"
            class="journal-week-day-lock"
            :class="{ 'journal-week-day-lock--active': day.locked }"
            :disabled="!canEdit || savingDayKey === day.dayKey"
            @click="toggleLock(day)"
          >
            {{ day.locked ? 'Редактировать' : 'Зафиксировать' }}
          </button>
        </div>
        <textarea
          :value="day.value"
          class="journal-week-day-text"
          rows="4"
          :disabled="!canEdit || day.locked || savingDayKey === day.dayKey"
          :placeholder="`План на ${dayLabels[day.dayId].toLowerCase()}…`"
          @input="onDayInput(day.dayKey, $event)"
        />
      </article>

      <article class="journal-week-day journal-week-summary">
        <div class="journal-week-summary-head">
          <div class="journal-week-summary-caption">
            <h3 class="journal-week-summary-title">Неделя #{{ weekNumber }}</h3>
            <p class="journal-week-day-date journal-week-summary-date-spacer" aria-hidden="true">&nbsp;</p>
          </div>
          <button
            type="button"
            class="journal-week-day-lock"
            :class="{ 'journal-week-day-lock--active': weekSummary.locked }"
            :disabled="!canEdit || savingSummary"
            @click="onToggleSummaryLock"
          >
            {{ weekSummary.locked ? 'Редактировать' : 'Зафиксировать' }}
          </button>
        </div>
        <textarea
          :value="weekSummary.value"
          class="journal-week-day-text journal-week-summary-text"
          rows="4"
          :disabled="!canEdit || weekSummary.locked || savingSummary"
          placeholder="План на неделю целиком…"
          @input="onSummaryInput"
        />
      </article>
    </div>
  </div>
</template>

<style scoped>
.journal-week {
  padding: 0.85rem 1rem 1.1rem;
}

.journal-week-head {
  margin-bottom: 0.8rem;
}

.journal-week-controls {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.6rem;
}

.journal-week-title {
  margin: 0;
  font-size: 0.97rem;
  font-weight: 600;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--color-text);
}

.journal-week-switch {
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

.journal-week-switch:hover:not(:disabled) {
  color: var(--color-text);
  border-color: var(--color-accent);
}

.journal-week-switch:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.journal-week-sub {
  margin: 0;
  font-size: 0.8rem;
  letter-spacing: 0.06em;
  color: var(--color-text-secondary);
}

.journal-week-sub-row {
  margin-top: 0.3rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.6rem;
}

.journal-week-current-link {
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

.journal-week-current-link:hover:not(:disabled) {
  color: var(--color-text);
  text-decoration: underline;
  text-underline-offset: 0.12rem;
}

.journal-week-current-link:disabled {
  opacity: 0.45;
  cursor: default;
}

.journal-week-hint {
  margin: 0.4rem 0 0.7rem;
  font-size: 0.84rem;
  color: var(--color-text-secondary);
}

.journal-week-error {
  margin: 0.4rem 0 0.7rem;
  font-size: 0.82rem;
  color: var(--color-accent-hover);
}

.journal-week-list {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.7rem;
}

.journal-week-summary {
  background: linear-gradient(180deg, rgba(22, 22, 22, 0.76) 0%, rgba(0, 0, 0, 0.5) 100%);
  border-color: var(--color-border-light);
}

.journal-week-summary-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 0.6rem;
  margin-bottom: 0.45rem;
}

.journal-week-summary-caption {
  min-width: 0;
}

.journal-week-summary-title {
  margin: 0;
  font-size: 0.74rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.11em;
  color: var(--color-text);
}

.journal-week-summary-date-spacer {
  visibility: hidden;
}

.journal-week-summary-text {
  min-height: 7.2rem;
  border-color: var(--color-border-light);
}

.journal-week-day {
  border: 1px solid var(--color-border);
  background: linear-gradient(180deg, rgba(10, 10, 10, 0.72) 0%, rgba(0, 0, 0, 0.45) 100%);
  border-left: 2px solid var(--color-accent);
  padding: 0.6rem;
  border-radius: 2px;
}

.journal-week-day-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 0.5rem;
  margin-bottom: 0.45rem;
}

.journal-week-day-caption {
  min-width: 0;
}

.journal-week-day-title {
  margin: 0;
  font-size: 0.88rem;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--color-text);
}

.journal-week-day-date {
  margin: 0.24rem 0 0;
  font-size: 0.78rem;
  letter-spacing: 0.06em;
  color: var(--color-text-secondary);
}

.journal-week-day-lock {
  margin: 0;
  padding: 0.25rem 0.45rem;
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

.journal-week-day-lock:hover:not(:disabled) {
  color: var(--color-text);
  border-color: var(--color-accent);
}

.journal-week-day-lock--active {
  color: var(--color-text);
  background: var(--color-accent-light);
  border-color: var(--color-accent);
  box-shadow: 0 0 8px var(--color-accent-medium);
}

.journal-week-day-lock:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.journal-week-day-text {
  width: 100%;
  min-height: 6.2rem;
  box-sizing: border-box;
  resize: vertical;
  margin: 0;
  padding: 0.55rem 0.6rem;
  font-family: inherit;
  font-size: 0.88rem;
  line-height: 1.45;
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

.journal-week-day-text:disabled {
  opacity: 0.75;
}

@media (max-width: 900px) {
  .journal-week-list {
    grid-template-columns: 1fr;
  }
}
</style>