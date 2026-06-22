// @shared
/**
 * Composable монитора логов: состояние, загрузка истории и подписка на поток
 * логов по WebSocket. Логика идентична для AdminPage и TestsPage; различия —
 * через опции:
 *  - onEntry         — вызывается на каждую входящую запись (счётчики дашборда);
 *  - dedupSocketEcho — пропускать echo browser-sink записей из сокета;
 *  - trackConnection — поддерживать wsConnected/wsInitialized для индикатора;
 *  - encodedLogsSocketId — без него поток по сокету не поднимается.
 *
 * Чистые помощники — в logStreamUtils, lifecycle сокета — в logStreamSocket.
 * Презентация остаётся в компонентах-вью страниц (внешний вид без изменений).
 */
import { ref, computed, onBeforeUnmount, watch } from 'vue'
import { getOrCreateBrowserSocketClient } from '@app/socket'
import { createComponentLogger, type LogEntry } from './logger'
import { getRecentLogsRoute } from '../api/admin/logs/recent'
import { getLogsBeforeRoute } from '../api/admin/logs/before'
import {
  type LogStreamKey,
  LOG_STREAM_LABELS,
  LOG_STREAM_KEYS,
  getSeveritiesQueryForStream,
  entryMatchesStream,
  isBrowserSinkEchoFromSocket,
  buildDisplayedLogs
} from './logStreamUtils'
import { attachLogsSocketLifecycle } from './logStreamSocket'

export type { LogStreamKey, LogDisplayItem } from './logStreamUtils'

declare const ctx: app.Ctx

export interface UseLogStreamOptions {
  /** Зашифрованный id сокета логов; без него поток по WebSocket не поднимается. */
  encodedLogsSocketId?: string
  /** Вызывается на каждую входящую запись (локальную и из сокета) — для счётчиков. */
  onEntry?: (entry: LogEntry) => void
  /** Пропускать echo записей browser-sink, пришедших обратно из сокета. */
  dedupSocketEcho?: boolean
  /** Поддерживать состояние соединения (wsConnected/wsInitialized) для индикатора. */
  trackConnection?: boolean
  /** Имя логгера компонента. */
  loggerName?: string
}

const MAX_LOG_ENTRIES = 500
const LOG_FETCH_LIMIT = 50

export function useLogStream(options: UseLogStreamOptions) {
  const log = createComponentLogger(options.loggerName ?? 'LogStream')

  const logEntries = ref<LogEntry[]>([])
  const logsLoading = ref(false)
  const logsError = ref('')
  const logsHasMore = ref(false)
  const oldestLogTimestamp = ref<number | null>(null)
  const logsRequestId = ref(0)
  const selectedLogStream = ref<LogStreamKey>('all')
  const expandedLogRows = ref<Record<number, boolean>>({})

  const wsConnected = ref(false)
  const wsInitialized = ref(false)

  let logsSocketSubscription: { unsubscribe?: () => void } | null = null
  let logsSocketUnsubscribe: (() => void) | null = null
  let logsSocketLifecycleCleanup: (() => void) | null = null

  const selectedLogStreamLabel = computed(() => LOG_STREAM_LABELS[selectedLogStream.value])
  const currentLogCount = computed(() => logEntries.value.length)
  const displayedLogs = computed(() => buildDisplayedLogs(logEntries.value))

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

  function trimOldLogs() {
    if (logEntries.value.length > MAX_LOG_ENTRIES) {
      const sorted = [...logEntries.value].sort((a, b) => b.timestamp - a.timestamp)
      logEntries.value = sorted.slice(0, MAX_LOG_ENTRIES)
    }
  }

  function updateOldestTimestamp(entries: Array<LogEntry & { id?: string }>) {
    const first = entries[0]
    if (!first) return
    oldestLogTimestamp.value = entries.reduce(
      (min, item) => (item.timestamp < min ? item.timestamp : min),
      first.timestamp
    )
  }

  function pushVisibleLogEntry(entry: LogEntry) {
    if (!entryMatchesStream(entry, selectedLogStream.value)) return
    logEntries.value.push(entry)
    trimOldLogs()
  }

  const toggleExpandCollapseAllLogs = () => {
    const indices = displayedLogRowIndices.value
    if (!indices.length) return
    if (hasAnyExpandedLogRow.value) {
      expandedLogRows.value = {}
    } else {
      const next: Record<number, boolean> = {}
      for (const idx of indices) next[idx] = true
      expandedLogRows.value = next
    }
  }

  const toggleLogFilter = (stream: LogStreamKey) => {
    if (selectedLogStream.value === stream) return
    selectedLogStream.value = stream
    log.info('Поток логов переключён', stream)
  }

  const toggleLogRow = (idx: number) => {
    expandedLogRows.value[idx] = !expandedLogRows.value[idx]
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
    expandedLogRows.value = {}
    log.debug('Логи очищены: монитор подготовлен к новому потоку')
  }

  /** Локальная запись из setLogSink: счётчики + отображение. */
  function ingestLocalEntry(entry: LogEntry) {
    options.onEntry?.(entry)
    pushVisibleLogEntry(entry)
  }

  function ingestSocketEntry(entry: LogEntry) {
    if (options.dedupSocketEcho && isBrowserSinkEchoFromSocket(entry)) return
    options.onEntry?.(entry)
    pushVisibleLogEntry(entry)
  }

  function detachLogsSocketLifecycle() {
    if (logsSocketLifecycleCleanup) {
      try {
        logsSocketLifecycleCleanup()
      } catch {
        /* ignore */
      }
      logsSocketLifecycleCleanup = null
    }
  }

  async function setupLogsWebSocket() {
    if (!options.encodedLogsSocketId) {
      wsConnected.value = false
      wsInitialized.value = true
      return
    }
    if (logsSocketUnsubscribe) {
      try {
        logsSocketUnsubscribe()
      } catch {
        /* ignore */
      }
      logsSocketUnsubscribe = null
    }
    if (logsSocketSubscription?.unsubscribe) {
      try {
        logsSocketSubscription.unsubscribe()
      } catch {
        /* ignore */
      }
      logsSocketSubscription = null
    }
    detachLogsSocketLifecycle()
    try {
      const socketClient = await getOrCreateBrowserSocketClient()
      const subscription = socketClient.subscribeToData(options.encodedLogsSocketId)
      logsSocketSubscription = subscription as typeof logsSocketSubscription
      if (options.trackConnection) {
        logsSocketLifecycleCleanup = attachLogsSocketLifecycle(socketClient, subscription, () => {
          wsConnected.value = false
        })
      }
      logsSocketUnsubscribe = subscription.listen((data: { type?: string; data?: LogEntry }) => {
        if (data?.type === 'new-log' && data.data) {
          ingestSocketEntry(data.data as LogEntry)
        }
      })
      wsConnected.value = true
    } catch (err) {
      wsConnected.value = false
      log.error('Не удалось подписаться на логи по WebSocket', err)
    } finally {
      wsInitialized.value = true
    }
  }

  function onBrowserOffline() {
    wsConnected.value = false
  }

  function onBrowserOnline() {
    void setupLogsWebSocket()
  }

  function onVisibilityForLogsSocket() {
    if (document.visibilityState !== 'visible' || !options.encodedLogsSocketId) return
    if (!wsConnected.value) void setupLogsWebSocket()
  }

  /** Поднять поток: подписка по сокету, слушатели сети и первичная загрузка истории. */
  function start() {
    if (!options.encodedLogsSocketId) return
    void setupLogsWebSocket()
    window.addEventListener('offline', onBrowserOffline)
    window.addEventListener('online', onBrowserOnline)
    document.addEventListener('visibilitychange', onVisibilityForLogsSocket)
    loadRecentLogs()
  }

  function stop() {
    window.removeEventListener('offline', onBrowserOffline)
    window.removeEventListener('online', onBrowserOnline)
    document.removeEventListener('visibilitychange', onVisibilityForLogsSocket)
    detachLogsSocketLifecycle()
    if (logsSocketUnsubscribe) {
      logsSocketUnsubscribe()
      logsSocketUnsubscribe = null
    }
    if (logsSocketSubscription?.unsubscribe) {
      try {
        logsSocketSubscription.unsubscribe()
      } catch {
        /* ignore */
      }
      logsSocketSubscription = null
    }
  }

  watch(selectedLogStream, () => {
    logsRequestId.value += 1
    logEntries.value = []
    oldestLogTimestamp.value = null
    logsHasMore.value = false
    logsError.value = ''
    expandedLogRows.value = {}
    if (options.encodedLogsSocketId) loadRecentLogs()
  })

  onBeforeUnmount(stop)

  return {
    logEntries,
    logsLoading,
    logsError,
    logsHasMore,
    selectedLogStream,
    expandedLogRows,
    wsConnected,
    wsInitialized,
    selectedLogStreamLabel,
    currentLogCount,
    displayedLogs,
    hasAnyExpandedLogRow,
    LOG_STREAM_KEYS,
    LOG_STREAM_LABELS,
    loadRecentLogs,
    loadMoreLogs,
    clearLogs,
    toggleLogFilter,
    toggleLogRow,
    toggleExpandCollapseAllLogs,
    ingestLocalEntry,
    start,
    stop
  }
}
