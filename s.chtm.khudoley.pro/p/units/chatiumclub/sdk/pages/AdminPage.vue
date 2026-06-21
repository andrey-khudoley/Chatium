<script setup lang="ts">
import { onMounted, onBeforeUnmount, onUnmounted, ref, computed, watch } from 'vue'
import { getOrCreateBrowserSocketClient } from '@app/socket'
import Header from '../components/Header.vue'
import GlobalGlitch from '../components/GlobalGlitch.vue'
import AppFooter from '../components/AppFooter.vue'
import { getSettingRoute } from '../api/settings/get'
import { saveSettingRoute } from '../api/settings/save'
import { createComponentLogger, setLogSink, type LogEntry } from '../shared/logger'
import { createBrowserRemoteLogger } from '../shared/browserRemoteLogger'
import { postBrowserLogsRoute } from '../api/logger/browser'
import { getRecentLogsRoute } from '../api/admin/logs/recent'
import { getLogsBeforeRoute } from '../api/admin/logs/before'
import { getDashboardCountsRoute } from '../api/admin/dashboard/counts'
import { resetDashboardRoute } from '../api/admin/dashboard/reset'
import { SDK_GATEWAY_SETTING_KEYS } from '../shared/sdkSettingKeys'

const log = createComponentLogger('AdminPage')

declare const ctx: app.Ctx

declare global {
  interface Window {
    hideAppLoader?: () => void
    bootLoaderComplete?: boolean
  }
}

const props = defineProps<{
  projectTitle: string
  indexUrl: string
  profileUrl: string
  testsUrl?: string
  loginUrl: string
  isAuthenticated: boolean
  isAdmin?: boolean
  adminUrl?: string
  encodedLogsSocketId?: string
}>()

const bootLoaderDone = ref(false)
const projectName = ref(props.projectTitle.split(' / ')[0] || props.projectTitle)
const lastSavedProjectName = ref(props.projectTitle.split(' / ')[0] || props.projectTitle)
const projectNameError = ref('')
const projectNameLoading = ref(false)
const projectNameDebounceTimer = { id: null as ReturnType<typeof setTimeout> | null }
const projectNameSaveStatus = ref<'saved' | 'error' | null>(null)
const projectNameStatusTimeout = { id: null as ReturnType<typeof setTimeout> | null }

const logLevel = ref<'debug' | 'info' | 'warn' | 'error' | 'disable'>('info')
const logLevelError = ref('')
const logLevelSaveStatus = ref<'saved' | 'error' | null>(null)
const logLevelStatusTimeout = { id: null as ReturnType<typeof setTimeout> | null }

/** Настройки тонкого клиента для HTTP к gateway (Heap key-value). */
const gatewayUrlInput = ref('')
const gcSchoolHostInput = ref('')
const gcSchoolApiKeyInput = ref('')
const gatewayUrlError = ref('')
const gcSchoolHostError = ref('')
const gcSchoolApiKeyError = ref('')
const gatewayUrlSaveStatus = ref<'saved' | 'error' | null>(null)
const gcSchoolHostSaveStatus = ref<'saved' | 'error' | null>(null)
const gcSchoolApiKeySaveStatus = ref<'saved' | 'error' | null>(null)
const gatewayUrlStatusTimeout = { id: null as ReturnType<typeof setTimeout> | null }
const gcSchoolHostStatusTimeout = { id: null as ReturnType<typeof setTimeout> | null }
const gcSchoolApiKeyStatusTimeout = { id: null as ReturnType<typeof setTimeout> | null }
const gatewayUrlSaving = ref(false)
const gcSchoolHostSaving = ref(false)
const gcSchoolApiKeySaving = ref(false)

const SAVE_STATUS_DURATION_MS = 1500
const INPUT_DEBOUNCE_MS = 300

function showSaveStatus(
  statusRef: { value: 'saved' | 'error' | null },
  timeoutHolder: { id: ReturnType<typeof setTimeout> | null },
  status: 'saved' | 'error'
) {
  if (timeoutHolder.id) clearTimeout(timeoutHolder.id)
  statusRef.value = status
  timeoutHolder.id = setTimeout(() => {
    statusRef.value = null
    timeoutHolder.id = null
  }, SAVE_STATUS_DURATION_MS)
}
const errorCount = ref(0)
const warnCount = ref(0)
const dashboardResetAt = ref(0)

let browserRemoteLogger: ReturnType<typeof createBrowserRemoteLogger> | null = null

const MAX_LOG_ENTRIES = 500
const logEntries = ref<LogEntry[]>([])
let logsSocketSubscription: any = null
let logsSocketLifecycleCleanup: (() => void) | null = null
const logsOutputRef = ref<HTMLElement | null>(null)

/** Поток логов по WebSocket: подключён / нет канала / офлайн (ошибка, сеть или разрыв сокета). */
const logsWsConnected = ref(false)
/** Первая попытка подписки завершилась — до этого не показываем OFFLINE, чтобы не мигать при загрузке. */
const logsWsInitialized = ref(false)

const encodedLogsSocketOk = computed(() => Boolean(props.encodedLogsSocketId))

const streamPillLabel = computed(() => {
  if (!encodedLogsSocketOk.value) return 'LOGS'
  if (!logsWsInitialized.value) return '···'
  return logsWsConnected.value ? 'LIVE' : 'OFFLINE'
})

const streamPillAriaLabel = computed(() => {
  if (!encodedLogsSocketOk.value) return 'Поток логов без канала WebSocket'
  if (!logsWsInitialized.value) return 'Подключение WebSocket для логов'
  return logsWsConnected.value
    ? 'Поток логов в реальном времени, WebSocket подключён'
    : 'WebSocket для логов недоступен'
})

const logsLoading = ref(false)
const logsError = ref('')
const logsHasMore = ref(false)
const oldestLogTimestamp = ref<number | null>(null)
const selectedLogStream = ref<'all' | 'info' | 'warn' | 'error'>('all')
const logsRequestId = ref(0)
const LOG_FETCH_LIMIT = 50

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
  if (!entries.length) return
  const oldest = entries.reduce(
    (min, item) => (item.timestamp < min ? item.timestamp : min),
    entries[0].timestamp
  )
  oldestLogTimestamp.value = oldest
}

function pushVisibleLogEntry(entry: LogEntry) {
  if (!doesEntryMatchSelectedStream(entry)) return
  logEntries.value.push(entry)
  trimOldLogs()
}

const toggleLogFilter = (stream: 'all' | 'info' | 'warn' | 'error') => {
  if (selectedLogStream.value === stream) return
  selectedLogStream.value = stream
  log.info('Поток логов переключён', stream)
}

const startAnimations = () => {
  bootLoaderDone.value = true
}

const LOG_LEVEL_VALUES = ['debug', 'info', 'warn', 'error', 'disable'] as const

type LogDisplayItem =
  | { type: 'log'; entry: LogEntry; formattedTime: string; formattedMessage: string }
  | { type: 'divider'; date: string }

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
    log.debug('Обрезаны старые логи', {
      было: sorted.length,
      осталось: logEntries.value.length
    })
  }
}

const displayedLogs = computed<LogDisplayItem[]>(() => {
  if (!logEntries.value.length) return []
  const sorted = [...logEntries.value].sort((a, b) => b.timestamp - a.timestamp)

  const items: LogDisplayItem[] = []
  let lastDateKey = ''

  for (let i = 0; i < sorted.length; i++) {
    const entry = sorted[i]
    const dateKey = getDateKey(entry.timestamp)

    if (i > 0 && dateKey !== lastDateKey) {
      items.push({
        type: 'divider',
        date: formatDateDivider(entry.timestamp)
      })
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

const gatewayConfigured = computed(() => {
  return (
    gatewayUrlInput.value.trim().length > 0 &&
    gcSchoolHostInput.value.trim().length > 0 &&
    gcSchoolApiKeyInput.value.trim().length > 0
  )
})

const loadGatewaySettings = async () => {
  log.info('loadGatewaySettings entry')
  const keys = SDK_GATEWAY_SETTING_KEYS
  try {
    const loadOne = async (key: string): Promise<string> => {
      const res = await getSettingRoute.query({ key }).run(ctx)
      const data = res as { success?: boolean; value?: unknown }
      if (data?.success && typeof data.value === 'string') return data.value
      return ''
    }
    gatewayUrlInput.value = (await loadOne(keys.GATEWAY_URL)).trim()
    gcSchoolHostInput.value = (await loadOne(keys.GC_SCHOOL_HOST)).trim()
    gcSchoolApiKeyInput.value = (await loadOne(keys.GC_SCHOOL_API_KEY)).trim()
    log.info('loadGatewaySettings ok')
  } catch (e) {
    log.warning('Не удалось загрузить настройки gateway', e)
  }
}

async function saveGatewayUrl() {
  gatewayUrlError.value = ''
  gatewayUrlSaving.value = true
  try {
    const res = await saveSettingRoute.run(ctx, {
      key: SDK_GATEWAY_SETTING_KEYS.GATEWAY_URL,
      value: gatewayUrlInput.value.trim()
    })
    const data = res as { success?: boolean; error?: string; value?: unknown }
    if (data?.success === false) {
      gatewayUrlError.value = data.error || 'Ошибка сохранения'
      showSaveStatus(gatewayUrlSaveStatus, gatewayUrlStatusTimeout, 'error')
    } else {
      const saved = data?.value
      if (typeof saved === 'string') gatewayUrlInput.value = saved.trim()
      showSaveStatus(gatewayUrlSaveStatus, gatewayUrlStatusTimeout, 'saved')
    }
  } catch (e) {
    gatewayUrlError.value = (e as Error)?.message || 'Ошибка сохранения'
    showSaveStatus(gatewayUrlSaveStatus, gatewayUrlStatusTimeout, 'error')
  } finally {
    gatewayUrlSaving.value = false
  }
}

async function saveGcSchoolHost() {
  gcSchoolHostError.value = ''
  gcSchoolHostSaving.value = true
  try {
    const res = await saveSettingRoute.run(ctx, {
      key: SDK_GATEWAY_SETTING_KEYS.GC_SCHOOL_HOST,
      value: gcSchoolHostInput.value.trim()
    })
    const data = res as { success?: boolean; error?: string; value?: unknown }
    if (data?.success === false) {
      gcSchoolHostError.value = data.error || 'Ошибка сохранения'
      showSaveStatus(gcSchoolHostSaveStatus, gcSchoolHostStatusTimeout, 'error')
    } else {
      const saved = data?.value
      if (typeof saved === 'string') gcSchoolHostInput.value = saved.trim()
      showSaveStatus(gcSchoolHostSaveStatus, gcSchoolHostStatusTimeout, 'saved')
    }
  } catch (e) {
    gcSchoolHostError.value = (e as Error)?.message || 'Ошибка сохранения'
    showSaveStatus(gcSchoolHostSaveStatus, gcSchoolHostStatusTimeout, 'error')
  } finally {
    gcSchoolHostSaving.value = false
  }
}

async function saveGcSchoolApiKey() {
  gcSchoolApiKeyError.value = ''
  gcSchoolApiKeySaving.value = true
  try {
    const res = await saveSettingRoute.run(ctx, {
      key: SDK_GATEWAY_SETTING_KEYS.GC_SCHOOL_API_KEY,
      value: gcSchoolApiKeyInput.value.trim()
    })
    const data = res as { success?: boolean; error?: string; value?: unknown }
    if (data?.success === false) {
      gcSchoolApiKeyError.value = data.error || 'Ошибка сохранения'
      showSaveStatus(gcSchoolApiKeySaveStatus, gcSchoolApiKeyStatusTimeout, 'error')
    } else {
      const saved = data?.value
      if (typeof saved === 'string') gcSchoolApiKeyInput.value = saved.trim()
      showSaveStatus(gcSchoolApiKeySaveStatus, gcSchoolApiKeyStatusTimeout, 'saved')
    }
  } catch (e) {
    gcSchoolApiKeyError.value = (e as Error)?.message || 'Ошибка сохранения'
    showSaveStatus(gcSchoolApiKeySaveStatus, gcSchoolApiKeyStatusTimeout, 'error')
  } finally {
    gcSchoolApiKeySaving.value = false
  }
}

const loadProjectName = async () => {
  log.info('loadProjectName entry')
  try {
    const res = await getSettingRoute.query({ key: 'project_name' }).run(ctx)
    const data = res as { success?: boolean; value?: unknown }
    if (data?.success && typeof data.value === 'string') {
      const loaded = data.value
      projectName.value = loaded
      lastSavedProjectName.value = loaded
      log.info('loadProjectName loaded')
      log.debug('loadProjectName loaded', { value: loaded })
    } else {
      log.info('loadProjectName no value')
    }
  } catch (e) {
    log.warning('Не удалось загрузить имя проекта', e)
  }
}

watch(projectName, () => {
  if (projectNameDebounceTimer.id) clearTimeout(projectNameDebounceTimer.id)
  projectNameDebounceTimer.id = setTimeout(() => {
    projectNameDebounceTimer.id = null
    const trimmed = String(projectName.value ?? '').trim()
    if (trimmed !== lastSavedProjectName.value) {
      saveProjectName()
    }
  }, INPUT_DEBOUNCE_MS)
})

watch(selectedLogStream, () => {
  logsRequestId.value += 1
  logEntries.value = []
  oldestLogTimestamp.value = null
  logsHasMore.value = false
  logsError.value = ''
  expandedLogRows.value = {}
  loadRecentLogs()
})

const saveProjectName = async () => {
  log.info('saveProjectName entry')
  log.debug('saveProjectName entry', { name: projectName.value })
  projectNameError.value = ''
  projectNameLoading.value = true
  const prev = projectName.value
  try {
    const res = await saveSettingRoute.run(ctx, {
      key: 'project_name',
      value: projectName.value.trim()
    })
    const data = res as { success?: boolean; error?: string }
    if (data?.success === false) {
      projectNameError.value = data.error || 'Ошибка сохранения'
      projectName.value = prev
      showSaveStatus(projectNameSaveStatus, projectNameStatusTimeout, 'error')
    } else {
      lastSavedProjectName.value = projectName.value.trim()
      showSaveStatus(projectNameSaveStatus, projectNameStatusTimeout, 'saved')
    }
  } catch (e) {
    projectNameError.value = (e as Error)?.message || 'Ошибка сохранения'
    projectName.value = prev
    showSaveStatus(projectNameSaveStatus, projectNameStatusTimeout, 'error')
  } finally {
    projectNameLoading.value = false
    log.info('saveProjectName exit')
  }
}

onMounted(() => {
  log.info('Компонент смонтирован', {
    projectTitle: props.projectTitle,
    isAuthenticated: props.isAuthenticated,
    isAdmin: props.isAdmin,
    indexUrl: props.indexUrl,
    profileUrl: props.profileUrl,
    loginUrl: props.loginUrl,
    adminUrl: props.adminUrl,
    hasEncodedLogsSocketId: !!props.encodedLogsSocketId
  })

  browserRemoteLogger = createBrowserRemoteLogger({
    post: (payload) => postBrowserLogsRoute.run(ctx, payload)
  })
  browserRemoteLogger.installConsoleAndGlobalHandlers()
  log.debug('Browser remote logger initialized')

  loadProjectName()
  void loadGatewaySettings()
  loadDashboardCounts()
  if (window.hideAppLoader) {
    window.hideAppLoader()
    log.debug('hideAppLoader called')
  }
  const bootReady = !!window.bootLoaderComplete
  log.debug('Boot loader state on mount', { bootLoaderComplete: bootReady })
  if (bootReady) {
    startAnimations()
  } else {
    window.addEventListener('bootloader-complete', startAnimations)
  }
  const bootLevel = (window as Window & { __BOOT__?: { logLevel?: string } }).__BOOT__?.logLevel
  log.debug('Boot logLevel from SSR', { bootLevel })
  if (typeof bootLevel === 'string') {
    const normalized = bootLevel.toLowerCase()
    if (LOG_LEVEL_VALUES.includes(normalized as (typeof LOG_LEVEL_VALUES)[number])) {
      logLevel.value = normalized as (typeof LOG_LEVEL_VALUES)[number]
    }
  }
  setLogSink((entry: LogEntry) => {
    if (entry.timestamp >= dashboardResetAt.value) {
      if (entry.severity <= 3) errorCount.value += 1
      else if (entry.severity === 4) warnCount.value += 1
    }
    pushVisibleLogEntry(entry)
    browserRemoteLogger!.pushSinkEntry(entry)
  })
  void setupLogsWebSocket()

  window.addEventListener('offline', onBrowserOffline)
  window.addEventListener('online', onBrowserOnline)
  document.addEventListener('visibilitychange', onVisibilityForLogsSocket)

  loadRecentLogs()
})

onBeforeUnmount(() => {
  log.info('onBeforeUnmount: cleaning up listeners and timers')
  window.removeEventListener('offline', onBrowserOffline)
  window.removeEventListener('online', onBrowserOnline)
  document.removeEventListener('visibilitychange', onVisibilityForLogsSocket)
  detachLogsSocketLifecycle()
  if (logsSocketSubscription?.unsubscribe) {
    logsSocketSubscription.unsubscribe()
    logsSocketSubscription = null
  }
  if (projectNameStatusTimeout.id) {
    clearTimeout(projectNameStatusTimeout.id)
    projectNameStatusTimeout.id = null
  }
  if (logLevelStatusTimeout.id) {
    clearTimeout(logLevelStatusTimeout.id)
    logLevelStatusTimeout.id = null
  }
  if (projectNameDebounceTimer.id) {
    clearTimeout(projectNameDebounceTimer.id)
    projectNameDebounceTimer.id = null
  }
  if (gatewayUrlStatusTimeout.id) {
    clearTimeout(gatewayUrlStatusTimeout.id)
    gatewayUrlStatusTimeout.id = null
  }
  if (gcSchoolHostStatusTimeout.id) {
    clearTimeout(gcSchoolHostStatusTimeout.id)
    gcSchoolHostStatusTimeout.id = null
  }
  if (gcSchoolApiKeyStatusTimeout.id) {
    clearTimeout(gcSchoolApiKeyStatusTimeout.id)
    gcSchoolApiKeyStatusTimeout.id = null
  }
})

onUnmounted(() => {
  log.info('Компонент размонтирован')
  setLogSink(null)
  if (browserRemoteLogger) {
    browserRemoteLogger.teardown()
    browserRemoteLogger = null
  }
  window.removeEventListener('bootloader-complete', startAnimations)
})

const setLogLevel = async (level: 'debug' | 'info' | 'warn' | 'error' | 'disable') => {
  const prev = logLevel.value
  logLevel.value = level
  logLevelError.value = ''
  log.notice('Уровень логирования изменён', { from: prev, to: level })
  try {
    const res = await saveSettingRoute.run(ctx, { key: 'log_level', value: level })
    if (res && (res as { success?: boolean }).success === false) {
      logLevel.value = prev
      const errMsg = (res as { error?: string }).error || 'Ошибка сохранения'
      logLevelError.value = errMsg
      showSaveStatus(logLevelSaveStatus, logLevelStatusTimeout, 'error')
      log.error('Не удалось сохранить уровень логирования', errMsg)
    } else {
      showSaveStatus(logLevelSaveStatus, logLevelStatusTimeout, 'saved')
      log.info('Уровень логирования успешно сохранён', level)
    }
  } catch (e) {
    logLevel.value = prev
    const errMsg = (e as Error)?.message || 'Ошибка сохранения'
    logLevelError.value = errMsg
    showSaveStatus(logLevelSaveStatus, logLevelStatusTimeout, 'error')
    log.error('Не удалось сохранить уровень логирования', errMsg)
  }
}

const loadDashboardCounts = async () => {
  try {
    const res = await getDashboardCountsRoute.run(ctx)
    const data = res as {
      success?: boolean
      errorCount?: number
      warnCount?: number
      resetAt?: number
      error?: string
    }
    if (
      data?.success &&
      typeof data.errorCount === 'number' &&
      typeof data.warnCount === 'number' &&
      typeof data.resetAt === 'number'
    ) {
      errorCount.value = data.errorCount
      warnCount.value = data.warnCount
      dashboardResetAt.value = data.resetAt
      log.debug('Счётчики дашборда загружены', {
        errorCount: data.errorCount,
        warnCount: data.warnCount,
        resetAt: data.resetAt
      })
    }
  } catch (e) {
    log.warning('Не удалось загрузить счётчики дашборда', e)
  }
}

const resetDashboard = async () => {
  try {
    const res = await resetDashboardRoute.run(ctx)
    const data = res as {
      success?: boolean
      errorCount?: number
      warnCount?: number
      resetAt?: number
      error?: string
    }
    if (data?.success && typeof data.resetAt === 'number') {
      dashboardResetAt.value = data.resetAt
      errorCount.value = data.errorCount ?? 0
      warnCount.value = data.warnCount ?? 0
      log.notice('Счётчики дашборда сброшены', { resetAt: data.resetAt })
    } else {
      log.error('Ошибка сброса дашборда', data?.error)
    }
  } catch (e) {
    log.error('Ошибка сброса дашборда', e)
  }
}

const openChatiumLink = () => {
  log.notice('Открытие ссылки Chatium')
  window.open('https://chatium.ru/?start=pl-LGBT1Oge7c61RkKTU4t0start', '_blank')
}

const loadRecentLogs = async () => {
  const requestId = ++logsRequestId.value
  const severities = getSeveritiesQueryForStream(selectedLogStream.value)
  const query: { limit: number; severities?: string } = { limit: LOG_FETCH_LIMIT }
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
  const query: { beforeTimestamp: string; limit: number; severities?: string } = {
    beforeTimestamp: String(oldestLogTimestamp.value),
    limit: LOG_FETCH_LIMIT
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

const expandedLogRows = ref<Record<number, boolean>>({})
const toggleLogRow = (idx: number) => {
  expandedLogRows.value[idx] = !expandedLogRows.value[idx]
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

/**
 * Подписка на события жизненного цоля сокета (если платформа их отдаёт).
 * Без колбэков показываем OFFLINE только по offline/ошибке подключения и при ручном переподключении.
 */
function attachLogsSocketLifecycle(
  socketClient: unknown,
  subscription: unknown,
  onDisconnect: () => void
): (() => void) | null {
  const cleanups: Array<() => void> = []
  try {
    const sc = socketClient as Record<string, unknown>
    if (typeof sc.addConnectionListener === 'function') {
      const unsub = (sc.addConnectionListener as (fn: (connected: boolean) => void) => () => void)(
        (connected) => {
          if (!connected) onDisconnect()
        }
      )
      if (typeof unsub === 'function') cleanups.push(unsub)
    }
    const sub = subscription as Record<string, unknown>
    if (typeof sub.on === 'function') {
      const subOn = sub.on as (ev: string, fn: () => void) => void
      const handler = () => onDisconnect()
      for (const ev of ['disconnect', 'close'] as const) {
        try {
          subOn(ev, handler)
          if (typeof sub.off === 'function') {
            const subOff = sub.off as (ev: string, fn: () => void) => void
            cleanups.push(() => {
              try {
                subOff(ev, handler)
              } catch {
                /* ignore */
              }
            })
          }
        } catch {
          /* ignore */
        }
      }
    }
  } catch {
    /* ignore */
  }
  if (!cleanups.length) return null
  return () => {
    cleanups.forEach((fn) => {
      try {
        fn()
      } catch {
        /* ignore */
      }
    })
  }
}

async function setupLogsWebSocket() {
  log.info('setupLogsWebSocket entry')
  if (!props.encodedLogsSocketId) {
    logsWsConnected.value = false
    logsWsInitialized.value = true
    return
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
    logsSocketSubscription = socketClient.subscribeToData(props.encodedLogsSocketId)
    logsSocketLifecycleCleanup = attachLogsSocketLifecycle(
      socketClient,
      logsSocketSubscription,
      () => {
        logsWsConnected.value = false
      }
    )
    logsSocketSubscription.listen((data: { type?: string; data?: LogEntry }) => {
      if (data?.type === 'new-log' && data.data) {
        const entry = data.data as LogEntry
        if (entry.timestamp >= dashboardResetAt.value) {
          if (entry.severity <= 3) errorCount.value += 1
          else if (entry.severity === 4) warnCount.value += 1
        }
        pushVisibleLogEntry(entry)
      }
    })
    logsWsConnected.value = true
  } catch (err) {
    logsWsConnected.value = false
    log.error('Не удалось подписаться на логи по WebSocket', err)
  } finally {
    logsWsInitialized.value = true
  }
}

function onBrowserOffline() {
  log.info('onBrowserOffline: WebSocket marked disconnected')
  logsWsConnected.value = false
}

function onBrowserOnline() {
  log.info('onBrowserOnline: reconnecting WebSocket')
  void setupLogsWebSocket()
}

function onVisibilityForLogsSocket() {
  if (document.visibilityState !== 'visible' || !props.encodedLogsSocketId) return
  if (!logsWsConnected.value) {
    log.info('onVisibilityForLogsSocket: tab visible, reconnecting')
    void setupLogsWebSocket()
  }
}
</script>

<template>
  <div class="app-layout flex flex-col w-full min-w-0">
    <GlobalGlitch />
    <Header
      v-if="bootLoaderDone"
      :projectTitle="props.projectTitle"
      :indexUrl="props.indexUrl"
      :profileUrl="props.profileUrl"
      :loginUrl="props.loginUrl"
      :isAuthenticated="props.isAuthenticated"
      :isAdmin="props.isAdmin"
      :adminUrl="props.adminUrl"
      :testsUrl="props.testsUrl"
    />

    <main class="ap-wrap flex flex-col flex-1 relative z-10 min-h-0 w-full min-w-0 overflow-hidden">
      <div class="ap" :class="{ ready: bootLoaderDone }">
        <div class="ap-status">
          <div class="ap-status-left">
            <i class="fas fa-terminal ap-icon-muted"></i>
            <span class="ap-path">/web/admin</span>
            <span class="ap-separator">&#xB7;</span>
            <span class="ap-project-label">{{ projectName || '—' }}</span>
          </div>
          <div class="ap-status-right">
            <span class="ap-status-tag"
              ><i class="fas fa-layer-group ap-icon-muted"></i> LOG:
              {{ logLevel.toUpperCase() }}</span
            >
            <span
              class="ap-stream-pill"
              :class="{
                'ap-stream-pill--live': encodedLogsSocketOk && logsWsInitialized && logsWsConnected,
                'ap-stream-pill--offline':
                  encodedLogsSocketOk && logsWsInitialized && !logsWsConnected,
                'ap-stream-pill--pending': encodedLogsSocketOk && !logsWsInitialized,
                'ap-stream-pill--nosocket': !encodedLogsSocketOk,
                'ap-stream-pill--syncing': logsLoading
              }"
              role="status"
              :aria-label="streamPillAriaLabel"
            >
              <span class="ap-stream-pill__dot" aria-hidden="true"></span>
              <span class="ap-stream-pill__label">{{ streamPillLabel }}</span>
              <span v-if="logsLoading" class="ap-stream-pill__sync" title="Загрузка истории логов">
                <i class="fas fa-circle-notch fa-spin" aria-hidden="true"></i>
              </span>
            </span>
          </div>
          <div class="ap-status-sweep"></div>
        </div>

        <div class="ap-grid">
          <div class="ap-main content-wrapper">
            <section class="ap-card ap-card--stagger-1">
              <div class="ap-card-hd">
                <h2><i class="fas fa-chart-bar ap-icon-hd"></i> Счётчики</h2>
                <button type="button" class="ap-btn ap-btn--sm" @click="resetDashboard">
                  <i class="fas fa-redo-alt"></i> Сброс
                </button>
              </div>
              <div class="ap-meters">
                <div class="ap-meter ap-meter--err">
                  <div class="ap-meter-accent"></div>
                  <div class="ap-meter-body">
                    <strong>{{ errorCount }}</strong>
                    <span><i class="fas fa-times-circle"></i> Ошибки</span>
                  </div>
                </div>
                <div class="ap-meter ap-meter--wrn">
                  <div class="ap-meter-accent"></div>
                  <div class="ap-meter-body">
                    <strong>{{ warnCount }}</strong>
                    <span><i class="fas fa-exclamation-triangle"></i> Предупреждения</span>
                  </div>
                </div>
              </div>
            </section>

            <div class="ap-cfg-row">
              <section class="ap-card ap-card--stagger-2">
                <div class="ap-card-hd">
                  <h2><i class="fas fa-pen ap-icon-hd"></i> Название проекта</h2>
                  <span
                    v-if="projectNameSaveStatus"
                    class="ap-badge"
                    :class="projectNameSaveStatus === 'saved' ? 'ap-badge--ok' : 'ap-badge--err'"
                  >
                    <i
                      :class="projectNameSaveStatus === 'saved' ? 'fas fa-check' : 'fas fa-times'"
                    ></i>
                    {{ projectNameSaveStatus === 'saved' ? 'OK' : 'ERR' }}
                  </span>
                </div>
                <input
                  v-model="projectName"
                  type="text"
                  class="ap-input"
                  placeholder="Имя проекта"
                />
                <p v-if="projectNameError" class="ap-err">
                  <i class="fas fa-exclamation-circle"></i> {{ projectNameError }}
                </p>
              </section>

              <section class="ap-card ap-card--stagger-3">
                <div class="ap-card-hd">
                  <h2><i class="fas fa-sliders-h ap-icon-hd"></i> Уровень логирования</h2>
                  <span
                    v-if="logLevelSaveStatus"
                    class="ap-badge"
                    :class="logLevelSaveStatus === 'saved' ? 'ap-badge--ok' : 'ap-badge--err'"
                  >
                    <i
                      :class="logLevelSaveStatus === 'saved' ? 'fas fa-check' : 'fas fa-times'"
                    ></i>
                    {{ logLevelSaveStatus === 'saved' ? 'OK' : 'ERR' }}
                  </span>
                </div>
                <div class="ap-lvls">
                  <button
                    v-for="lvl in LOG_LEVEL_VALUES"
                    :key="lvl"
                    type="button"
                    class="ap-lvl"
                    :class="{ active: logLevel === lvl }"
                    @click="setLogLevel(lvl)"
                  >
                    {{ lvl.toUpperCase() }}
                  </button>
                </div>
                <p v-if="logLevelError" class="ap-err">
                  <i class="fas fa-exclamation-circle"></i> {{ logLevelError }}
                </p>
              </section>
            </div>

            <section class="ap-card ap-card--stagger-4 ap-gateway">
              <div class="ap-card-hd">
                <h2><i class="fas fa-plug ap-icon-hd"></i> Подключение к gateway</h2>
                <span
                  v-if="gatewayConfigured"
                  class="ap-badge ap-badge--ok"
                  title="Все три параметра заданы"
                >
                  <i class="fas fa-check"></i> Конфигурация
                </span>
              </div>
              <p class="ap-gateway-hint">
                Обязательные параметры для <code class="ap-code">lib/gateway/gatewayClient</code> и
                вызовов <code class="ap-code">POST /api/gateway/invoke</code>: базовый URL
                приложения gateway, хост школы GetCourse (без
                <code class="ap-code">https://</code> и без пути) и API-ключ школы.
              </p>

              <div class="ap-gateway-field">
                <label class="ap-gateway-label" for="gw-base-url"
                  >Базовый URL gateway (<code class="ap-code">gateway_url</code>)</label
                >
                <div class="ap-gateway-row">
                  <input
                    id="gw-base-url"
                    v-model="gatewayUrlInput"
                    type="url"
                    autocomplete="off"
                    class="ap-input ap-input--flex"
                    placeholder="https://…/p/saas/gw/gc"
                  />
                  <button
                    type="button"
                    class="ap-btn ap-btn--sm"
                    :disabled="gatewayUrlSaving"
                    @click="saveGatewayUrl"
                  >
                    <i
                      :class="gatewayUrlSaving ? 'fas fa-circle-notch fa-spin' : 'fas fa-save'"
                    ></i>
                    Сохранить
                  </button>
                  <span
                    v-if="gatewayUrlSaveStatus"
                    class="ap-badge ap-gateway-badge"
                    :class="gatewayUrlSaveStatus === 'saved' ? 'ap-badge--ok' : 'ap-badge--err'"
                  >
                    <i
                      :class="gatewayUrlSaveStatus === 'saved' ? 'fas fa-check' : 'fas fa-times'"
                    ></i>
                  </span>
                </div>
                <p v-if="gatewayUrlError" class="ap-err">
                  <i class="fas fa-exclamation-circle"></i> {{ gatewayUrlError }}
                </p>
              </div>

              <div class="ap-gateway-field">
                <label class="ap-gateway-label" for="gw-school-host"
                  >Хост школы (<code class="ap-code">gc_school_host</code>)</label
                >
                <div class="ap-gateway-row">
                  <input
                    id="gw-school-host"
                    v-model="gcSchoolHostInput"
                    type="text"
                    autocomplete="off"
                    class="ap-input ap-input--flex"
                    placeholder="myschool.getcourse.ru"
                  />
                  <button
                    type="button"
                    class="ap-btn ap-btn--sm"
                    :disabled="gcSchoolHostSaving"
                    @click="saveGcSchoolHost"
                  >
                    <i
                      :class="gcSchoolHostSaving ? 'fas fa-circle-notch fa-spin' : 'fas fa-save'"
                    ></i>
                    Сохранить
                  </button>
                  <span
                    v-if="gcSchoolHostSaveStatus"
                    class="ap-badge ap-gateway-badge"
                    :class="gcSchoolHostSaveStatus === 'saved' ? 'ap-badge--ok' : 'ap-badge--err'"
                  >
                    <i
                      :class="gcSchoolHostSaveStatus === 'saved' ? 'fas fa-check' : 'fas fa-times'"
                    ></i>
                  </span>
                </div>
                <p v-if="gcSchoolHostError" class="ap-err">
                  <i class="fas fa-exclamation-circle"></i> {{ gcSchoolHostError }}
                </p>
              </div>

              <div class="ap-gateway-field">
                <label class="ap-gateway-label" for="gw-school-key"
                  >API-ключ школы (<code class="ap-code">gc_school_api_key</code>)</label
                >
                <div class="ap-gateway-row">
                  <input
                    id="gw-school-key"
                    v-model="gcSchoolApiKeyInput"
                    type="password"
                    autocomplete="new-password"
                    class="ap-input ap-input--flex"
                    placeholder="Секрет из GetCourse"
                  />
                  <button
                    type="button"
                    class="ap-btn ap-btn--sm"
                    :disabled="gcSchoolApiKeySaving"
                    @click="saveGcSchoolApiKey"
                  >
                    <i
                      :class="gcSchoolApiKeySaving ? 'fas fa-circle-notch fa-spin' : 'fas fa-save'"
                    ></i>
                    Сохранить
                  </button>
                  <span
                    v-if="gcSchoolApiKeySaveStatus"
                    class="ap-badge ap-gateway-badge"
                    :class="gcSchoolApiKeySaveStatus === 'saved' ? 'ap-badge--ok' : 'ap-badge--err'"
                  >
                    <i
                      :class="
                        gcSchoolApiKeySaveStatus === 'saved' ? 'fas fa-check' : 'fas fa-times'
                      "
                    ></i>
                  </span>
                </div>
                <p v-if="gcSchoolApiKeyError" class="ap-err">
                  <i class="fas fa-exclamation-circle"></i> {{ gcSchoolApiKeyError }}
                </p>
              </div>
            </section>
          </div>

          <aside class="ap-side">
            <section class="ap-card ap-logs ap-card--stagger-2">
              <div class="ap-card-hd">
                <h2><i class="fas fa-stream ap-icon-hd"></i> Монитор логов</h2>
                <span class="ap-log-ct">{{ currentLogCount }} зап.</span>
              </div>
              <div class="ap-log-filters">
                <button
                  v-for="s in LOG_STREAM_KEYS"
                  :key="s"
                  type="button"
                  class="ap-flt"
                  :class="{ active: selectedLogStream === s }"
                  @click="toggleLogFilter(s)"
                >
                  {{ LOG_STREAM_LABELS[s] }}
                </button>
              </div>
              <div class="ap-log-out custom-scrollbar" ref="logsOutputRef">
                <div v-if="!displayedLogs.length" class="ap-log-empty">
                  <i
                    class="fas fa-inbox"
                    style="font-size: 1.2rem; display: block; margin-bottom: 0.5rem; opacity: 0.4"
                  ></i>
                  Поток «{{ selectedLogStreamLabel }}» пуст
                </div>
                <template v-for="(item, index) in displayedLogs" :key="index">
                  <div v-if="item.type === 'divider'" class="ap-log-div">
                    <span>{{ item.date }}</span>
                  </div>
                  <div
                    v-else
                    class="ap-log-row"
                    :class="{ expanded: expandedLogRows[index] }"
                    @click="toggleLogRow(index)"
                  >
                    <span class="ap-log-t">{{ item.formattedTime }}</span>
                    <span class="ap-log-l" :class="`lvl-${item.entry.level}`"
                      >[{{ item.entry.level.toUpperCase() }}]</span
                    >
                    <span class="ap-log-m">{{ item.formattedMessage }}</span>
                  </div>
                </template>
              </div>
              <div class="ap-log-ft">
                <span v-if="logsLoading" class="ap-log-sync">
                  <i class="fas fa-circle-notch fa-spin"></i> Загрузка...
                </span>
                <p v-if="logsError" class="ap-err">
                  <i class="fas fa-exclamation-circle"></i> {{ logsError }}
                </p>
                <div class="ap-log-btns">
                  <button
                    v-if="logsHasMore && !logsLoading"
                    type="button"
                    class="ap-btn"
                    @click="loadMoreLogs"
                  >
                    <i class="fas fa-chevron-down"></i> Ещё 50
                  </button>
                  <button type="button" class="ap-btn ap-btn--danger" @click="clearLogs">
                    <i class="fas fa-trash-alt"></i> Очистить
                  </button>
                </div>
              </div>
            </section>
          </aside>
        </div>
      </div>
    </main>

    <AppFooter v-if="bootLoaderDone" @chatium-click="openChatiumLink" />
  </div>
</template>

<style scoped>
/* Высота окна: хедер и футер фиксированы; <main> без вертикального скролла — крутится левая колонка, правая (логи) по высоте ряда = окно минус хедер/футер/тулбар. */
.app-layout {
  height: 100vh;
  height: 100dvh;
  max-height: 100vh;
  max-height: 100dvh;
  overflow: hidden;
  position: relative;
  width: 100%;
}

/* main: колонка на всю доступную высоту между шапкой и футером, без собственного scroll */
.ap-wrap {
  display: flex;
  flex-direction: column;
  min-height: 0;
  min-width: 0;
  width: 100%;
  overflow: hidden;
}

.ap {
  --c-bg: rgba(12, 11, 14, 0.97);
  --c-bg2: rgba(16, 15, 19, 0.96);
  --c-bg-deep: rgba(8, 7, 10, 0.98);
  --c-bdr: rgba(50, 44, 54, 0.55);
  --c-bdr-hi: rgba(75, 62, 78, 0.6);
  --c-tx: #e0dcdf;
  --c-tx2: #a39da0;
  --c-tx3: #7e777b;
  --c-red: #c4213f;
  --c-red-s: #d95672;
  --c-red-glow: rgba(217, 86, 114, 0.35);
  --c-warn: #c9a660;
  --c-alert: #d97a8a;
  --c-ok: #6aaf7e;

  flex: 1 1 auto;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  width: 100%;
  max-width: 1440px;
  margin: 0 auto;
  padding: 0.75rem 1rem 1.5rem;
  opacity: 0;
  transform: translateY(8px);
  transition:
    opacity 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94),
    transform 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94);
  font-family: 'Share Tech Mono', 'Courier New', monospace;
}

.ap.ready {
  opacity: 1;
  transform: none;
}
.ap,
.ap :deep(*) {
  box-sizing: border-box;
  border-radius: 0 !important;
  line-height: 1.45;
}

.ap-icon-muted {
  font-size: 0.65rem;
  opacity: 0.55;
}
.ap-icon-hd {
  font-size: 0.68rem;
  opacity: 0.6;
  margin-right: 0.15rem;
}

/* ── STATUS BAR ── */
.ap-status {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  padding: 0.5rem 0.85rem;
  margin-bottom: 0.85rem;
  border: 1px solid var(--c-bdr);
  background: var(--c-bg-deep);
  font-size: 0.78rem;
  color: var(--c-tx2);
  position: relative;
  overflow: hidden;
}
.ap-status::after {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 1px;
  background: linear-gradient(90deg, transparent, var(--c-red), transparent);
  opacity: 0.3;
}
.ap-status-sweep {
  position: absolute;
  top: 0;
  left: -100%;
  width: 50%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(217, 86, 114, 0.03), transparent);
  animation: ap-sweep 8s linear infinite;
  pointer-events: none;
}
@keyframes ap-sweep {
  0% {
    left: -50%;
  }
  100% {
    left: 150%;
  }
}
.ap-status-left,
.ap-status-right {
  display: flex;
  align-items: center;
  gap: 0.55rem;
  position: relative;
  z-index: 1;
}
.ap-path {
  color: var(--c-red-s);
  letter-spacing: 0.04em;
  font-weight: 600;
}
.ap-separator {
  color: var(--c-tx3);
  opacity: 0.4;
}
.ap-project-label {
  color: var(--c-tx);
  letter-spacing: 0.02em;
}
.ap-status-tag {
  padding: 0.15rem 0.45rem;
  border: 1px solid var(--c-bdr);
  background: rgba(16, 15, 19, 0.7);
  font-size: 0.7rem;
  letter-spacing: 0.05em;
  color: var(--c-tx2);
}
/* Поток логов: фиксированная ширина подписи, отдельный индикатор загрузки — без скачков вёрстки */
.ap-stream-pill {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  min-width: 7.25rem;
  padding: 0.28rem 0.5rem 0.28rem 0.4rem;
  border: 1px solid var(--c-bdr);
  background: rgba(10, 9, 12, 0.85);
  font-size: 0.68rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  line-height: 1;
  flex-shrink: 0;
  box-sizing: border-box;
}
.ap-stream-pill__dot {
  width: 7px;
  height: 7px;
  flex: 0 0 7px;
  align-self: center;
  background: var(--c-tx3);
  box-shadow: none;
}
.ap-stream-pill__label {
  flex: 1 1 auto;
  min-width: 4.25rem;
  text-align: left;
  font-variant-numeric: tabular-nums;
  line-height: 1;
  display: inline-flex;
  align-items: center;
  padding-top: 0.06em;
}
.ap-stream-pill__sync {
  flex: 0 0 auto;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 0.85rem;
  font-size: 0.62rem;
  opacity: 0.85;
  color: var(--c-tx2);
}
.ap-stream-pill--live {
  color: var(--c-red-s);
  border-color: rgba(217, 86, 114, 0.35);
}
.ap-stream-pill--live .ap-stream-pill__dot {
  background: var(--c-red-s);
  box-shadow: 0 0 6px var(--c-red-glow);
  animation: ap-stream-dot-pulse 2.2s ease-in-out infinite;
}
.ap-stream-pill--offline {
  color: var(--c-tx3);
  border-color: rgba(80, 75, 82, 0.55);
}
.ap-stream-pill--offline .ap-stream-pill__dot {
  background: var(--c-tx3);
  animation: none;
}
.ap-stream-pill--nosocket {
  color: var(--c-tx3);
  border-color: var(--c-bdr);
}
.ap-stream-pill--nosocket .ap-stream-pill__dot {
  background: var(--c-tx3);
  opacity: 0.5;
  animation: none;
}
.ap-stream-pill--pending {
  color: var(--c-tx2);
  border-color: rgba(90, 82, 88, 0.45);
}
.ap-stream-pill--pending .ap-stream-pill__dot {
  background: rgba(217, 86, 114, 0.55);
  opacity: 1;
  animation: ap-stream-dot-pulse 1.4s ease-in-out infinite;
}
.ap-stream-pill--syncing.ap-stream-pill--live {
  border-color: rgba(217, 86, 114, 0.45);
}
@keyframes ap-stream-dot-pulse {
  0%,
  100% {
    opacity: 1;
    box-shadow: 0 0 6px var(--c-red-glow);
    transform: scale(1);
  }
  50% {
    opacity: 0.4;
    box-shadow: 0 0 2px rgba(217, 86, 114, 0.25);
    transform: scale(0.92);
  }
}

/* ── GRID: ровно оставшаяся высота main; левая колонка скроллится, правая (логи) тянется по высоте ряда и не уезжает при скролле слева ── */
.ap-grid {
  flex: 1 1 auto;
  min-height: 0;
  display: grid;
  grid-template-columns: minmax(240px, 1fr) minmax(360px, 440px);
  grid-template-rows: minmax(0, 1fr);
  gap: 0.85rem;
  align-items: stretch;
}
.ap-main {
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
  min-width: 0;
  min-height: 0;
  overflow-x: hidden;
  overflow-y: auto;
}

/* ── CARDS ── */
.ap-card {
  border: 1px solid var(--c-bdr);
  background: linear-gradient(175deg, var(--c-bg), var(--c-bg2));
  padding: 0.85rem 1rem;
  position: relative;
  transition: border-color 0.25s ease;
}
.ap-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 1px;
  background: linear-gradient(90deg, transparent 10%, var(--c-red) 50%, transparent 90%);
  opacity: 0.2;
}
.ap-card::after {
  content: '';
  position: absolute;
  inset: 0;
  background: repeating-linear-gradient(
    0deg,
    rgba(0, 0, 0, 0.012) 0px,
    rgba(0, 0, 0, 0.012) 1px,
    transparent 1px,
    transparent 3px
  );
  pointer-events: none;
  opacity: 0.4;
}
.ap-card:hover {
  border-color: var(--c-bdr-hi);
}
.ap-card--stagger-1 {
  animation: ap-card-enter 0.5s cubic-bezier(0.25, 0.46, 0.45, 0.94) 0.1s both;
}
.ap-card--stagger-2 {
  animation: ap-card-enter 0.5s cubic-bezier(0.25, 0.46, 0.45, 0.94) 0.2s both;
}
.ap-card--stagger-3 {
  animation: ap-card-enter 0.5s cubic-bezier(0.25, 0.46, 0.45, 0.94) 0.3s both;
}
.ap-card--stagger-4 {
  animation: ap-card-enter 0.5s cubic-bezier(0.25, 0.46, 0.45, 0.94) 0.4s both;
}
@keyframes ap-card-enter {
  from {
    opacity: 0;
    transform: translateY(8px);
  }
  to {
    opacity: 1;
    transform: none;
  }
}
.ap-card-hd {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  margin-bottom: 0.7rem;
  position: relative;
  z-index: 1;
}
.ap-card-hd h2 {
  margin: 0;
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--c-tx2);
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

/* ── METERS ── */
.ap-meters {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.6rem;
  position: relative;
  z-index: 1;
}
.ap-meter {
  display: flex;
  overflow: hidden;
  border: 1px solid var(--c-bdr);
  background: var(--c-bg-deep);
  transition: border-color 0.25s ease;
}
.ap-meter-accent {
  width: 3px;
  flex-shrink: 0;
}
.ap-meter-body {
  padding: 0.65rem 0.8rem;
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
}
.ap-meter strong {
  font-size: 1.75rem;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  line-height: 1.15;
}
.ap-meter span {
  font-size: 0.66rem;
  color: var(--c-tx3);
  letter-spacing: 0.04em;
  text-transform: uppercase;
}
.ap-meter span i {
  margin-right: 0.2rem;
}

.ap-meter--err .ap-meter-accent {
  background: var(--c-alert);
}
.ap-meter--err strong {
  color: var(--c-alert);
}
.ap-meter--err {
  border-color: rgba(217, 122, 138, 0.25);
}
.ap-meter--err:hover {
  border-color: rgba(217, 122, 138, 0.45);
}

.ap-meter--wrn .ap-meter-accent {
  background: var(--c-warn);
}
.ap-meter--wrn strong {
  color: var(--c-warn);
}
.ap-meter--wrn {
  border-color: rgba(201, 166, 96, 0.25);
}
.ap-meter--wrn:hover {
  border-color: rgba(201, 166, 96, 0.45);
}

/* ── CONFIG ── */
.ap-cfg-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.85rem;
}

/* ── GATEWAY SETTINGS ── */
.ap-gateway-hint {
  position: relative;
  z-index: 1;
  font-size: 0.74rem;
  color: var(--c-tx2);
  margin: 0 0 0.9rem;
  line-height: 1.55;
}
.ap-code {
  font-family: inherit;
  font-size: 0.92em;
  color: var(--c-red-s);
  padding: 0.05em 0.25em;
  background: rgba(0, 0, 0, 0.28);
  border: 1px solid rgba(50, 44, 54, 0.45);
}
.ap-gateway-field {
  margin-bottom: 0.85rem;
  position: relative;
  z-index: 1;
}
.ap-gateway-field:last-child {
  margin-bottom: 0;
}
.ap-gateway-label {
  display: block;
  font-size: 0.72rem;
  color: var(--c-tx2);
  margin-bottom: 0.35rem;
  letter-spacing: 0.03em;
}
.ap-gateway-row {
  display: flex;
  flex-wrap: wrap;
  align-items: stretch;
  gap: 0.45rem;
}
.ap-input--flex {
  flex: 1 1 12rem;
  min-width: 0;
}
.ap-gateway-badge {
  align-self: center;
  flex-shrink: 0;
}

.ap-input {
  width: 100%;
  padding: 0.55rem 0.7rem;
  border: 1px solid var(--c-bdr);
  background: var(--c-bg-deep);
  color: var(--c-tx);
  font-family: inherit;
  font-size: 0.85rem;
  letter-spacing: 0.02em;
  transition:
    border-color 0.2s ease,
    box-shadow 0.2s ease;
  position: relative;
  z-index: 1;
}
.ap-input:focus {
  outline: none;
  border-color: var(--c-red-s);
  box-shadow: 0 0 0 1px rgba(217, 86, 114, 0.2);
}
.ap-input::placeholder {
  color: var(--c-tx3);
}

.ap-lvls {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0.4rem;
  position: relative;
  z-index: 1;
}
.ap-lvl {
  padding: 0.42rem;
  border: 1px solid var(--c-bdr);
  background: var(--c-bg-deep);
  color: var(--c-tx2);
  font-family: inherit;
  font-size: 0.72rem;
  cursor: pointer;
  transition: all 0.15s ease;
  font-weight: 600;
  text-align: center;
  letter-spacing: 0.05em;
  position: relative;
  overflow: hidden;
  clip-path: polygon(
    0 2px,
    2px 2px,
    2px 0,
    calc(100% - 2px) 0,
    calc(100% - 2px) 2px,
    100% 2px,
    100% calc(100% - 2px),
    calc(100% - 2px) calc(100% - 2px),
    calc(100% - 2px) 100%,
    2px 100%,
    2px calc(100% - 2px),
    0 calc(100% - 2px)
  );
}
.ap-lvl::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 0;
  width: 100%;
  height: 2px;
  background: var(--c-red);
  transform: scaleX(0);
  transform-origin: left;
  transition: transform 0.2s ease;
}
.ap-lvl:hover {
  border-color: var(--c-bdr-hi);
  background: rgba(22, 20, 26, 0.98);
  color: var(--c-tx);
}
.ap-lvl:hover::after {
  transform: scaleX(1);
}
.ap-lvl.active {
  border-color: var(--c-red-s);
  background: rgba(196, 33, 63, 0.14);
  color: #fff;
}
.ap-lvl.active::after {
  transform: scaleX(1);
}

/* ── BUTTONS ── */
.ap-btn {
  padding: 0.42rem 0.8rem;
  border: 1px solid var(--c-bdr);
  background: var(--c-bg-deep);
  color: var(--c-tx);
  font-family: inherit;
  font-size: 0.76rem;
  cursor: pointer;
  transition: all 0.15s ease;
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  letter-spacing: 0.03em;
  position: relative;
  overflow: hidden;
  clip-path: polygon(
    0 2px,
    2px 2px,
    2px 0,
    calc(100% - 2px) 0,
    calc(100% - 2px) 2px,
    100% 2px,
    100% calc(100% - 2px),
    calc(100% - 2px) calc(100% - 2px),
    calc(100% - 2px) 100%,
    2px 100%,
    2px calc(100% - 2px),
    0 calc(100% - 2px)
  );
}
.ap-btn::before {
  content: '';
  position: absolute;
  inset: 0;
  background: repeating-linear-gradient(
    0deg,
    rgba(0, 0, 0, 0.04) 0px,
    rgba(0, 0, 0, 0.04) 1px,
    transparent 1px,
    transparent 2px
  );
  pointer-events: none;
}
.ap-btn::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 0;
  width: 100%;
  height: 2px;
  background: var(--c-red);
  transform: scaleX(0);
  transform-origin: left;
  transition: transform 0.2s ease;
}
.ap-btn:hover {
  border-color: var(--c-bdr-hi);
  background: rgba(24, 22, 28, 0.98);
  transform: translateY(-1px);
  box-shadow: 0 3px 8px rgba(0, 0, 0, 0.35);
}
.ap-btn:hover::after {
  transform: scaleX(1);
}
.ap-btn:active {
  transform: translateY(0);
  box-shadow: none;
}
.ap-btn i {
  font-size: 0.62rem;
}
.ap-btn--sm {
  padding: 0.28rem 0.55rem;
  font-size: 0.68rem;
}
.ap-btn--sm i {
  font-size: 0.58rem;
}
.ap-btn--danger {
  border-color: rgba(217, 122, 138, 0.3);
  color: #ecc8cf;
  background: rgba(45, 14, 22, 0.9);
}
.ap-btn--danger::after {
  background: var(--c-alert);
}
.ap-btn--danger:hover {
  border-color: rgba(217, 122, 138, 0.5);
  background: rgba(60, 20, 30, 0.95);
}

/* ── BADGES ── */
.ap-badge {
  font-size: 0.63rem;
  padding: 0.1rem 0.4rem;
  border: 1px solid;
  font-weight: 700;
  letter-spacing: 0.06em;
  position: relative;
  z-index: 1;
  animation: ap-badge-flash 0.4s ease-out;
}
.ap-badge i {
  font-size: 0.55rem;
  margin-right: 0.1rem;
}
@keyframes ap-badge-flash {
  0% {
    opacity: 0;
    transform: scale(0.85);
  }
  50% {
    transform: scale(1.04);
  }
  100% {
    opacity: 1;
    transform: scale(1);
  }
}
.ap-badge--ok {
  color: var(--c-ok);
  border-color: rgba(106, 175, 126, 0.4);
}
.ap-badge--err {
  color: var(--c-alert);
  border-color: rgba(217, 122, 138, 0.4);
}

.ap-err {
  margin: 0.4rem 0 0;
  color: var(--c-alert);
  font-size: 0.76rem;
  position: relative;
  z-index: 1;
}
.ap-err i {
  margin-right: 0.2rem;
  font-size: 0.65rem;
}

/* ── LOG MONITOR: высота = ячейка сетки (ровно ряд между шапкой страницы и футером); движется только список в .ap-log-out ── */
.ap-side {
  min-width: 0;
  min-height: 0;
  width: 100%;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
.ap-logs {
  position: relative;
  flex: 1 1 auto;
  display: flex;
  flex-direction: column;
  min-height: 0;
}
.ap-log-ct {
  font-size: 0.7rem;
  color: var(--c-tx3);
  letter-spacing: 0.04em;
  font-variant-numeric: tabular-nums;
}
.ap-log-filters {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 0.4rem;
  margin-bottom: 0.6rem;
  position: relative;
  z-index: 1;
  flex-shrink: 0;
}
.ap-logs > .ap-card-hd {
  flex-shrink: 0;
}
.ap-flt {
  padding: 0.35rem;
  border: 1px solid var(--c-bdr);
  background: var(--c-bg-deep);
  color: var(--c-tx2);
  font-family: inherit;
  font-size: 0.7rem;
  cursor: pointer;
  transition: all 0.15s ease;
  text-align: center;
  letter-spacing: 0.03em;
  position: relative;
  overflow: hidden;
}
.ap-flt::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 0;
  width: 100%;
  height: 2px;
  background: var(--c-red);
  transform: scaleX(0);
  transition: transform 0.2s ease;
}
.ap-flt:hover {
  border-color: var(--c-bdr-hi);
}
.ap-flt:hover::after {
  transform: scaleX(1);
}
.ap-flt.active {
  border-color: var(--c-red-s);
  background: rgba(196, 33, 63, 0.12);
  color: #fff;
}
.ap-flt.active::after {
  transform: scaleX(1);
}

.ap-log-out {
  flex: 1 1 auto;
  min-height: 7rem;
  overflow-y: auto;
  border: 1px solid rgba(50, 44, 54, 0.35);
  background: rgba(5, 4, 7, 0.98);
  padding: 0.55rem;
  margin-bottom: 0.55rem;
  font-size: 0.74rem;
  line-height: 1.6;
  position: relative;
  z-index: 1;
  box-shadow: inset 0 0 40px rgba(0, 0, 0, 0.25);
}
.ap-log-empty {
  color: var(--c-tx3);
  padding: 2rem;
  text-align: center;
  font-size: 0.8rem;
  letter-spacing: 0.03em;
}
.ap-log-div {
  text-align: center;
  padding: 0.35rem 0;
  margin: 0.3rem 0;
}
.ap-log-div span {
  font-size: 0.64rem;
  color: var(--c-warn);
  letter-spacing: 0.08em;
  text-transform: uppercase;
  opacity: 0.5;
  padding: 0.1rem 0.6rem;
  border-top: 1px solid rgba(201, 166, 96, 0.12);
  border-bottom: 1px solid rgba(201, 166, 96, 0.12);
}
.ap-log-row {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 0 0.4rem;
  padding: 0.2rem 0;
  border-bottom: 1px solid rgba(50, 44, 54, 0.1);
  cursor: pointer;
  transition: background 0.1s ease;
  user-select: none;
}
.ap-log-row:hover {
  background: rgba(255, 255, 255, 0.02);
}
.ap-log-t {
  flex-shrink: 0;
  color: var(--c-tx3);
  white-space: nowrap;
  font-variant-numeric: tabular-nums;
}
.ap-log-l {
  flex-shrink: 0;
  font-weight: 700;
  white-space: nowrap;
}
.ap-log-m {
  flex: 1 1 0;
  min-width: 0;
  color: var(--c-tx);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.ap-log-row.expanded .ap-log-m {
  flex-basis: 100%;
  white-space: pre-wrap;
  word-break: break-word;
  overflow: visible;
  text-overflow: unset;
  margin-top: 0.15rem;
  padding: 0.2rem 0 0.1rem 0.5rem;
  border-left: 2px solid rgba(50, 44, 54, 0.3);
  user-select: text;
}

.lvl-debug {
  color: #7e767a;
}
.lvl-info {
  color: var(--c-tx2);
}
.lvl-notice {
  color: #8bb89c;
}
.lvl-warning {
  color: var(--c-warn);
}
.lvl-error,
.lvl-critical,
.lvl-alert,
.lvl-emergency {
  color: var(--c-alert);
}

.ap-log-ft {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  position: relative;
  z-index: 1;
  flex-shrink: 0;
}
.ap-log-sync {
  font-size: 0.74rem;
  color: var(--c-tx2);
  display: flex;
  align-items: center;
  gap: 0.35rem;
}
.ap-log-sync i {
  font-size: 0.62rem;
}
.ap-log-btns {
  display: flex;
  gap: 0.4rem;
}
.ap-log-btns .ap-btn:first-child {
  flex: 1;
}

@media (max-width: 1100px) {
  .ap-wrap {
    overflow-y: auto;
  }
  .ap {
    flex: none;
    min-height: auto;
    overflow: visible;
  }
  .ap-grid {
    flex: none;
    grid-template-columns: 1fr;
    grid-template-rows: auto auto;
    min-height: auto;
    align-items: start;
  }
  .ap-main {
    overflow: visible;
  }
  .ap-side {
    overflow: visible;
  }
  .ap-logs {
    flex: none;
  }
  .ap-log-out {
    min-height: 240px;
    max-height: 420px;
    flex: none;
  }
}
@media (max-width: 680px) {
  .ap {
    padding: 0.5rem 0.625rem 1rem;
  }
  .ap-cfg-row {
    grid-template-columns: 1fr;
  }
  .ap-gateway-row .ap-btn {
    flex: 1 1 auto;
    justify-content: center;
  }
  .ap-meters {
    grid-template-columns: 1fr;
  }
  .ap-log-filters {
    grid-template-columns: repeat(2, 1fr);
  }
  .ap-log-row {
    grid-template-columns: 1fr;
    gap: 0.1rem;
  }
  .ap-status {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.35rem;
  }
  .ap-lvls {
    grid-template-columns: repeat(2, 1fr);
  }
}
</style>
