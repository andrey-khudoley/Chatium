<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { computeJournalDayKeyLocal } from '../../lib/journal-day-key'

type DaySegmentId = 'night' | 'morning' | 'day' | 'evening'
type DaySegmentState = { value: string; locked: boolean }
type JournalDayEntryDto = {
  dayKey: string
  night: DaySegmentState
  morning: DaySegmentState
  day: DaySegmentState
  evening: DaySegmentState
}

const props = defineProps<{
  isAuthenticated: boolean
  journalDayGetUrl: string
  journalDaySaveUrl: string
  journalDayEntryInitial: JournalDayEntryDto | null
}>()

const segmentOrder: DaySegmentId[] = ['night', 'morning', 'day', 'evening']
const segmentLabels: Record<DaySegmentId, string> = {
  night: 'Ночь',
  morning: 'Утро',
  day: 'День',
  evening: 'Вечер'
}

const dayKey = ref(computeJournalDayKeyLocal(Date.now()))
const loading = ref(false)
const saving = ref<DaySegmentId | null>(null)
const globalError = ref('')

const segments = ref<Record<DaySegmentId, DaySegmentState>>({
  night: { value: '', locked: false },
  morning: { value: '', locked: false },
  day: { value: '', locked: false },
  evening: { value: '', locked: false }
})

function applyEntry(entry: JournalDayEntryDto) {
  dayKey.value = entry.dayKey
  segments.value = {
    night: { ...entry.night },
    morning: { ...entry.morning },
    day: { ...entry.day },
    evening: { ...entry.evening }
  }
}

watch(
  () => props.journalDayEntryInitial,
  (next) => {
    if (!next) return
    applyEntry(next)
  },
  { immediate: true, deep: true }
)

async function fetchEntry() {
  if (!props.isAuthenticated || !props.journalDayGetUrl) return
  loading.value = true
  globalError.value = ''
  const localKey = computeJournalDayKeyLocal(Date.now())
  try {
    const url = new URL(props.journalDayGetUrl, window.location.origin)
    url.searchParams.set('dayKey', localKey)
    const r = await fetch(url.pathname + url.search, { credentials: 'include' })
    const j = (await r.json()) as { success?: boolean; entry?: JournalDayEntryDto; error?: string }
    if (!j.success || !j.entry) {
      globalError.value = j.error ?? 'Не удалось загрузить запись дня'
      return
    }
    applyEntry(j.entry)
  } catch (e) {
    globalError.value = String(e)
  } finally {
    loading.value = false
  }
}

async function saveSegment(segmentId: DaySegmentId, locked: boolean) {
  if (!props.journalDaySaveUrl) return
  saving.value = segmentId
  globalError.value = ''
  const localKey = computeJournalDayKeyLocal(Date.now())
  try {
    const payload = {
      dayKey: localKey,
      segment: segmentId,
      value: segments.value[segmentId].value,
      locked
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
    applyEntry(j.entry)
  } catch (e) {
    globalError.value = String(e)
  } finally {
    saving.value = null
  }
}

function onToggleLock(segmentId: DaySegmentId) {
  const nextLocked = !segments.value[segmentId].locked
  void saveSegment(segmentId, nextLocked)
}

const canEdit = computed(() => props.isAuthenticated && !loading.value)

onMounted(() => {
  void fetchEntry()
})
</script>

<template>
  <div class="journal-day-dev">
    <header class="journal-day-dev-head">
      <h2 class="journal-day-dev-title">Дневной фокус</h2>
      <p class="journal-day-dev-sub">Ключ дня: {{ dayKey }} (обновление периода в 05:00 по локальному времени)</p>
    </header>

    <p v-if="!props.isAuthenticated" class="journal-day-dev-hint">Войдите в аккаунт, чтобы вести дневные заметки.</p>
    <p v-else-if="loading" class="journal-day-dev-hint">Загрузка данных дня…</p>
    <p v-if="globalError" class="journal-day-dev-error" role="alert">{{ globalError }}</p>

    <div class="journal-day-dev-grid" :aria-busy="saving !== null">
      <article v-for="segmentId in segmentOrder" :key="segmentId" class="journal-day-segment">
        <div class="journal-day-segment-head">
          <h3 class="journal-day-segment-title">{{ segmentLabels[segmentId] }}</h3>
          <button
            type="button"
            class="journal-day-segment-lock"
            :class="{ 'journal-day-segment-lock--active': segments[segmentId].locked }"
            :disabled="!canEdit || saving === segmentId"
            @click="onToggleLock(segmentId)"
          >
            {{ segments[segmentId].locked ? 'Разблокировать' : 'Зафиксировать' }}
          </button>
        </div>
        <textarea
          v-model="segments[segmentId].value"
          class="journal-day-segment-text"
          :disabled="!canEdit || segments[segmentId].locked || saving === segmentId"
          :placeholder="`Запись: ${segmentLabels[segmentId].toLowerCase()}…`"
          rows="6"
        />
      </article>
    </div>
  </div>
</template>

<style scoped>
.journal-day-dev {
  padding: 0.85rem 1rem 1.1rem;
}

.journal-day-dev-head {
  margin-bottom: 0.8rem;
}

.journal-day-dev-title {
  margin: 0;
  font-size: 0.97rem;
  font-weight: 600;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--color-text);
}

.journal-day-dev-sub {
  margin: 0.3rem 0 0;
  font-size: 0.8rem;
  letter-spacing: 0.06em;
  color: var(--color-text-secondary);
}

.journal-day-dev-hint {
  margin: 0.4rem 0 0.7rem;
  font-size: 0.84rem;
  color: var(--color-text-secondary);
}

.journal-day-dev-error {
  margin: 0.4rem 0 0.7rem;
  font-size: 0.82rem;
  color: var(--color-accent-hover);
}

.journal-day-dev-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.7rem;
}

.journal-day-segment {
  border: 1px solid var(--color-border);
  background: linear-gradient(180deg, rgba(10, 10, 10, 0.72) 0%, rgba(0, 0, 0, 0.45) 100%);
  border-left: 2px solid var(--color-accent);
  padding: 0.6rem;
  border-radius: 2px;
}

.journal-day-segment-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  margin-bottom: 0.45rem;
}

.journal-day-segment-title {
  margin: 0;
  font-size: 0.88rem;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--color-text);
}

.journal-day-segment-lock {
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

.journal-day-segment-lock:hover:not(:disabled) {
  color: var(--color-text);
  border-color: var(--color-accent);
}

.journal-day-segment-lock--active {
  color: var(--color-text);
  background: var(--color-accent-light);
  border-color: var(--color-accent);
  box-shadow: 0 0 8px var(--color-accent-medium);
}

.journal-day-segment-lock:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.journal-day-segment-text {
  width: 100%;
  min-height: 7.2rem;
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

.journal-day-segment-text:disabled {
  opacity: 0.75;
}

@media (max-width: 900px) {
  .journal-day-dev-grid {
    grid-template-columns: 1fr;
  }
}
</style>
