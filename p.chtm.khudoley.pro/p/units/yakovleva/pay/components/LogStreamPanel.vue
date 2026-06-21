<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { createComponentLogger, type LogEntry } from '../shared/logger'
import { getRecentLogsRoute } from '../api/admin/logs/recent'
import { getLogsBeforeRoute } from '../api/admin/logs/before'

const log = createComponentLogger('LogStreamPanel')

declare const ctx: app.Ctx

const props = withDefaults(
  defineProps<{
    enableExpandAll?: boolean
  }>(),
  {
    enableExpandAll: true
  }
)

const MAX_LOG_ENTRIES = 500
const LOG_FETCH_LIMIT = 50

const logEntries = ref<LogEntry[]>([])
const logsOutputRef = ref<HTMLElement | null>(null)
const logsLoading = ref(false)
const logsError = ref('')
const logsHasMore = ref(false)
const oldestLogTimestamp = ref<number | null>(null)
const selectedLogStream = ref<'all' | 'info' | 'warn' | 'error'>('all')
const logsRequestId = ref(0)

const LOG_STREAM_TO_SEVERITIES: Record<'all' | 'info' | 'warn' | 'error', number[]> = {
  all: [0, 1, 2, 3, 4, 5, 6, 7],
  info: [5, 6, 7],
  warn: [4],
  error: [0, 1, 2, 3]
}

const LOG_STREAM_LABELS: Record<'all' | 'info' | 'warn' | 'error', string> = {
  all: 'Весь поток',
  info: 'Инфо',
  warn: 'Предупреждения',
  error: 'Ошибки'
}

const LOG_STREAM_KEYS: Array<'all' | 'info' | 'warn' | 'error'> = ['all', 'info', 'warn', 'error']

const selectedLogStreamLabel = computed(() => LOG_STREAM_LABELS[selectedLogStream.value])
const currentLogCount = computed(() => logEntries.value.length)

type LogDisplayItem =
  | { type: 'log'; entry: LogEntry; formattedTime: string; formattedMessage: string }
  | { type: 'divider'; date: string }

function getSeveritiesQueryForStream(
  stream: 'all' | 'info' | 'warn' | 'error'
): string | undefined {
  if (stream === 'all') return undefined
  return LOG_STREAM_TO_SEVERITIES[stream].join(',')
}

function doesEntryMatchSelectedStream(entry: LogEntry): boolean {
  return LOG_STREAM_TO_SEVERITIES[selectedLogStream.value].includes(entry.severity)
}

function updateOldestTimestamp(entries: Array<LogEntry & { id?: string }>) {
  const first = entries[0]
  if (!first) return
  const oldest = entries.reduce(
    (min, item) => (item.timestamp < min ? item.timestamp : min),
    first.timestamp
  )
  oldestLogTimestamp.value = oldest
}

function formatLogTime(timestamp: number): string {
  const d = new Date(timestamp)
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}.${String(d.getMilliseconds()).padStart(3, '0')}`
}

function formatLogMessage(e: LogEntry): string {
  return e.args
    .map((a) => (typeof a === 'object' && a !== null ? JSON.stringify(a) : String(a)))
    .join(' ')
}

function formatDateDivider(timestamp: number): string {
  const d = new Date(timestamp)
  const day = String(d.getDate()).padStart(2, '0')
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const year = d.getFullYear()
  return `${day}.${month}.${year}`
}

function getDateKey(timestamp: number): string {
  const d = new Date(timestamp)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function trimOldLogs() {
  if (logEntries.value.length > MAX_LOG_ENTRIES) {
    const sorted = [...logEntries.value].sort((a, b) => b.timestamp - a.timestamp)
    logEntries.value = sorted.slice(0, MAX_LOG_ENTRIES)
  }
}

function pushEntry(entry: LogEntry) {
  if (!doesEntryMatchSelectedStream(entry)) return
  logEntries.value.push(entry)
  trimOldLogs()
}

const displayedLogs = computed<LogDisplayItem[]>(() => {
  if (!logEntries.value.length) return []
  const sorted = [...logEntries.value].sort((a, b) => b.timestamp - a.timestamp)
  const items: LogDisplayItem[] = []
  let lastDateKey = ''
  for (let i = 0; i < sorted.length; i++) {
    const entry = sorted[i]
    if (!entry) continue
    const dateKey = getDateKey(entry.timestamp)
    if (i > 0 && dateKey !== lastDateKey) {
      items.push({ type: 'divider', date: formatDateDivider(entry.timestamp) })
    }
    lastDateKey = dateKey
    items.push({
      type: 'log',
      entry,
      formattedTime: formatLogTime(entry.timestamp),
      formattedMessage: formatLogMessage(entry)
    })
  }
  return items
})

const expandedLogRows = ref<Record<number, boolean>>({})
const toggleLogRow = (idx: number) => {
  expandedLogRows.value[idx] = !expandedLogRows.value[idx]
}

const displayedLogRowIndices = computed(() => {
  const items = displayedLogs.value
  const indices: number[] = []
  for (let i = 0; i < items.length; i++) {
    if (items[i]?.type === 'log') indices.push(i)
  }
  return indices
})

const hasAnyExpandedLogRow = computed(() => {
  const exp = expandedLogRows.value
  for (const idx of displayedLogRowIndices.value) {
    if (exp[idx]) return true
  }
  return false
})

const toggleExpandCollapseAllLogs = () => {
  const indices = displayedLogRowIndices.value
  if (!indices.length) return
  if (hasAnyExpandedLogRow.value) {
    expandedLogRows.value = {}
  } else {
    const next: Record<number, boolean> = {}
    for (const idx of indices) {
      next[idx] = true
    }
    expandedLogRows.value = next
  }
}

const toggleLogFilter = (stream: 'all' | 'info' | 'warn' | 'error') => {
  if (selectedLogStream.value === stream) return
  selectedLogStream.value = stream
  log.info('Поток логов переключён', stream)
}

const loadRecentLogs = async () => {
  const requestId = ++logsRequestId.value
  const severities = getSeveritiesQueryForStream(selectedLogStream.value)
  const query: { limit: string; severities?: string } = { limit: String(LOG_FETCH_LIMIT) }
  if (severities) query.severities = severities

  logsLoading.value = true
  logsError.value = ''
  try {
    const res = await getRecentLogsRoute.query(query).run(ctx)
    if (requestId !== logsRequestId.value) return
    const data = res as {
      success?: boolean
      entries?: Array<LogEntry & { id: string }>
      error?: string
    }
    if (data?.success && Array.isArray(data.entries)) {
      logEntries.value = [...data.entries]
      updateOldestTimestamp(data.entries)
      logsHasMore.value = data.entries.length === LOG_FETCH_LIMIT
      log.info('Последние логи загружены', { count: data.entries.length })
    } else {
      logsError.value = data?.error || 'Ошибка загрузки логов'
      log.error('Ошибка загрузки логов', logsError.value)
    }
  } catch (e) {
    if (requestId !== logsRequestId.value) return
    logsError.value = (e as Error)?.message || 'Ошибка сети'
    log.error('Ошибка загрузки логов', e)
  } finally {
    if (requestId !== logsRequestId.value) return
    logsLoading.value = false
  }
}

const loadMoreLogs = async () => {
  if (!oldestLogTimestamp.value) {
    log.warning('Попытка загрузить больше логов без oldestLogTimestamp')
    return
  }

  const requestId = ++logsRequestId.value
  const severities = getSeveritiesQueryForStream(selectedLogStream.value)
  const query: { beforeTimestamp: string; limit: string; severities?: string } = {
    beforeTimestamp: String(oldestLogTimestamp.value),
    limit: String(LOG_FETCH_LIMIT)
  }
  if (severities) query.severities = severities

  logsLoading.value = true
  logsError.value = ''
  try {
    const res = await getLogsBeforeRoute.query(query).run(ctx)
    if (requestId !== logsRequestId.value) return
    const data = res as {
      success?: boolean
      entries?: Array<LogEntry & { id: string }>
      hasMore?: boolean
      error?: string
    }
    if (data?.success && Array.isArray(data.entries)) {
      logEntries.value = [...logEntries.value, ...data.entries]
      updateOldestTimestamp(data.entries)
      logsHasMore.value = data.hasMore ?? data.entries.length === LOG_FETCH_LIMIT
      log.info('Дополнительные логи загружены', { count: data.entries.length })
    } else {
      logsError.value = data?.error || 'Ошибка загрузки логов'
      log.error('Ошибка загрузки дополнительных логов', logsError.value)
    }
  } catch (e) {
    if (requestId !== logsRequestId.value) return
    logsError.value = (e as Error)?.message || 'Ошибка сети'
    log.error('Ошибка загрузки дополнительных логов', e)
  } finally {
    if (requestId !== logsRequestId.value) return
    logsLoading.value = false
  }
}

const clearLogs = () => {
  logsRequestId.value += 1
  logEntries.value = []
  oldestLogTimestamp.value = Date.now()
  logsHasMore.value = true
  logsError.value = ''
  // Прерванный по requestId in-flight запрос выходит из finally раньше и не сбрасывает
  // флаг — сбрасываем его здесь, чтобы индикатор загрузки пропал сразу.
  logsLoading.value = false
  expandedLogRows.value = {}
  log.debug('Логи очищены: монитор подготовлен к новому потоку')
}

// Смена фильтра сбрасывает список и сама инициирует загрузку — поведение остаётся внутри панели.
watch(selectedLogStream, () => {
  logsRequestId.value += 1
  logEntries.value = []
  oldestLogTimestamp.value = null
  logsHasMore.value = false
  logsError.value = ''
  expandedLogRows.value = {}
  loadRecentLogs()
})

// `logsLoading` экспонируем, чтобы родитель (Admin) мог отразить состояние загрузки
// в своём статус-пилле, не дублируя само состояние.
defineExpose({ pushEntry, loadRecent: loadRecentLogs, logsLoading })
</script>

<template>
  <section class="lsp-card">
    <div class="lsp-card-hd">
      <h2><i class="fas fa-stream lsp-icon-hd"></i> Монитор логов</h2>
      <span class="lsp-log-ct">{{ currentLogCount }} зап.</span>
    </div>
    <div class="lsp-log-filters">
      <button
        v-for="s in LOG_STREAM_KEYS"
        :key="s"
        type="button"
        class="lsp-flt"
        :class="{ active: selectedLogStream === s }"
        @click="toggleLogFilter(s)"
      >
        {{ LOG_STREAM_LABELS[s] }}
      </button>
    </div>
    <div v-if="props.enableExpandAll && displayedLogRowIndices.length" class="lsp-log-toggle-row">
      <button
        type="button"
        class="lsp-btn lsp-btn--toggle-all"
        @click="toggleExpandCollapseAllLogs"
      >
        <i :class="hasAnyExpandedLogRow ? 'fas fa-compress-alt' : 'fas fa-expand-alt'"></i>
        {{ hasAnyExpandedLogRow ? 'Свернуть все' : 'Развернуть все' }}
      </button>
    </div>
    <div class="lsp-log-out custom-scrollbar" ref="logsOutputRef">
      <div v-if="!displayedLogs.length" class="lsp-log-empty">
        <i
          class="fas fa-inbox"
          style="font-size: 1.2rem; display: block; margin-bottom: 0.5rem; opacity: 0.4"
        ></i>
        Поток «{{ selectedLogStreamLabel }}» пуст
      </div>
      <template v-for="(item, index) in displayedLogs" :key="index">
        <div v-if="item.type === 'divider'" class="lsp-log-div">
          <span>{{ item.date }}</span>
        </div>
        <div
          v-else
          class="lsp-log-row"
          :class="{ expanded: expandedLogRows[index] }"
          @click="toggleLogRow(index)"
        >
          <span class="lsp-log-t">{{ item.formattedTime }}</span>
          <span class="lsp-log-l" :class="`lvl-${item.entry.level}`"
            >[{{ item.entry.level.toUpperCase() }}]</span
          >
          <span class="lsp-log-m">{{ item.formattedMessage }}</span>
        </div>
      </template>
    </div>
    <div class="lsp-log-ft">
      <span v-if="logsLoading" class="lsp-log-sync">
        <i class="fas fa-circle-notch fa-spin"></i> Загрузка...
      </span>
      <p v-if="logsError" class="lsp-err">
        <i class="fas fa-exclamation-circle"></i> {{ logsError }}
      </p>
      <div class="lsp-log-btns">
        <button
          v-if="logsHasMore && !logsLoading"
          type="button"
          class="lsp-btn"
          @click="loadMoreLogs"
        >
          <i class="fas fa-chevron-down"></i> Ещё 50
        </button>
        <button type="button" class="lsp-btn lsp-btn--danger" @click="clearLogs">
          <i class="fas fa-trash-alt"></i> Очистить
        </button>
      </div>
    </div>
  </section>
</template>
