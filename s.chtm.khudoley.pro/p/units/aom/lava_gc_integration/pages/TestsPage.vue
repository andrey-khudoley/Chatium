<script setup lang="ts">
import { onMounted, onBeforeUnmount, onUnmounted, ref, computed, watch } from 'vue'
import { getOrCreateBrowserSocketClient } from '@app/socket'
import Header from '../components/Header.vue'
import GlobalGlitch from '../components/GlobalGlitch.vue'
import AppFooter from '../components/AppFooter.vue'
import { createComponentLogger, setLogSink, type LogEntry } from '../shared/logger'
import { getRecentLogsRoute } from '../api/admin/logs/recent'
import { getLogsBeforeRoute } from '../api/admin/logs/before'
import { PROJECT_ROOT } from '../shared/projectRoot'
import { evaluatePageRouteResponse } from '../shared/pageRouteProbe'

const log = createComponentLogger('TestsPage')

declare const ctx: app.Ctx

declare global {
  interface Window {
    hideAppLoader?: () => void
    triggerGlobalGlitch?: () => void
    bootLoaderComplete?: boolean
  }
}

const props = defineProps<{
  projectTitle: string
  indexUrl: string
  profileUrl: string
  testsUrl: string
  loginUrl: string
  isAuthenticated: boolean
  isAdmin?: boolean
  adminUrl?: string
  encodedLogsSocketId?: string
}>()

const showContent = ref(false)
const bootLoaderDone = ref(false)

/** Режим набора тестов: новые юнит/интеграция (пока пусто) или устаревший набор всех текущих проверок. */
const testSuiteMode = ref<'unit' | 'integration' | 'legacy'>('legacy')

const hasRunnableTestsInMode = computed(
  () =>
    testSuiteMode.value === 'legacy' ||
    testSuiteMode.value === 'unit' ||
    testSuiteMode.value === 'integration'
)

const MAX_LOG_ENTRIES = 500
const logEntries = ref<LogEntry[]>([])
let logsSocketSubscription: { unsubscribe?: () => void } | null = null
const logsOutputRef = ref<HTMLElement | null>(null)
const logsLoading = ref(false)
const logsError = ref('')
const logsHasMore = ref(false)
const oldestLogTimestamp = ref<number | null>(null)
const logFilters = ref({ info: true, warn: true, error: true })

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
  }
}

const displayedLogs = computed<LogDisplayItem[]>(() => {
  const filtered = logEntries.value.filter((e) => {
    if (e.severity <= 3 && logFilters.value.error) return true
    if (e.severity === 4 && logFilters.value.warn) return true
    if (e.severity >= 5 && logFilters.value.info) return true
    return false
  })
  if (!filtered.length) return []
  const sorted = [...filtered].sort((a, b) => b.timestamp - a.timestamp)
  const items: LogDisplayItem[] = []
  let lastDateKey = ''
  for (let i = 0; i < sorted.length; i++) {
    const entry = sorted[i]
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

const toggleLogFilter = (level: 'info' | 'warn' | 'error') => {
  logFilters.value[level] = !logFilters.value[level]
  log.info('Фильтр логов переключён', level, logFilters.value[level])
}

const loadRecentLogs = async () => {
  logsLoading.value = true
  logsError.value = ''
  try {
    const res = await getRecentLogsRoute.query({ limit: 50 }).run(ctx)
    const data = res as {
      success?: boolean
      entries?: Array<LogEntry & { id: string }>
      error?: string
    }
    if (data?.success && Array.isArray(data.entries)) {
      logEntries.value = [...logEntries.value, ...data.entries]
      if (data.entries.length > 0) {
        const sorted = [...data.entries].sort((a, b) => a.timestamp - b.timestamp)
        oldestLogTimestamp.value = sorted[0].timestamp
      }
      logsHasMore.value = data.entries.length === 50
    } else {
      logsError.value = data?.error || 'Ошибка загрузки логов'
    }
  } catch (e) {
    logsError.value = (e as Error)?.message || 'Ошибка сети'
  } finally {
    logsLoading.value = false
  }
}

const loadMoreLogs = async () => {
  if (!oldestLogTimestamp.value) {
    log.warning('Попытка загрузить больше логов без oldestLogTimestamp')
    return
  }
  logsLoading.value = true
  logsError.value = ''
  try {
    const res = await getLogsBeforeRoute
      .query({ beforeTimestamp: String(oldestLogTimestamp.value), limit: 50 })
      .run(ctx)
    const data = res as {
      success?: boolean
      entries?: Array<LogEntry & { id: string }>
      hasMore?: boolean
      error?: string
    }
    if (data?.success && Array.isArray(data.entries)) {
      logEntries.value = [...logEntries.value, ...data.entries]
      if (data.entries.length > 0) {
        const sorted = [...data.entries].sort((a, b) => a.timestamp - b.timestamp)
        oldestLogTimestamp.value = sorted[0].timestamp
      }
      logsHasMore.value = data?.hasMore ?? data.entries.length === 50
      log.info('Дополнительные логи загружены', { count: data.entries.length })
    } else {
      logsError.value = data?.error || 'Ошибка загрузки логов'
      log.error('Ошибка загрузки дополнительных логов', logsError.value)
    }
  } catch (e) {
    logsError.value = (e as Error)?.message || 'Ошибка сети'
    log.error('Ошибка загрузки дополнительных логов', e)
  } finally {
    logsLoading.value = false
  }
}

const clearLogs = () => {
  logEntries.value = []
  oldestLogTimestamp.value = Date.now()
  logsHasMore.value = true
  logsError.value = ''
  log.info('Логи очищены, таймштамп сдвинут на текущий — «Загрузить ещё 50» восстановит последние')
}

const startAnimations = () => {
  log.info('Boot loader complete, tests page ready')
  bootLoaderDone.value = true
  showContent.value = true
}

onMounted(() => {
  log.info('Component mounted')
  if (window.hideAppLoader) {
    window.hideAppLoader()
  }

  if ((window as any).bootLoaderComplete) {
    startAnimations()
  } else {
    window.addEventListener('bootloader-complete', startAnimations)
  }

  if (props.encodedLogsSocketId) {
    setLogSink((entry: LogEntry) => {
      logEntries.value.push(entry)
      trimOldLogs()
    })
    getOrCreateBrowserSocketClient()
      .then((socketClient) => {
        logsSocketSubscription = socketClient.subscribeToData(props.encodedLogsSocketId!)
        logsSocketSubscription.listen((data: { type?: string; data?: LogEntry }) => {
          if (data?.type === 'new-log' && data.data) {
            const entry = data.data as LogEntry
            logEntries.value.push(entry)
            trimOldLogs()
          }
        })
      })
      .catch((err) => log.error('Не удалось подписаться на логи по WebSocket', err))
    loadRecentLogs()
  }
})

onBeforeUnmount(() => {
  if (logsSocketSubscription?.unsubscribe) {
    logsSocketSubscription.unsubscribe()
    logsSocketSubscription = null
  }
})

onUnmounted(() => {
  log.info('Component unmounted')
  setLogSink(null)
  window.removeEventListener('bootloader-complete', startAnimations)
})

/* Дашборд тестов */
const testMetrics = ref({
  total: 0,
  passed: 0,
  failed: 0,
  skipped: 0,
  lastRunAt: null as string | null
})
const runAllTestsLoading = ref(false)

/** Результат одного теста */
type TestResult = { id: string; title: string; passed: boolean; error?: string }

/** Обновить результаты по id, не сбрасывая остальные строки блока */
function upsertTestResults(existing: TestResult[], incoming: TestResult[]): TestResult[] {
  const map = new Map(existing.map((r) => [r.id, r]))
  for (const u of incoming) {
    map.set(u.id, u)
  }
  return Array.from(map.values())
}

type SingleRunGroup =
  | 'endpoints'
  | 'settings'
  | 'settingsRepo'
  | 'loggerLib'
  | 'logsRepo'
  | 'dashboardLib'
  | 'settingKeys'
  | 'unitSaveCreds'
  | 'unitPageRoutes'
  | 'unitWebhookRoute'
  | 'integrationBoth'
  | 'integrationPages'

const singleTestRun = ref<{ group: SingleRunGroup; id: string } | null>(null)

function isSingleRunning(group: SingleRunGroup, id: string): boolean {
  const s = singleTestRun.value
  return s !== null && s.group === group && s.id === id
}

function isGroupBlockedBySingle(group: SingleRunGroup): boolean {
  return singleTestRun.value?.group === group
}

/** Базовый URL (origin + путь проекта без trailing slash) */
function getApiBaseUrl(): string {
  const path = props.indexUrl.startsWith('http') ? new URL(props.indexUrl).pathname : props.indexUrl
  const basePath = path.replace(/\/$/, '') || `/${PROJECT_ROOT}`
  const origin = props.indexUrl.startsWith('http')
    ? new URL(props.indexUrl).origin
    : window.location.origin
  return `${origin}${basePath.startsWith('/') ? basePath : '/' + basePath}`
}

/* --- Блок 1: Проверка эндпоинтов (маршруты /, /web/admin, ...) --- */
const ENDPOINTS_ROUTES: Array<{ id: string; path: string; title: string }> = [
  { id: 'index', path: '/', title: 'Эндпоинт /' },
  { id: 'web-admin', path: '/web/admin', title: 'Эндпоинт /web/admin' },
  { id: 'web-profile', path: '/web/profile', title: 'Эндпоинт /web/profile' },
  { id: 'web-login', path: '/web/login', title: 'Эндпоинт /web/login' },
  { id: 'web-tests', path: '/web/tests', title: 'Эндпоинт /web/tests' },
  { id: 'web-orders', path: '/web/orders', title: 'Эндпоинт /web/orders' }
]
const endpointsResults = ref<TestResult[]>([])
const endpointsLoading = ref(false)
const endpointsLastRunAt = ref<string | null>(null)

const endpointsDisplay = computed(() => {
  const byId = new Map(endpointsResults.value.map((r) => [r.id, r]))
  return ENDPOINTS_ROUTES.map((t) => {
    const res = byId.get(t.id)
    return {
      id: t.id,
      title: t.title,
      path: t.path,
      status: res === undefined ? 'todo' : res.passed ? 'success' : 'fail',
      error: res && !res.passed ? res.error : undefined
    }
  })
})

async function runEndpointsTests() {
  endpointsLoading.value = true
  endpointsResults.value = []
  const baseUrl = getApiBaseUrl().replace(/\/$/, '')
  log.info('Запуск проверки эндпоинтов')
  try {
    const results: TestResult[] = []
    for (const t of ENDPOINTS_ROUTES) {
      const url = `${baseUrl}${t.path === '/' ? '' : t.path}`
      try {
        const res = await fetch(url, { method: 'GET', credentials: 'include' })
        results.push({
          id: t.id,
          title: t.title,
          passed: res.ok,
          error: res.ok ? undefined : `HTTP ${res.status}`
        })
      } catch (e) {
        results.push({
          id: t.id,
          title: t.title,
          passed: false,
          error: (e as Error)?.message ?? String(e)
        })
      }
    }
    endpointsResults.value = results
    endpointsLastRunAt.value = new Date().toLocaleString('ru-RU')
    log.info('Проверка эндпоинтов завершена', {
      passed: results.filter((r) => r.passed).length,
      failed: results.filter((r) => !r.passed).length
    })
  } finally {
    endpointsLoading.value = false
  }
}

async function runSingleEndpointTest(testId: string) {
  const t = ENDPOINTS_ROUTES.find((x) => x.id === testId)
  if (!t) return
  singleTestRun.value = { group: 'endpoints', id: testId }
  const baseUrl = getApiBaseUrl().replace(/\/$/, '')
  try {
    const url = `${baseUrl}${t.path === '/' ? '' : t.path}`
    const res = await fetch(url, { method: 'GET', credentials: 'include' })
    endpointsResults.value = upsertTestResults(endpointsResults.value, [
      {
        id: t.id,
        title: t.title,
        passed: res.ok,
        error: res.ok ? undefined : `HTTP ${res.status}`
      }
    ])
    endpointsLastRunAt.value = new Date().toLocaleString('ru-RU')
  } catch (e) {
    endpointsResults.value = upsertTestResults(endpointsResults.value, [
      {
        id: t.id,
        title: t.title,
        passed: false,
        error: (e as Error)?.message ?? String(e)
      }
    ])
    endpointsLastRunAt.value = new Date().toLocaleString('ru-RU')
  } finally {
    singleTestRun.value = null
  }
}

/* --- Блок 2: Библиотека настроек (settings.lib) --- */
const SETTINGS_LIB_TESTS: Array<{ id: string; title: string }> = [
  { id: 'getSettingString', title: 'getSettingString (project_name)' },
  { id: 'getLogLevel', title: 'getLogLevel' },
  { id: 'getLogsLimit', title: 'getLogsLimit' },
  { id: 'getLogWebhook', title: 'getLogWebhook' },
  { id: 'getDashboardResetAt', title: 'getDashboardResetAt' },
  { id: 'getAllSettings', title: 'getAllSettings' }
]
const settingsResults = ref<TestResult[]>([])
const settingsLoading = ref(false)
const settingsLastRunAt = ref<string | null>(null)

const settingsDisplay = computed(() => {
  const byId = new Map(settingsResults.value.map((r) => [r.id, r]))
  return SETTINGS_LIB_TESTS.map((t) => {
    const res = byId.get(t.id)
    return {
      id: t.id,
      title: t.title,
      status: res === undefined ? 'todo' : res.passed ? 'success' : 'fail',
      error: res && !res.passed ? res.error : undefined
    }
  })
})

async function runSettingsTests() {
  settingsLoading.value = true
  settingsResults.value = []
  const baseUrl = getApiBaseUrl().replace(/\/$/, '')
  log.info('Запуск проверки библиотеки настроек')
  try {
    const res = await fetch(`${baseUrl}/api/tests/endpoints-check/settings-lib`, {
      method: 'GET',
      credentials: 'include'
    })
    const data = (await res.json().catch(() => null)) as {
      success?: boolean
      results?: TestResult[]
    }
    if (res.ok && data?.success && Array.isArray(data.results)) {
      settingsResults.value = data.results
    } else {
      settingsResults.value = SETTINGS_LIB_TESTS.map((t) => ({
        id: t.id,
        title: t.title,
        passed: false,
        error: 'Ошибка запроса'
      }))
    }
    settingsLastRunAt.value = new Date().toLocaleString('ru-RU')
  } finally {
    settingsLoading.value = false
  }
}

async function runSingleSettingsTest(testId: string) {
  singleTestRun.value = { group: 'settings', id: testId }
  const baseUrl = getApiBaseUrl().replace(/\/$/, '')
  const title = SETTINGS_LIB_TESTS.find((x) => x.id === testId)?.title ?? testId
  try {
    const res = await fetch(
      `${baseUrl}/api/tests/endpoints-check/settings-lib?testId=${encodeURIComponent(testId)}`,
      { method: 'GET', credentials: 'include' }
    )
    const data = (await res.json().catch(() => null)) as {
      success?: boolean
      results?: TestResult[]
      error?: string
    }
    if (res.ok && data?.success && Array.isArray(data.results) && data.results.length > 0) {
      settingsResults.value = upsertTestResults(settingsResults.value, data.results)
    } else {
      settingsResults.value = upsertTestResults(settingsResults.value, [
        { id: testId, title, passed: false, error: data?.error || 'Ошибка запроса' }
      ])
    }
    settingsLastRunAt.value = new Date().toLocaleString('ru-RU')
  } finally {
    singleTestRun.value = null
  }
}

/* --- Блок 3: Репозиторий настроек (settings.repo) --- */
const SETTINGS_REPO_TESTS: Array<{ id: string; title: string }> = [
  { id: 'upsert', title: 'upsert' },
  { id: 'deleteByKey', title: 'deleteByKey' },
  { id: 'findByKey', title: 'findByKey' },
  { id: 'findAll', title: 'findAll' }
]
const settingsRepoResults = ref<TestResult[]>([])
const settingsRepoLoading = ref(false)
const settingsRepoLastRunAt = ref<string | null>(null)

const settingsRepoDisplay = computed(() => {
  const byId = new Map(settingsRepoResults.value.map((r) => [r.id, r]))
  return SETTINGS_REPO_TESTS.map((t) => {
    const res = byId.get(t.id)
    return {
      id: t.id,
      title: t.title,
      status: res === undefined ? 'todo' : res.passed ? 'success' : 'fail',
      error: res && !res.passed ? res.error : undefined
    }
  })
})

async function runSettingsRepoTests() {
  settingsRepoLoading.value = true
  settingsRepoResults.value = []
  const baseUrl = getApiBaseUrl().replace(/\/$/, '')
  log.info('Запуск проверки репозитория настроек')
  try {
    const res = await fetch(`${baseUrl}/api/tests/endpoints-check/settings-repo`, {
      method: 'GET',
      credentials: 'include'
    })
    const data = (await res.json().catch(() => null)) as {
      success?: boolean
      results?: TestResult[]
    }
    if (res.ok && data?.success && Array.isArray(data.results)) {
      settingsRepoResults.value = data.results
    } else {
      settingsRepoResults.value = SETTINGS_REPO_TESTS.map((t) => ({
        id: t.id,
        title: t.title,
        passed: false,
        error: 'Ошибка запроса'
      }))
    }
    settingsRepoLastRunAt.value = new Date().toLocaleString('ru-RU')
  } finally {
    settingsRepoLoading.value = false
  }
}

async function runSingleSettingsRepoTest(testId: string) {
  singleTestRun.value = { group: 'settingsRepo', id: testId }
  const baseUrl = getApiBaseUrl().replace(/\/$/, '')
  const title = SETTINGS_REPO_TESTS.find((x) => x.id === testId)?.title ?? testId
  try {
    const res = await fetch(
      `${baseUrl}/api/tests/endpoints-check/settings-repo?testId=${encodeURIComponent(testId)}`,
      { method: 'GET', credentials: 'include' }
    )
    const data = (await res.json().catch(() => null)) as {
      success?: boolean
      results?: TestResult[]
      error?: string
    }
    if (res.ok && data?.success && Array.isArray(data.results) && data.results.length > 0) {
      settingsRepoResults.value = upsertTestResults(settingsRepoResults.value, data.results)
    } else {
      settingsRepoResults.value = upsertTestResults(settingsRepoResults.value, [
        { id: testId, title, passed: false, error: data?.error || 'Ошибка запроса' }
      ])
    }
    settingsRepoLastRunAt.value = new Date().toLocaleString('ru-RU')
  } finally {
    singleTestRun.value = null
  }
}

/* --- Блок 4: Библиотека логов (logger.lib) --- */
const LOGGER_LIB_TESTS: Array<{ id: string; title: string }> = [
  { id: 'getAdminLogsSocketId', title: 'getAdminLogsSocketId' },
  { id: 'shouldLogByLevel_Info', title: 'shouldLogByLevel (Info, 6)' },
  { id: 'shouldLogByLevel_Error', title: 'shouldLogByLevel (Error, 3)' },
  { id: 'shouldLogByLevel_Disable', title: 'shouldLogByLevel (Disable, 7)' }
]
const loggerLibResults = ref<TestResult[]>([])
const loggerLibLoading = ref(false)
const loggerLibLastRunAt = ref<string | null>(null)

const loggerLibDisplay = computed(() => {
  const byId = new Map(loggerLibResults.value.map((r) => [r.id, r]))
  return LOGGER_LIB_TESTS.map((t) => {
    const res = byId.get(t.id)
    return {
      id: t.id,
      title: t.title,
      status: res === undefined ? 'todo' : res.passed ? 'success' : 'fail',
      error: res && !res.passed ? res.error : undefined
    }
  })
})

async function runLoggerLibTests() {
  loggerLibLoading.value = true
  loggerLibResults.value = []
  const baseUrl = getApiBaseUrl().replace(/\/$/, '')
  log.info('Запуск проверки библиотеки логов')
  try {
    const res = await fetch(`${baseUrl}/api/tests/endpoints-check/logger-lib`, {
      method: 'GET',
      credentials: 'include'
    })
    const data = (await res.json().catch(() => null)) as {
      success?: boolean
      results?: TestResult[]
    }
    if (res.ok && data?.success && Array.isArray(data.results)) {
      loggerLibResults.value = data.results
    } else {
      loggerLibResults.value = LOGGER_LIB_TESTS.map((t) => ({
        id: t.id,
        title: t.title,
        passed: false,
        error: 'Ошибка запроса'
      }))
    }
    loggerLibLastRunAt.value = new Date().toLocaleString('ru-RU')
  } finally {
    loggerLibLoading.value = false
  }
}

async function runSingleLoggerLibTest(testId: string) {
  singleTestRun.value = { group: 'loggerLib', id: testId }
  const baseUrl = getApiBaseUrl().replace(/\/$/, '')
  const title = LOGGER_LIB_TESTS.find((x) => x.id === testId)?.title ?? testId
  try {
    const res = await fetch(
      `${baseUrl}/api/tests/endpoints-check/logger-lib?testId=${encodeURIComponent(testId)}`,
      { method: 'GET', credentials: 'include' }
    )
    const data = (await res.json().catch(() => null)) as {
      success?: boolean
      results?: TestResult[]
      error?: string
    }
    if (res.ok && data?.success && Array.isArray(data.results) && data.results.length > 0) {
      loggerLibResults.value = upsertTestResults(loggerLibResults.value, data.results)
    } else {
      loggerLibResults.value = upsertTestResults(loggerLibResults.value, [
        { id: testId, title, passed: false, error: data?.error || 'Ошибка запроса' }
      ])
    }
    loggerLibLastRunAt.value = new Date().toLocaleString('ru-RU')
  } finally {
    singleTestRun.value = null
  }
}

/* --- Блок 5: Репозиторий логов (logs.repo) --- */
const LOGS_REPO_TESTS: Array<{ id: string; title: string }> = [
  { id: 'create', title: 'create' },
  { id: 'findAll', title: 'findAll' },
  { id: 'findBeforeTimestamp', title: 'findBeforeTimestamp' },
  { id: 'countErrorsAfter', title: 'countErrorsAfter' },
  { id: 'countWarningsAfter', title: 'countWarningsAfter' }
]
const logsRepoResults = ref<TestResult[]>([])
const logsRepoLoading = ref(false)
const logsRepoLastRunAt = ref<string | null>(null)

const logsRepoDisplay = computed(() => {
  const byId = new Map(logsRepoResults.value.map((r) => [r.id, r]))
  return LOGS_REPO_TESTS.map((t) => {
    const res = byId.get(t.id)
    return {
      id: t.id,
      title: t.title,
      status: res === undefined ? 'todo' : res.passed ? 'success' : 'fail',
      error: res && !res.passed ? res.error : undefined
    }
  })
})

async function runLogsRepoTests() {
  logsRepoLoading.value = true
  logsRepoResults.value = []
  const baseUrl = getApiBaseUrl().replace(/\/$/, '')
  log.info('Запуск проверки репозитория логов')
  try {
    const res = await fetch(`${baseUrl}/api/tests/endpoints-check/logs-repo`, {
      method: 'GET',
      credentials: 'include'
    })
    const data = (await res.json().catch(() => null)) as {
      success?: boolean
      results?: TestResult[]
    }
    if (res.ok && data?.success && Array.isArray(data.results)) {
      logsRepoResults.value = data.results
    } else {
      logsRepoResults.value = LOGS_REPO_TESTS.map((t) => ({
        id: t.id,
        title: t.title,
        passed: false,
        error: 'Ошибка запроса'
      }))
    }
    logsRepoLastRunAt.value = new Date().toLocaleString('ru-RU')
  } finally {
    logsRepoLoading.value = false
  }
}

async function runSingleLogsRepoTest(testId: string) {
  singleTestRun.value = { group: 'logsRepo', id: testId }
  const baseUrl = getApiBaseUrl().replace(/\/$/, '')
  const title = LOGS_REPO_TESTS.find((x) => x.id === testId)?.title ?? testId
  try {
    const res = await fetch(
      `${baseUrl}/api/tests/endpoints-check/logs-repo?testId=${encodeURIComponent(testId)}`,
      { method: 'GET', credentials: 'include' }
    )
    const data = (await res.json().catch(() => null)) as {
      success?: boolean
      results?: TestResult[]
      error?: string
    }
    if (res.ok && data?.success && Array.isArray(data.results) && data.results.length > 0) {
      logsRepoResults.value = upsertTestResults(logsRepoResults.value, data.results)
    } else {
      logsRepoResults.value = upsertTestResults(logsRepoResults.value, [
        { id: testId, title, passed: false, error: data?.error || 'Ошибка запроса' }
      ])
    }
    logsRepoLastRunAt.value = new Date().toLocaleString('ru-RU')
  } finally {
    singleTestRun.value = null
  }
}

/* --- Блок 6: Библиотека админки (dashboard.lib) --- */
const DASHBOARD_LIB_TESTS: Array<{ id: string; title: string }> = [
  { id: 'getDashboardCounts', title: 'getDashboardCounts' },
  { id: 'resetDashboard', title: 'resetDashboard' }
]
const dashboardLibResults = ref<TestResult[]>([])
const dashboardLibLoading = ref(false)
const dashboardLibLastRunAt = ref<string | null>(null)

const dashboardLibDisplay = computed(() => {
  const byId = new Map(dashboardLibResults.value.map((r) => [r.id, r]))
  return DASHBOARD_LIB_TESTS.map((t) => {
    const res = byId.get(t.id)
    return {
      id: t.id,
      title: t.title,
      status: res === undefined ? 'todo' : res.passed ? 'success' : 'fail',
      error: res && !res.passed ? res.error : undefined
    }
  })
})

async function runDashboardLibTests() {
  dashboardLibLoading.value = true
  dashboardLibResults.value = []
  const baseUrl = getApiBaseUrl().replace(/\/$/, '')
  log.info('Запуск проверки библиотеки админки')
  try {
    const res = await fetch(`${baseUrl}/api/tests/endpoints-check/dashboard-lib`, {
      method: 'GET',
      credentials: 'include'
    })
    const data = (await res.json().catch(() => null)) as {
      success?: boolean
      results?: TestResult[]
    }
    if (res.ok && data?.success && Array.isArray(data.results)) {
      dashboardLibResults.value = data.results
    } else {
      dashboardLibResults.value = DASHBOARD_LIB_TESTS.map((t) => ({
        id: t.id,
        title: t.title,
        passed: false,
        error: 'Ошибка запроса'
      }))
    }
    dashboardLibLastRunAt.value = new Date().toLocaleString('ru-RU')
  } finally {
    dashboardLibLoading.value = false
  }
}

async function runSingleDashboardLibTest(testId: string) {
  singleTestRun.value = { group: 'dashboardLib', id: testId }
  const baseUrl = getApiBaseUrl().replace(/\/$/, '')
  const title = DASHBOARD_LIB_TESTS.find((x) => x.id === testId)?.title ?? testId
  try {
    const res = await fetch(
      `${baseUrl}/api/tests/endpoints-check/dashboard-lib?testId=${encodeURIComponent(testId)}`,
      { method: 'GET', credentials: 'include' }
    )
    const data = (await res.json().catch(() => null)) as {
      success?: boolean
      results?: TestResult[]
      error?: string
    }
    if (res.ok && data?.success && Array.isArray(data.results) && data.results.length > 0) {
      dashboardLibResults.value = upsertTestResults(dashboardLibResults.value, data.results)
    } else {
      dashboardLibResults.value = upsertTestResults(dashboardLibResults.value, [
        { id: testId, title, passed: false, error: data?.error || 'Ошибка запроса' }
      ])
    }
    dashboardLibLastRunAt.value = new Date().toLocaleString('ru-RU')
  } finally {
    singleTestRun.value = null
  }
}

function lavaStepToTestResult(
  step: { id: string; title: string; mode: 'results' | 'legacy' },
  res: Response,
  data: Record<string, unknown>
): TestResult {
  if (!res.ok) {
    return {
      id: step.id,
      title: step.title,
      passed: false,
      error: `HTTP ${res.status}`
    }
  }
  if (step.mode === 'results' && Array.isArray(data.results)) {
    const inner = data.results as Array<TestResult & { skipped?: boolean; detail?: string }>
    const executed = inner.filter((r) => !r.skipped)
    const allSkipped = inner.length > 0 && executed.length === 0
    const allPassed = !allSkipped && executed.length > 0 && executed.every((r) => r.passed)
    return {
      id: step.id,
      title: step.title,
      passed: allPassed,
      error: allPassed
        ? undefined
        : allSkipped
          ? inner
              .map((r) => r.detail || r.error)
              .filter(Boolean)
              .join('; ') || 'Все проверки пропущены (не заданы ключи в настройках)'
          : executed
              .filter((r) => !r.passed)
              .map((r) => r.error || r.id)
              .join('; ')
    }
  }
  const success = data.success === true
  const skipped = data.skipped === true
  return {
    id: step.id,
    title: step.title,
    passed: success || skipped,
    error: success || skipped ? undefined : String(data.error ?? 'Ошибка')
  }
}

/* --- Вкладка «Юнит»: слияние ключей для save (без сети) --- */
const UNIT_SAVE_CREDS_TESTS: Array<{ id: string; title: string }> = [
  { id: 'gc_merge_save_key_only', title: 'GC: только gc_api_key — домен из Heap' },
  { id: 'gc_merge_save_domain_only', title: 'GC: только gc_account_domain — ключ из Heap' },
  { id: 'gc_verify_when_both_nonempty', title: 'GC: verify при полной паре' },
  { id: 'gc_no_verify_when_one_empty', title: 'GC: без verify при неполной паре' },
  { id: 'gc_wrong_key_null', title: 'GC: посторонний ключ → null' },
  { id: 'lava_merge_save_key_only', title: 'Lava: только ключ — URL из Heap' },
  { id: 'lava_merge_save_url_normalizes_host', title: 'Lava: нормализация base URL' },
  { id: 'lava_verify_when_both_nonempty', title: 'Lava: verify при полной паре' },
  { id: 'lava_no_verify_empty_api_key', title: 'Lava: без verify при пустом ключе' },
  { id: 'lava_wrong_key_null', title: 'Lava: посторонний ключ → null' }
]
const unitSaveCredsResults = ref<TestResult[]>([])
const unitSaveCredsLoading = ref(false)
const unitSaveCredsLastRunAt = ref<string | null>(null)

const unitSaveCredsDisplay = computed(() => {
  const byId = new Map(unitSaveCredsResults.value.map((r) => [r.id, r]))
  return UNIT_SAVE_CREDS_TESTS.map((t) => {
    const res = byId.get(t.id)
    return {
      id: t.id,
      title: t.title,
      status: res === undefined ? 'todo' : res.passed ? 'success' : 'fail',
      error: res && !res.passed ? res.error : undefined
    }
  })
})

async function runUnitSaveCredsTests() {
  unitSaveCredsLoading.value = true
  unitSaveCredsResults.value = []
  const baseUrl = getApiBaseUrl().replace(/\/$/, '')
  log.info('Юнит-тесты: слияние ключей save')
  try {
    const res = await fetch(`${baseUrl}/api/tests/endpoints-check/settings-save-credentials-unit`, {
      method: 'GET',
      credentials: 'include'
    })
    const data = (await res.json().catch(() => null)) as {
      success?: boolean
      results?: TestResult[]
    }
    if (res.ok && data?.success !== undefined && Array.isArray(data.results)) {
      unitSaveCredsResults.value = data.results
    } else {
      unitSaveCredsResults.value = UNIT_SAVE_CREDS_TESTS.map((t) => ({
        id: t.id,
        title: t.title,
        passed: false,
        error: 'Ошибка запроса'
      }))
    }
    unitSaveCredsLastRunAt.value = new Date().toLocaleString('ru-RU')
  } finally {
    unitSaveCredsLoading.value = false
  }
}

async function runSingleUnitSaveCredsTest(testId: string) {
  const title = UNIT_SAVE_CREDS_TESTS.find((x) => x.id === testId)?.title ?? testId
  singleTestRun.value = { group: 'unitSaveCreds', id: testId }
  const baseUrl = getApiBaseUrl().replace(/\/$/, '')
  try {
    const res = await fetch(
      `${baseUrl}/api/tests/endpoints-check/settings-save-credentials-unit?testId=${encodeURIComponent(testId)}`,
      { method: 'GET', credentials: 'include' }
    )
    const data = (await res.json().catch(() => null)) as {
      success?: boolean
      results?: TestResult[]
      error?: string
    }
    if (
      res.ok &&
      data?.success !== undefined &&
      Array.isArray(data.results) &&
      data.results.length > 0
    ) {
      unitSaveCredsResults.value = upsertTestResults(unitSaveCredsResults.value, data.results)
    } else {
      unitSaveCredsResults.value = upsertTestResults(unitSaveCredsResults.value, [
        { id: testId, title, passed: false, error: data?.error || 'Ошибка запроса' }
      ])
    }
    unitSaveCredsLastRunAt.value = new Date().toLocaleString('ru-RU')
  } finally {
    singleTestRun.value = null
  }
}

/* --- Вкладка «Юнит»: страницы через route.run (тот же ctx, без HTTP) --- */
const UNIT_PAGE_ROUTES: Array<{ id: string; title: string }> = [
  { id: 'index', title: 'Главная (/)' },
  { id: 'web-admin', title: 'Админка /web/admin' },
  { id: 'web-profile', title: 'Профиль /web/profile' },
  { id: 'web-login', title: 'Вход /web/login' },
  { id: 'web-tests', title: 'Тесты /web/tests' },
  { id: 'web-orders', title: 'Заказы /web/orders' }
]
const unitPageRoutesResults = ref<TestResult[]>([])
const unitPageRoutesLoading = ref(false)
const unitPageRoutesLastRunAt = ref<string | null>(null)

const unitPageRoutesDisplay = computed(() => {
  const byId = new Map(unitPageRoutesResults.value.map((r) => [r.id, r]))
  return UNIT_PAGE_ROUTES.map((t) => {
    const res = byId.get(t.id)
    return {
      id: t.id,
      title: t.title,
      status: res === undefined ? 'todo' : res.passed ? 'success' : 'fail',
      error: res && !res.passed ? res.error : undefined
    }
  })
})

async function runUnitPageRoutesTests() {
  unitPageRoutesLoading.value = true
  unitPageRoutesResults.value = []
  const baseUrl = getApiBaseUrl().replace(/\/$/, '')
  log.info('Юнит: страницы (route.run)')
  try {
    const res = await fetch(`${baseUrl}/api/tests/endpoints-check/page-routes-unit`, {
      method: 'GET',
      credentials: 'include'
    })
    const data = (await res.json().catch(() => null)) as {
      success?: boolean
      results?: TestResult[]
      error?: string
    }
    if (data?.success && Array.isArray(data.results)) {
      unitPageRoutesResults.value = data.results
    } else {
      unitPageRoutesResults.value = UNIT_PAGE_ROUTES.map((t) => ({
        id: t.id,
        title: t.title,
        passed: false,
        error: data?.error || 'Ошибка запроса'
      }))
    }
    unitPageRoutesLastRunAt.value = new Date().toLocaleString('ru-RU')
  } finally {
    unitPageRoutesLoading.value = false
  }
}

async function runSingleUnitPageRouteTest(testId: string) {
  const meta = UNIT_PAGE_ROUTES.find((s) => s.id === testId)
  if (!meta) return
  singleTestRun.value = { group: 'unitPageRoutes', id: testId }
  const baseUrl = getApiBaseUrl().replace(/\/$/, '')
  try {
    const res = await fetch(
      `${baseUrl}/api/tests/endpoints-check/page-routes-unit?testId=${encodeURIComponent(testId)}`,
      { method: 'GET', credentials: 'include' }
    )
    const data = (await res.json().catch(() => null)) as {
      success?: boolean
      results?: TestResult[]
      error?: string
    }
    if (data?.success && Array.isArray(data.results) && data.results.length > 0) {
      unitPageRoutesResults.value = upsertTestResults(unitPageRoutesResults.value, data.results)
    } else {
      unitPageRoutesResults.value = upsertTestResults(unitPageRoutesResults.value, [
        { id: testId, title: meta.title, passed: false, error: data?.error || 'Ошибка запроса' }
      ])
    }
    unitPageRoutesLastRunAt.value = new Date().toLocaleString('ru-RU')
  } finally {
    singleTestRun.value = null
  }
}

/* --- Вкладка «Юнит»: POST …/api/integrations/lava/webhook (lavaWebhookInfoRoute / lavaWebhookRoute.run) --- */
const UNIT_WEBHOOK_ROUTE_TESTS: Array<{ id: string; title: string }> = [
  { id: 'info_get', title: 'GET-проба: ok, ready, webhookSecretConfigured' },
  { id: 'post_wrong_api_key', title: 'POST: неверный X-Api-Key → отказ' },
  { id: 'post_missing_api_key', title: 'POST: без ключа при заданном секрете → отказ' },
  { id: 'post_invalid_body', title: 'POST: невалидный eventType → валидация' },
  {
    id: 'post_success_contract_not_found',
    title: 'POST: верный ключ + тело → success (контракт не в Heap)'
  }
]
const unitWebhookRouteResults = ref<TestResult[]>([])
const unitWebhookRouteLoading = ref(false)
const unitWebhookRouteLastRunAt = ref<string | null>(null)

const unitWebhookRouteDisplay = computed(() => {
  const byId = new Map(unitWebhookRouteResults.value.map((r) => [r.id, r]))
  return UNIT_WEBHOOK_ROUTE_TESTS.map((t) => {
    const res = byId.get(t.id)
    return {
      id: t.id,
      title: t.title,
      status: res === undefined ? 'todo' : res.passed ? 'success' : 'fail',
      error: res && !res.passed ? res.error : undefined
    }
  })
})

async function runUnitWebhookRouteTests() {
  unitWebhookRouteLoading.value = true
  unitWebhookRouteResults.value = []
  const baseUrl = getApiBaseUrl().replace(/\/$/, '')
  log.info('Юнит: Lava webhook (route.run)')
  try {
    const res = await fetch(`${baseUrl}/api/tests/endpoints-check/lava-webhook-route`, {
      method: 'GET',
      credentials: 'include'
    })
    const data = (await res.json().catch(() => null)) as {
      success?: boolean
      results?: TestResult[]
      error?: string
    }
    if (data?.success && Array.isArray(data.results)) {
      unitWebhookRouteResults.value = data.results
    } else {
      unitWebhookRouteResults.value = UNIT_WEBHOOK_ROUTE_TESTS.map((t) => ({
        id: t.id,
        title: t.title,
        passed: false,
        error: data?.error || 'Ошибка запроса'
      }))
    }
    unitWebhookRouteLastRunAt.value = new Date().toLocaleString('ru-RU')
  } finally {
    unitWebhookRouteLoading.value = false
  }
}

async function runSingleUnitWebhookRouteTest(testId: string) {
  const meta = UNIT_WEBHOOK_ROUTE_TESTS.find((s) => s.id === testId)
  if (!meta) return
  singleTestRun.value = { group: 'unitWebhookRoute', id: testId }
  const baseUrl = getApiBaseUrl().replace(/\/$/, '')
  try {
    const res = await fetch(
      `${baseUrl}/api/tests/endpoints-check/lava-webhook-route?testId=${encodeURIComponent(testId)}`,
      { method: 'GET', credentials: 'include' }
    )
    const data = (await res.json().catch(() => null)) as {
      success?: boolean
      results?: TestResult[]
      error?: string
    }
    if (data?.success && Array.isArray(data.results) && data.results.length > 0) {
      unitWebhookRouteResults.value = upsertTestResults(unitWebhookRouteResults.value, data.results)
    } else {
      unitWebhookRouteResults.value = upsertTestResults(unitWebhookRouteResults.value, [
        { id: testId, title: meta.title, passed: false, error: data?.error || 'Ошибка запроса' }
      ])
    }
    unitWebhookRouteLastRunAt.value = new Date().toLocaleString('ru-RU')
  } finally {
    singleTestRun.value = null
  }
}

/* --- Вкладка «Интеграция»: страницы — только fetch из браузера (cookies → сессия админа) --- */
const INTEGRATION_PAGE_ROUTES: Array<{ id: string; path: string; title: string }> = [
  { id: 'index', path: '/', title: 'Главная (/)' },
  { id: 'web-admin', path: '/web/admin', title: 'Админка /web/admin' },
  { id: 'web-profile', path: '/web/profile', title: 'Профиль /web/profile' },
  { id: 'web-login', path: '/web/login', title: 'Вход /web/login' },
  { id: 'web-tests', path: '/web/tests', title: 'Тесты /web/tests' },
  { id: 'web-orders', path: '/web/orders', title: 'Заказы /web/orders' }
]
const integrationPageResults = ref<TestResult[]>([])
const integrationPageLoading = ref(false)
const integrationPageLastRunAt = ref<string | null>(null)

const integrationPageDisplay = computed(() => {
  const byId = new Map(integrationPageResults.value.map((r) => [r.id, r]))
  return INTEGRATION_PAGE_ROUTES.map((t) => {
    const res = byId.get(t.id)
    return {
      id: t.id,
      title: t.title,
      status: res === undefined ? 'todo' : res.passed ? 'success' : 'fail',
      error: res && !res.passed ? res.error : undefined
    }
  })
})

function buildIntegrationPageUrl(baseUrl: string, path: string): string {
  const base = baseUrl.replace(/\/$/, '')
  return path === '/' ? base : `${base}${path}`
}

async function probeIntegrationPage(
  baseUrl: string,
  route: { id: string; path: string; title: string }
): Promise<TestResult> {
  const url = buildIntegrationPageUrl(baseUrl, route.path)
  try {
    const res = await fetch(url, {
      method: 'GET',
      credentials: 'include',
      redirect: 'manual'
    })
    const status = res.status
    let bodyText = ''
    if (status >= 200 && status < 300) {
      bodyText = await res.text()
    }
    const ev = evaluatePageRouteResponse(status, bodyText, res.headers)
    return {
      id: route.id,
      title: route.title,
      passed: ev.ok,
      error: ev.ok ? undefined : ev.detail
    }
  } catch (e) {
    return {
      id: route.id,
      title: route.title,
      passed: false,
      error: (e as Error)?.message ?? String(e)
    }
  }
}

async function runIntegrationPageRoutesTests() {
  integrationPageLoading.value = true
  integrationPageResults.value = []
  const baseUrl = getApiBaseUrl().replace(/\/$/, '')
  log.info('Интеграция: проверка страниц (fetch из браузера + разбор тела)')
  try {
    const out: TestResult[] = []
    for (const route of INTEGRATION_PAGE_ROUTES) {
      out.push(await probeIntegrationPage(baseUrl, route))
    }
    integrationPageResults.value = out
    integrationPageLastRunAt.value = new Date().toLocaleString('ru-RU')
  } finally {
    integrationPageLoading.value = false
  }
}

async function runSingleIntegrationPageTest(testId: string) {
  const meta = INTEGRATION_PAGE_ROUTES.find((s) => s.id === testId)
  if (!meta) return
  singleTestRun.value = { group: 'integrationPages', id: testId }
  const baseUrl = getApiBaseUrl().replace(/\/$/, '')
  try {
    const one = await probeIntegrationPage(baseUrl, meta)
    integrationPageResults.value = upsertTestResults(integrationPageResults.value, [one])
    integrationPageLastRunAt.value = new Date().toLocaleString('ru-RU')
  } finally {
    singleTestRun.value = null
  }
}

/* --- Вкладка «Интеграция»: GetCourse и Lava отдельными запросами (как в админке) --- */
const INTEGRATION_TAB_CREDENTIAL_TESTS: Array<{
  id: string
  title: string
  path: string
  mode: 'results' | 'legacy'
}> = [
  {
    id: 'integration-gc-credentials',
    title: 'GetCourse: API-ключ и домен (PL API)',
    path: '/api/tests/endpoints-check/integration-gc-credentials',
    mode: 'legacy'
  },
  {
    id: 'integration-lava-credentials',
    title: 'Lava: API-ключ и базовый URL (GET /api/v2/products)',
    path: '/api/tests/endpoints-check/integration-lava-credentials',
    mode: 'legacy'
  }
]
const integrationBothResults = ref<TestResult[]>([])
const integrationBothLoading = ref(false)
const integrationBothLastRunAt = ref<string | null>(null)

type PaymentLinkTestVisualStatus = 'todo' | 'success' | 'skip' | 'fail'

const paymentLinkDryRunUnitLoading = ref(false)
const paymentLinkDryRunUnitLastAt = ref<string | null>(null)
const paymentLinkDryRunRow = ref<{ status: PaymentLinkTestVisualStatus; detail?: string }>({
  status: 'todo'
})
const paymentLinkDryRunRaw = ref<string | null>(null)

const paymentLinkHttpIntegrationLoading = ref(false)
const paymentLinkHttpIntegrationLastAt = ref<string | null>(null)
const paymentLinkHttpRow = ref<{ status: PaymentLinkTestVisualStatus; detail?: string }>({
  status: 'todo'
})
const paymentLinkHttpRaw = ref<string | null>(null)

const paymentLinkHeapSettingsLoading = ref(false)
const paymentLinkHeapSettingsLastAt = ref<string | null>(null)
const paymentLinkHeapSettingsRow = ref<{ status: PaymentLinkTestVisualStatus; detail?: string }>({
  status: 'todo'
})
const paymentLinkHeapSettingsRaw = ref<string | null>(null)

const paymentLinkFullRouteRunLoading = ref(false)
const paymentLinkFullRouteRunLastAt = ref<string | null>(null)
const paymentLinkFullRouteRunRow = ref<{ status: PaymentLinkTestVisualStatus; detail?: string }>({
  status: 'todo'
})
const paymentLinkFullRouteRunRaw = ref<string | null>(null)

const paymentLinkFullHttpLoading = ref(false)
const paymentLinkFullHttpLastAt = ref<string | null>(null)
const paymentLinkFullHttpRow = ref<{ status: PaymentLinkTestVisualStatus; detail?: string }>({
  status: 'todo'
})
const paymentLinkFullHttpRaw = ref<string | null>(null)

/** Последний успешный лайв контракт (route.run или HTTP) для проверки webhook. */
const paymentLinkLiveSnapshot = ref<{
  lavaContractId: string
  paymentUrl: string
  source: 'route' | 'http'
} | null>(null)

type WebhookLiveTestStateUi = {
  expectedLavaContractId: string
  paymentUrl?: string
  armedAt: number
  status: 'armed' | 'success'
  successAt?: number
  otherEvents: Array<{ at: number; reason: string; payloadJson: string }>
}

const webhookLiveApiResponse = ref<{
  webhookUrl: string | null
  state: WebhookLiveTestStateUi | null
} | null>(null)
const webhookLiveStatusLoading = ref(false)
const webhookLiveArmLoading = ref(false)
let webhookLivePollTimer: ReturnType<typeof setInterval> | null = null

function stopWebhookLivePolling() {
  if (webhookLivePollTimer != null) {
    clearInterval(webhookLivePollTimer)
    webhookLivePollTimer = null
  }
}

function startWebhookLivePolling() {
  stopWebhookLivePolling()
  webhookLivePollTimer = window.setInterval(() => {
    void fetchWebhookLiveTestStatusQuiet()
  }, 3000)
}

/** Без сброса loading — для фонового опроса. */
async function fetchWebhookLiveTestStatusQuiet() {
  const baseUrl = getApiBaseUrl().replace(/\/$/, '')
  try {
    const res = await fetch(`${baseUrl}/api/tests/endpoints-check/webhook-live-test-status`, {
      method: 'GET',
      credentials: 'include'
    })
    const data = (await res.json().catch(() => null)) as Record<string, unknown>
    if (data?.success === true) {
      webhookLiveApiResponse.value = {
        webhookUrl: typeof data.webhookUrl === 'string' ? data.webhookUrl : null,
        state: (data.state as WebhookLiveTestStateUi) ?? null
      }
      if (webhookLiveApiResponse.value.state?.status === 'success') {
        stopWebhookLivePolling()
      }
    }
  } catch {
    /* ignore */
  }
}

async function fetchWebhookLiveTestStatus() {
  webhookLiveStatusLoading.value = true
  try {
    await fetchWebhookLiveTestStatusQuiet()
    const st = webhookLiveApiResponse.value?.state?.status
    if (st === 'armed') {
      startWebhookLivePolling()
    } else {
      stopWebhookLivePolling()
    }
  } finally {
    webhookLiveStatusLoading.value = false
  }
}

async function armWebhookLiveTestFromSnapshot() {
  const snap = paymentLinkLiveSnapshot.value
  if (!snap?.lavaContractId) {
    log.warn('arm webhook live test: нет lavaContractId — сначала успешный лайв payment-link')
    return
  }
  webhookLiveArmLoading.value = true
  const baseUrl = getApiBaseUrl().replace(/\/$/, '')
  try {
    const res = await fetch(`${baseUrl}/api/tests/endpoints-check/webhook-live-test-arm`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        expectedLavaContractId: snap.lavaContractId,
        paymentUrl: snap.paymentUrl
      })
    })
    const data = (await res.json().catch(() => null)) as Record<string, unknown>
    if (data?.success === true) {
      log.info('webhook live test: вооружено', snap.lavaContractId)
      await fetchWebhookLiveTestStatus()
      startWebhookLivePolling()
    } else {
      log.warn('webhook live test: arm failed', data)
    }
  } finally {
    webhookLiveArmLoading.value = false
  }
}

function extractLivePaymentLinkFromRouteData(data: unknown): {
  lavaContractId?: string
  paymentUrl?: string
} {
  if (!data || typeof data !== 'object') return {}
  const d = data as Record<string, unknown>
  const rr = d.routeResult as Record<string, unknown> | undefined
  if (rr?.success === true) {
    return {
      lavaContractId: typeof rr.lavaContractId === 'string' ? rr.lavaContractId : undefined,
      paymentUrl: typeof rr.paymentUrl === 'string' ? rr.paymentUrl : undefined
    }
  }
  return {}
}

function extractLivePaymentLinkFromHttpData(data: unknown): {
  lavaContractId?: string
  paymentUrl?: string
} {
  if (!data || typeof data !== 'object') return {}
  const d = data as Record<string, unknown>
  const body = d.responseBody as Record<string, unknown> | undefined
  if (body?.success === true) {
    return {
      lavaContractId: typeof body.lavaContractId === 'string' ? body.lavaContractId : undefined,
      paymentUrl: typeof body.paymentUrl === 'string' ? body.paymentUrl : undefined
    }
  }
  return {}
}

function maybeUpdatePaymentLinkLiveSnapshot(
  source: 'route' | 'http',
  data: unknown,
  rowStatus: PaymentLinkTestVisualStatus
) {
  if (rowStatus !== 'success') return
  const ex =
    source === 'route'
      ? extractLivePaymentLinkFromRouteData(data)
      : extractLivePaymentLinkFromHttpData(data)
  if (ex.lavaContractId && ex.paymentUrl) {
    paymentLinkLiveSnapshot.value = {
      lavaContractId: ex.lavaContractId,
      paymentUrl: ex.paymentUrl,
      source
    }
  }
}

const gcOrderPlProbeId = ref('')
const gcOrderPlProbeBuyerEmail = ref('')
const gcOrderPlApiLoading = ref(false)
const gcOrderPlApiLastAt = ref<string | null>(null)
const gcOrderPlApiRaw = ref<unknown>(null)

async function runIntegrationGcOrderPlApiTest() {
  const id = gcOrderPlProbeId.value.trim()
  if (!id) return
  gcOrderPlApiLoading.value = true
  gcOrderPlApiRaw.value = null
  try {
    const baseUrl = getApiBaseUrl().replace(/\/$/, '')
    const email = gcOrderPlProbeBuyerEmail.value.trim()
    const q = new URLSearchParams({ gcOrderId: id })
    if (email) q.set('buyerEmail', email)
    const res = await fetch(
      `${baseUrl}/api/tests/endpoints-check/integration-gc-order-pl-api?${q.toString()}`,
      {
        method: 'GET',
        credentials: 'include'
      }
    )
    gcOrderPlApiRaw.value = await res.json().catch(() => ({ parseError: true }))
    gcOrderPlApiLastAt.value = new Date().toLocaleString('ru-RU')
  } catch (e) {
    gcOrderPlApiRaw.value = { error: String(e) }
    gcOrderPlApiLastAt.value = new Date().toLocaleString('ru-RU')
  } finally {
    gcOrderPlApiLoading.value = false
  }
}

const integrationPaymentLinkBusy = computed(
  () =>
    paymentLinkDryRunUnitLoading.value ||
    paymentLinkHttpIntegrationLoading.value ||
    paymentLinkHeapSettingsLoading.value ||
    paymentLinkFullRouteRunLoading.value ||
    paymentLinkFullHttpLoading.value ||
    webhookLiveStatusLoading.value ||
    webhookLiveArmLoading.value ||
    gcOrderPlApiLoading.value
)

const webhookLivePaymentUrlDisplay = computed(() => {
  const fromState = webhookLiveApiResponse.value?.state?.paymentUrl
  if (fromState && fromState.trim()) return fromState.trim()
  return paymentLinkLiveSnapshot.value?.paymentUrl?.trim() ?? ''
})

watch(
  () => [showContent.value, testSuiteMode.value] as const,
  ([show, mode]) => {
    if (show && mode === 'integration') {
      void fetchWebhookLiveTestStatus()
    } else {
      stopWebhookLivePolling()
    }
  },
  { immediate: true }
)

onBeforeUnmount(() => {
  stopWebhookLivePolling()
})

function parsePaymentLinkDryRunResponse(data: unknown): {
  status: PaymentLinkTestVisualStatus
  detail?: string
} {
  if (!data || typeof data !== 'object') {
    return { status: 'fail', detail: 'Пустой или неверный ответ' }
  }
  const d = data as Record<string, unknown>
  if (d.skipped === true) {
    return { status: 'skip', detail: String(d.reason ?? 'Пропуск') }
  }
  if (d.success === true) {
    return {
      status: 'success',
      detail: typeof d.gcOrderId === 'string' ? `order: ${d.gcOrderId}` : undefined
    }
  }
  return { status: 'fail', detail: String(d.error ?? 'Проверка не прошла') }
}

function parsePaymentLinkHttpIntegrationResponse(data: unknown): {
  status: PaymentLinkTestVisualStatus
  detail?: string
} {
  if (!data || typeof data !== 'object') {
    return { status: 'fail', detail: 'Пустой или неверный ответ' }
  }
  const d = data as Record<string, unknown>
  if (d.skipped === true) {
    const hint = typeof d.hint === 'string' ? ` ${d.hint}` : ''
    return { status: 'skip', detail: `${String(d.reason ?? 'Пропуск')}.${hint}`.trim() }
  }
  if (d.success === true) {
    const code = d.statusCode != null ? `HTTP ${d.statusCode}` : 'OK'
    return { status: 'success', detail: String(code) }
  }
  return {
    status: 'fail',
    detail: [d.error, d.hint].filter(Boolean).join(' — ') || 'Ошибка'
  }
}

function parsePaymentLinkHeapSettingsRead(data: unknown): {
  status: PaymentLinkTestVisualStatus
  detail?: string
} {
  if (!data || typeof data !== 'object') {
    return { status: 'fail', detail: 'Пустой или неверный ответ' }
  }
  const d = data as Record<string, unknown>
  const sr = d.settingsRead as Record<string, unknown> | undefined
  if (d.success === true && sr && sr.allRequiredPresent === true) {
    return {
      status: 'success',
      detail: 'Heap: lava_api_key (маска), base_url, product_id, offer_id'
    }
  }
  return {
    status: 'fail',
    detail: String(d.errorCode ?? 'Неполные настройки в Heap')
  }
}

function parsePaymentLinkFullRouteRunResponse(data: unknown): {
  status: PaymentLinkTestVisualStatus
  detail?: string
} {
  if (!data || typeof data !== 'object') {
    return { status: 'fail', detail: 'Пустой или неверный ответ' }
  }
  const d = data as Record<string, unknown>
  if (d.success === true) {
    const rr = d.routeResult as Record<string, unknown> | undefined
    if (rr?.success === true && typeof rr.paymentUrl === 'string') {
      const n = typeof d.deactivatedActiveContracts === 'number' ? d.deactivatedActiveContracts : 0
      return { status: 'success', detail: `контрактов снято с активных: ${n}` }
    }
    return { status: 'fail', detail: String(rr?.errorCode ?? 'route.run не вернул success') }
  }
  return { status: 'fail', detail: String(d.errorCode ?? 'Ошибка') }
}

function parsePaymentLinkFullHttpLiveResponse(data: unknown): {
  status: PaymentLinkTestVisualStatus
  detail?: string
} {
  if (!data || typeof data !== 'object') {
    return { status: 'fail', detail: 'Пустой или неверный ответ' }
  }
  const d = data as Record<string, unknown>
  if (d.skipped === true) {
    const hint = typeof d.hint === 'string' ? ` ${d.hint}` : ''
    return { status: 'skip', detail: `${String(d.reason ?? 'Пропуск')}.${hint}`.trim() }
  }
  if (d.success === true) {
    const body = d.responseBody as Record<string, unknown> | undefined
    const code = d.statusCode != null ? `HTTP ${d.statusCode}` : 'OK'
    if (body?.success === true && typeof body.paymentUrl === 'string') {
      return { status: 'success', detail: String(code) }
    }
    return { status: 'fail', detail: String(body?.errorCode ?? 'В теле нет success/paymentUrl') }
  }
  return {
    status: 'fail',
    detail: [d.error, d.errorCode].filter(Boolean).join(' — ') || 'Ошибка'
  }
}

function paymentLinkRowBadgeLabel(status: PaymentLinkTestVisualStatus): string {
  switch (status) {
    case 'success':
      return '[OK]'
    case 'fail':
      return '[FAIL]'
    case 'skip':
      return '[SKIP]'
    default:
      return '[TODO]'
  }
}

const integrationBothDisplay = computed(() => {
  const byId = new Map(integrationBothResults.value.map((r) => [r.id, r]))
  return INTEGRATION_TAB_CREDENTIAL_TESTS.map((t) => {
    const res = byId.get(t.id)
    return {
      id: t.id,
      title: t.title,
      status: res === undefined ? 'todo' : res.passed ? 'success' : 'fail',
      error: res && !res.passed ? res.error : undefined
    }
  })
})

async function runIntegrationBothTests() {
  integrationBothLoading.value = true
  integrationBothResults.value = []
  const baseUrl = getApiBaseUrl().replace(/\/$/, '')
  log.info('Интеграция: проверка GetCourse и Lava из Heap (отдельные GET)')
  const out: TestResult[] = []
  try {
    for (const step of INTEGRATION_TAB_CREDENTIAL_TESTS) {
      try {
        const res = await fetch(`${baseUrl}${step.path}`, { method: 'GET', credentials: 'include' })
        const data = (await res.json().catch(() => null)) as Record<string, unknown>
        out.push(lavaStepToTestResult(step, res, data))
      } catch (e) {
        out.push({
          id: step.id,
          title: step.title,
          passed: false,
          error: (e as Error)?.message ?? String(e)
        })
      }
    }
    integrationBothResults.value = out
    integrationBothLastRunAt.value = new Date().toLocaleString('ru-RU')
  } finally {
    integrationBothLoading.value = false
  }
}

async function runPaymentLinkDryRunUnit() {
  paymentLinkDryRunUnitLoading.value = true
  const baseUrl = getApiBaseUrl().replace(/\/$/, '')
  log.info('Юнит: payment-link dry-run (route.run)')
  try {
    const res = await fetch(`${baseUrl}/api/tests/endpoints-check/payment-link-dry-run-unit`, {
      method: 'GET',
      credentials: 'include'
    })
    const data = await res.json().catch(() => null)
    paymentLinkDryRunRow.value = parsePaymentLinkDryRunResponse(data)
    paymentLinkDryRunRaw.value = data ? JSON.stringify(data, null, 2) : null
    paymentLinkDryRunUnitLastAt.value = new Date().toLocaleString('ru-RU')
  } finally {
    paymentLinkDryRunUnitLoading.value = false
  }
}

async function runPaymentLinkHttpIntegration() {
  paymentLinkHttpIntegrationLoading.value = true
  const baseUrl = getApiBaseUrl().replace(/\/$/, '')
  log.info('Интеграция: HTTP POST payment-link (request на сервере)')
  try {
    const res = await fetch(`${baseUrl}/api/tests/endpoints-check/payment-link-http-integration`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({})
    })
    const data = await res.json().catch(() => null)
    paymentLinkHttpRow.value = parsePaymentLinkHttpIntegrationResponse(data)
    paymentLinkHttpRaw.value = data ? JSON.stringify(data, null, 2) : null
    paymentLinkHttpIntegrationLastAt.value = new Date().toLocaleString('ru-RU')
  } finally {
    paymentLinkHttpIntegrationLoading.value = false
  }
}

async function runPaymentLinkBothTests() {
  await runPaymentLinkDryRunUnit()
  await runPaymentLinkHttpIntegration()
}

async function runPaymentLinkHeapSettingsRead() {
  paymentLinkHeapSettingsLoading.value = true
  const baseUrl = getApiBaseUrl().replace(/\/$/, '')
  log.info('Лайв: чтение Heap (Lava для payment-link)')
  try {
    const res = await fetch(
      `${baseUrl}/api/tests/endpoints-check/payment-link-heap-settings-read`,
      {
        method: 'GET',
        credentials: 'include'
      }
    )
    const data = await res.json().catch(() => null)
    paymentLinkHeapSettingsRow.value = parsePaymentLinkHeapSettingsRead(data)
    paymentLinkHeapSettingsRaw.value = data ? JSON.stringify(data, null, 2) : null
    paymentLinkHeapSettingsLastAt.value = new Date().toLocaleString('ru-RU')
  } finally {
    paymentLinkHeapSettingsLoading.value = false
  }
}

async function runPaymentLinkFullRouteRun() {
  paymentLinkFullRouteRunLoading.value = true
  const baseUrl = getApiBaseUrl().replace(/\/$/, '')
  log.info('Лайв: payment-link route.run без dry-run')
  try {
    const res = await fetch(`${baseUrl}/api/tests/endpoints-check/payment-link-full-route-run`, {
      method: 'GET',
      credentials: 'include'
    })
    const data = await res.json().catch(() => null)
    paymentLinkFullRouteRunRow.value = parsePaymentLinkFullRouteRunResponse(data)
    paymentLinkFullRouteRunRaw.value = data ? JSON.stringify(data, null, 2) : null
    paymentLinkFullRouteRunLastAt.value = new Date().toLocaleString('ru-RU')
    maybeUpdatePaymentLinkLiveSnapshot('route', data, paymentLinkFullRouteRunRow.value.status)
  } finally {
    paymentLinkFullRouteRunLoading.value = false
  }
}

async function runPaymentLinkFullHttpLive() {
  paymentLinkFullHttpLoading.value = true
  const baseUrl = getApiBaseUrl().replace(/\/$/, '')
  log.info('Лайв: HTTP POST payment-link без dry-run')
  try {
    const res = await fetch(
      `${baseUrl}/api/tests/endpoints-check/payment-link-full-http-integration`,
      {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      }
    )
    const data = await res.json().catch(() => null)
    paymentLinkFullHttpRow.value = parsePaymentLinkFullHttpLiveResponse(data)
    paymentLinkFullHttpRaw.value = data ? JSON.stringify(data, null, 2) : null
    paymentLinkFullHttpLastAt.value = new Date().toLocaleString('ru-RU')
    maybeUpdatePaymentLinkLiveSnapshot('http', data, paymentLinkFullHttpRow.value.status)
  } finally {
    paymentLinkFullHttpLoading.value = false
  }
}

/** Лайв-триада: Heap → route.run → HTTP (полные вызовы Lava для gcOrderId=test). */
async function runPaymentLinkLiveAllTests() {
  await runPaymentLinkHeapSettingsRead()
  await runPaymentLinkFullRouteRun()
  await runPaymentLinkFullHttpLive()
}

async function runSingleIntegrationBothTest(testId: string) {
  const step = INTEGRATION_TAB_CREDENTIAL_TESTS.find((s) => s.id === testId)
  if (!step) return
  singleTestRun.value = { group: 'integrationBoth', id: testId }
  const baseUrl = getApiBaseUrl().replace(/\/$/, '')
  try {
    const res = await fetch(`${baseUrl}${step.path}`, { method: 'GET', credentials: 'include' })
    const data = (await res.json().catch(() => null)) as Record<string, unknown>
    const one = lavaStepToTestResult(step, res, data)
    integrationBothResults.value = upsertTestResults(integrationBothResults.value, [one])
    integrationBothLastRunAt.value = new Date().toLocaleString('ru-RU')
  } catch (e) {
    integrationBothResults.value = upsertTestResults(integrationBothResults.value, [
      {
        id: step.id,
        title: step.title,
        passed: false,
        error: (e as Error)?.message ?? String(e)
      }
    ])
    integrationBothLastRunAt.value = new Date().toLocaleString('ru-RU')
  } finally {
    singleTestRun.value = null
  }
}

/* --- Блок 7: Ключи интеграции (отдельно GC и Lava, как в админке) --- */
const SETTING_KEYS_VALIDATION_TESTS: Array<{
  id: string
  title: string
  path: string
  mode: 'results' | 'legacy'
}> = [
  {
    id: 'integration-gc-credentials',
    title: 'GetCourse: API-ключ и домен (PL API)',
    path: '/api/tests/endpoints-check/integration-gc-credentials',
    mode: 'legacy'
  },
  {
    id: 'integration-lava-credentials',
    title: 'Lava: API-ключ и базовый URL (GET /api/v2/products)',
    path: '/api/tests/endpoints-check/integration-lava-credentials',
    mode: 'legacy'
  }
]
const settingKeysValidationResults = ref<TestResult[]>([])
const settingKeysValidationLoading = ref(false)
const settingKeysValidationLastRunAt = ref<string | null>(null)

const settingKeysValidationDisplay = computed(() => {
  const byId = new Map(settingKeysValidationResults.value.map((r) => [r.id, r]))
  return SETTING_KEYS_VALIDATION_TESTS.map((t) => {
    const res = byId.get(t.id)
    return {
      id: t.id,
      title: t.title,
      status: res === undefined ? 'todo' : res.passed ? 'success' : 'fail',
      error: res && !res.passed ? res.error : undefined
    }
  })
})

async function runSettingKeysValidationTests() {
  settingKeysValidationLoading.value = true
  settingKeysValidationResults.value = []
  const baseUrl = getApiBaseUrl().replace(/\/$/, '')
  log.info('Запуск проверки ключей интеграции (Heap)')
  const out: TestResult[] = []
  try {
    for (const step of SETTING_KEYS_VALIDATION_TESTS) {
      try {
        const res = await fetch(`${baseUrl}${step.path}`, { method: 'GET', credentials: 'include' })
        const data = (await res.json().catch(() => null)) as Record<string, unknown>
        out.push(lavaStepToTestResult(step, res, data))
      } catch (e) {
        out.push({
          id: step.id,
          title: step.title,
          passed: false,
          error: (e as Error)?.message ?? String(e)
        })
      }
    }
    settingKeysValidationResults.value = out
    settingKeysValidationLastRunAt.value = new Date().toLocaleString('ru-RU')
  } finally {
    settingKeysValidationLoading.value = false
  }
}

async function runSingleSettingKeysValidationTest(testId: string) {
  const step = SETTING_KEYS_VALIDATION_TESTS.find((s) => s.id === testId)
  if (!step) return
  singleTestRun.value = { group: 'settingKeys', id: testId }
  const baseUrl = getApiBaseUrl().replace(/\/$/, '')
  try {
    const res = await fetch(`${baseUrl}${step.path}`, { method: 'GET', credentials: 'include' })
    const data = (await res.json().catch(() => null)) as Record<string, unknown>
    const one = lavaStepToTestResult(step, res, data)
    settingKeysValidationResults.value = upsertTestResults(settingKeysValidationResults.value, [
      one
    ])
    settingKeysValidationLastRunAt.value = new Date().toLocaleString('ru-RU')
  } catch (e) {
    settingKeysValidationResults.value = upsertTestResults(settingKeysValidationResults.value, [
      {
        id: step.id,
        title: step.title,
        passed: false,
        error: (e as Error)?.message ?? String(e)
      }
    ])
    settingKeysValidationLastRunAt.value = new Date().toLocaleString('ru-RU')
  } finally {
    singleTestRun.value = null
  }
}

/** Запустить все тесты выбранного режима и обновить метрики дашборда */
const runAllTests = async () => {
  if (!hasRunnableTestsInMode.value) {
    log.notice('Запуск всех тестов: в этой вкладке пока нет сценариев', testSuiteMode.value)
    return
  }
  runAllTestsLoading.value = true
  log.info('Запуск всех тестов', { mode: testSuiteMode.value })
  try {
    if (testSuiteMode.value === 'unit') {
      await runUnitPageRoutesTests()
      await runUnitSaveCredsTests()
      await runUnitWebhookRouteTests()
      const all = [
        ...unitPageRoutesResults.value,
        ...unitSaveCredsResults.value,
        ...unitWebhookRouteResults.value
      ]
      const passed = all.filter((r) => r.passed).length
      const failed = all.filter((r) => !r.passed).length
      testMetrics.value = {
        total: all.length,
        passed,
        failed,
        skipped: 0,
        lastRunAt: new Date().toLocaleString('ru-RU')
      }
      log.info('Юнит-тесты завершены', testMetrics.value)
      return
    }
    if (testSuiteMode.value === 'integration') {
      await runIntegrationPageRoutesTests()
      await runIntegrationBothTests()
      await runPaymentLinkBothTests()
      const all = [...integrationPageResults.value, ...integrationBothResults.value]
      const passed = all.filter((r) => r.passed).length
      const failed = all.filter((r) => !r.passed).length
      testMetrics.value = {
        total: all.length,
        passed,
        failed,
        skipped: 0,
        lastRunAt: new Date().toLocaleString('ru-RU')
      }
      log.info('Интеграционные тесты завершены', testMetrics.value)
      return
    }
    await runEndpointsTests()
    await runSettingsTests()
    await runSettingsRepoTests()
    await runLoggerLibTests()
    await runLogsRepoTests()
    await runDashboardLibTests()
    await runSettingKeysValidationTests()
    const all = [
      ...endpointsResults.value,
      ...settingsResults.value,
      ...settingsRepoResults.value,
      ...loggerLibResults.value,
      ...logsRepoResults.value,
      ...dashboardLibResults.value,
      ...settingKeysValidationResults.value
    ]
    const passed = all.filter((r) => r.passed).length
    const failed = all.filter((r) => !r.passed).length
    testMetrics.value = {
      total: all.length,
      passed,
      failed,
      skipped: 0,
      lastRunAt: new Date().toLocaleString('ru-RU')
    }
    log.info('Все тесты завершены', testMetrics.value)
  } finally {
    runAllTestsLoading.value = false
  }
}
</script>

<template>
  <div class="app-layout bg-[var(--color-bg)] text-[var(--color-text)] flex flex-col">
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

    <main class="content-wrapper flex-1 relative z-10 min-h-0 overflow-y-auto">
      <div class="content-inner">
        <section class="tests-section tests-crt" :class="{ 'content-visible': showContent }">
          <div
            class="tests-crt-frame"
            :class="{ 'tests-crt-frame--with-logs': showContent && props.encodedLogsSocketId }"
          >
            <div class="tests-main-stack">
              <!-- Дашборд: режим + метрики + запуск -->
              <div v-if="showContent" class="tests-card tests-dashboard tests-crt-card">
                <div class="tests-dashboard-top">
                  <div class="tests-dashboard-title-row">
                    <span class="tests-crt-label">TEST_SUITE</span>
                    <h2 class="tests-dashboard-title">Метрики</h2>
                  </div>
                  <div class="tests-mode-switch" role="group" aria-label="Тип тестов">
                    <button
                      type="button"
                      class="tests-mode-btn"
                      :class="{ 'tests-mode-btn--active': testSuiteMode === 'unit' }"
                      @click="testSuiteMode = 'unit'"
                    >
                      Юнит
                    </button>
                    <button
                      type="button"
                      class="tests-mode-btn"
                      :class="{ 'tests-mode-btn--active': testSuiteMode === 'integration' }"
                      @click="testSuiteMode = 'integration'"
                    >
                      Интеграция
                    </button>
                    <button
                      type="button"
                      class="tests-mode-btn tests-mode-btn--legacy-tab"
                      :class="{ 'tests-mode-btn--active': testSuiteMode === 'legacy' }"
                      @click="testSuiteMode = 'legacy'"
                    >
                      Устаревшее
                    </button>
                  </div>
                </div>
                <p class="tests-mode-hint">
                  <template v-if="testSuiteMode === 'unit'">
                    Слияние ключей save (без сети), быстрый
                    <code class="tests-inline-code">route.run</code> по страницам и юнит
                    <code class="tests-inline-code">POST …/lava/webhook</code> (тот же
                    <code class="tests-inline-code">ctx</code>).
                  </template>
                  <template v-else-if="testSuiteMode === 'integration'">
                    Страницы (fetch + разбор); ключи Heap (GetCourse и Lava); POST payment-link:
                    юнит
                    <code class="tests-inline-code">route.run</code> с dry-run и HTTP
                    <code class="tests-inline-code">request()</code> на тот же эндпоинт.
                  </template>
                  <template v-else>
                    Прежний набор: эндпоинты, слои settings/logger/dashboard/repos и проверки ключей
                    GetCourse / Lava в Heap.
                  </template>
                </p>
                <div class="tests-dashboard-metrics">
                  <div class="tests-metric tests-metric-total">
                    <span class="tests-metric-value">{{ testMetrics.total }}</span>
                    <span class="tests-metric-label">всего</span>
                  </div>
                  <div class="tests-metric tests-metric-passed">
                    <span class="tests-metric-value">{{ testMetrics.passed }}</span>
                    <span class="tests-metric-label">пройдено</span>
                  </div>
                  <div class="tests-metric tests-metric-failed">
                    <span class="tests-metric-value">{{ testMetrics.failed }}</span>
                    <span class="tests-metric-label">провалено</span>
                  </div>
                  <div class="tests-metric tests-metric-skipped">
                    <span class="tests-metric-value">{{ testMetrics.skipped }}</span>
                    <span class="tests-metric-label">пропущено</span>
                  </div>
                </div>
                <p v-if="testMetrics.lastRunAt" class="tests-dashboard-last-run">
                  Последний запуск: {{ testMetrics.lastRunAt }}
                </p>
                <div class="tests-dashboard-actions">
                  <button
                    type="button"
                    class="tests-run-all-btn"
                    :disabled="
                      runAllTestsLoading || singleTestRun !== null || !hasRunnableTestsInMode
                    "
                    :title="
                      !hasRunnableTestsInMode
                        ? 'Нет сценариев'
                        : testSuiteMode === 'unit'
                          ? 'Страницы (route.run) + слияние ключей + Lava webhook (route.run)'
                          : testSuiteMode === 'integration'
                            ? 'Страницы + Heap + payment-link (dry-run и HTTP)'
                            : 'Запустить весь устаревший набор'
                    "
                    @click="runAllTests"
                  >
                    <i
                      class="fas"
                      :class="runAllTestsLoading ? 'fa-spinner fa-spin' : 'fa-play'"
                    ></i>
                    {{ runAllTestsLoading ? 'Запуск...' : 'Запустить все тесты' }}
                  </button>
                </div>
              </div>

              <!-- Вкладка «Юнит»: страницы (route.run) -->
              <div
                v-if="showContent && testSuiteMode === 'unit'"
                class="tests-card tests-endpoints-card tests-crt-card"
              >
                <div class="tests-endpoints-header">
                  <i class="fas fa-code tests-endpoints-icon"></i>
                  <h2 class="tests-endpoints-title">Юнит: страницы (route.run)</h2>
                </div>
                <p class="tests-endpoints-desc">
                  GET{' '}
                  <code class="tests-inline-code">/api/tests/endpoints-check/page-routes-unit</code>
                  — тот же <code class="tests-inline-code">ctx</code>, что у запроса к API; для
                  каждого <code class="tests-inline-code">app.html</code> вызывается
                  <code class="tests-inline-code">route.run(ctx, req)</code>, проверяется отсутствие
                  исключений и непустой результат (JSX / редирект). Без HTTP; интеграция по
                  страницам — вкладка «Интеграция».
                </p>
                <div v-if="unitPageRoutesLastRunAt" class="tests-endpoints-last-run">
                  Результаты от: {{ unitPageRoutesLastRunAt }}
                </div>
                <div class="tests-endpoints-list-wrap">
                  <ul class="tests-endpoints-list" role="list">
                    <li
                      v-for="item in unitPageRoutesDisplay"
                      :key="item.id"
                      class="tests-endpoints-list-item"
                      :class="`tests-endpoints-status-${item.status}`"
                    >
                      <span
                        class="tests-endpoints-badge"
                        :class="`tests-endpoints-badge-${item.status}`"
                      >
                        {{
                          item.status === 'todo'
                            ? '[TODO]'
                            : item.status === 'success'
                              ? '[OK]'
                              : '[FAIL]'
                        }}
                      </span>
                      <span class="tests-endpoints-list-title-inline">{{ item.title }}</span>
                      <span v-if="item.error" class="tests-endpoints-list-error">{{
                        item.error
                      }}</span>
                      <button
                        type="button"
                        class="tests-run-one-btn"
                        title="Запустить только эту страницу"
                        :disabled="
                          runAllTestsLoading ||
                          unitPageRoutesLoading ||
                          unitSaveCredsLoading ||
                          unitWebhookRouteLoading ||
                          isGroupBlockedBySingle('unitPageRoutes')
                        "
                        @click.stop="runSingleUnitPageRouteTest(item.id)"
                      >
                        <i
                          class="fas"
                          :class="
                            isSingleRunning('unitPageRoutes', item.id)
                              ? 'fa-spinner fa-spin'
                              : 'fa-play'
                          "
                        ></i>
                      </button>
                    </li>
                  </ul>
                </div>
                <div class="tests-endpoints-actions">
                  <button
                    type="button"
                    class="tests-run-group-btn"
                    :disabled="
                      runAllTestsLoading ||
                      unitPageRoutesLoading ||
                      unitSaveCredsLoading ||
                      unitWebhookRouteLoading ||
                      isGroupBlockedBySingle('unitPageRoutes')
                    "
                    @click="runUnitPageRoutesTests"
                  >
                    <i
                      class="fas"
                      :class="unitPageRoutesLoading ? 'fa-spinner fa-spin' : 'fa-bolt'"
                    ></i>
                    {{
                      unitPageRoutesLoading
                        ? 'Проверяем...'
                        : 'Запустить route.run по всем страницам'
                    }}
                  </button>
                </div>
              </div>

              <!-- Вкладка «Юнит»: слияние ключей для POST /api/settings/save -->
              <div
                v-if="showContent && testSuiteMode === 'unit'"
                class="tests-card tests-endpoints-card tests-crt-card"
              >
                <div class="tests-endpoints-header">
                  <i class="fas fa-flask tests-endpoints-icon"></i>
                  <h2 class="tests-endpoints-title">Юнит: слияние ключей (save)</h2>
                </div>
                <p class="tests-endpoints-desc">
                  GET
                  <code class="tests-inline-code"
                    >/api/tests/endpoints-check/settings-save-credentials-unit</code
                  >
                  — проверка функций
                  <code class="tests-inline-code">resolveGcCredentialsForSave</code> /
                  <code class="tests-inline-code">resolveLavaCredentialsForSave</code> без сети.
                </p>
                <div v-if="unitSaveCredsLastRunAt" class="tests-endpoints-last-run">
                  Результаты от: {{ unitSaveCredsLastRunAt }}
                </div>
                <div class="tests-endpoints-list-wrap">
                  <ul class="tests-endpoints-list" role="list">
                    <li
                      v-for="item in unitSaveCredsDisplay"
                      :key="item.id"
                      class="tests-endpoints-list-item"
                      :class="`tests-endpoints-status-${item.status}`"
                    >
                      <span
                        class="tests-endpoints-badge"
                        :class="`tests-endpoints-badge-${item.status}`"
                      >
                        {{
                          item.status === 'todo'
                            ? '[TODO]'
                            : item.status === 'success'
                              ? '[OK]'
                              : '[FAIL]'
                        }}
                      </span>
                      <span class="tests-endpoints-list-title-inline">{{ item.title }}</span>
                      <span v-if="item.error" class="tests-endpoints-list-error">{{
                        item.error
                      }}</span>
                      <button
                        type="button"
                        class="tests-run-one-btn"
                        title="Запустить только этот тест"
                        :disabled="
                          runAllTestsLoading ||
                          unitSaveCredsLoading ||
                          unitPageRoutesLoading ||
                          unitWebhookRouteLoading ||
                          isGroupBlockedBySingle('unitSaveCreds')
                        "
                        @click.stop="runSingleUnitSaveCredsTest(item.id)"
                      >
                        <i
                          class="fas"
                          :class="
                            isSingleRunning('unitSaveCreds', item.id)
                              ? 'fa-spinner fa-spin'
                              : 'fa-play'
                          "
                        ></i>
                      </button>
                    </li>
                  </ul>
                </div>
                <div class="tests-endpoints-actions">
                  <button
                    type="button"
                    class="tests-run-group-btn"
                    :disabled="
                      runAllTestsLoading ||
                      unitSaveCredsLoading ||
                      unitPageRoutesLoading ||
                      unitWebhookRouteLoading ||
                      isGroupBlockedBySingle('unitSaveCreds')
                    "
                    @click="runUnitSaveCredsTests"
                  >
                    <i
                      class="fas"
                      :class="unitSaveCredsLoading ? 'fa-spinner fa-spin' : 'fa-bolt'"
                    ></i>
                    {{
                      unitSaveCredsLoading ? 'Проверяем...' : 'Запустить юнит-тесты слияния ключей'
                    }}
                  </button>
                </div>
              </div>

              <!-- Вкладка «Юнит»: роут Lava webhook (route.run) -->
              <div
                v-if="showContent && testSuiteMode === 'unit'"
                class="tests-card tests-endpoints-card tests-crt-card"
              >
                <div class="tests-endpoints-header">
                  <i class="fas fa-plug tests-endpoints-icon"></i>
                  <h2 class="tests-endpoints-title">Юнит: Lava webhook (route.run)</h2>
                </div>
                <p class="tests-endpoints-desc">
                  GET{' '}
                  <code class="tests-inline-code"
                    >/api/tests/endpoints-check/lava-webhook-route</code
                  >
                  — вызовы <code class="tests-inline-code">lavaWebhookInfoRoute</code> и
                  <code class="tests-inline-code"
                    >lavaWebhookRoute.run(ctx, { …тело, headers })</code
                  >
                  в том же <code class="tests-inline-code">ctx</code>, что у запроса к API. Отдельно
                  от сервисного <code class="tests-inline-code">lava-webhook-service</code> (там
                  только <code class="tests-inline-code">processWebhook</code>).
                </p>
                <div v-if="unitWebhookRouteLastRunAt" class="tests-endpoints-last-run">
                  Результаты от: {{ unitWebhookRouteLastRunAt }}
                </div>
                <div class="tests-endpoints-list-wrap">
                  <ul class="tests-endpoints-list" role="list">
                    <li
                      v-for="item in unitWebhookRouteDisplay"
                      :key="item.id"
                      class="tests-endpoints-list-item"
                      :class="`tests-endpoints-status-${item.status}`"
                    >
                      <span
                        class="tests-endpoints-badge"
                        :class="`tests-endpoints-badge-${item.status}`"
                      >
                        {{
                          item.status === 'todo'
                            ? '[TODO]'
                            : item.status === 'success'
                              ? '[OK]'
                              : '[FAIL]'
                        }}
                      </span>
                      <span class="tests-endpoints-list-title-inline">{{ item.title }}</span>
                      <span v-if="item.error" class="tests-endpoints-list-error">{{
                        item.error
                      }}</span>
                      <button
                        type="button"
                        class="tests-run-one-btn"
                        title="Запустить только эту проверку"
                        :disabled="
                          runAllTestsLoading ||
                          unitWebhookRouteLoading ||
                          unitPageRoutesLoading ||
                          unitSaveCredsLoading ||
                          isGroupBlockedBySingle('unitWebhookRoute')
                        "
                        @click.stop="runSingleUnitWebhookRouteTest(item.id)"
                      >
                        <i
                          class="fas"
                          :class="
                            isSingleRunning('unitWebhookRoute', item.id)
                              ? 'fa-spinner fa-spin'
                              : 'fa-play'
                          "
                        ></i>
                      </button>
                    </li>
                  </ul>
                </div>
                <div class="tests-endpoints-actions">
                  <button
                    type="button"
                    class="tests-run-group-btn"
                    :disabled="
                      runAllTestsLoading ||
                      unitWebhookRouteLoading ||
                      unitPageRoutesLoading ||
                      unitSaveCredsLoading ||
                      isGroupBlockedBySingle('unitWebhookRoute')
                    "
                    @click="runUnitWebhookRouteTests"
                  >
                    <i
                      class="fas"
                      :class="unitWebhookRouteLoading ? 'fa-spinner fa-spin' : 'fa-bolt'"
                    ></i>
                    {{
                      unitWebhookRouteLoading
                        ? 'Проверяем...'
                        : 'Запустить все проверки webhook-роута'
                    }}
                  </button>
                </div>
              </div>

              <!-- Вкладка «Интеграция»: страницы (fetch из браузера — сессия админа) -->
              <div
                v-if="showContent && testSuiteMode === 'integration'"
                class="tests-card tests-endpoints-card tests-crt-card"
              >
                <div class="tests-endpoints-header">
                  <i class="fas fa-globe tests-endpoints-icon"></i>
                  <h2 class="tests-endpoints-title">Страницы приложения (HTTP)</h2>
                </div>
                <p class="tests-endpoints-desc">
                  <code class="tests-inline-code">fetch</code> с{' '}
                  <code class="tests-inline-code">credentials: 'include'</code> и{' '}
                  <code class="tests-inline-code">redirect: 'manual'</code> — запросы идут из
                  браузера, передаются cookies сессии (в т.ч. админа); разбор ответа в{' '}
                  <code class="tests-inline-code">shared/pageRouteProbe.ts</code> (не только{' '}
                  <code class="tests-inline-code">response.ok</code>). См.{' '}
                  <code class="tests-inline-code">048-chatium-http-response-probes.md</code>.
                </p>
                <div v-if="integrationPageLastRunAt" class="tests-endpoints-last-run">
                  Результаты от: {{ integrationPageLastRunAt }}
                </div>
                <div class="tests-endpoints-list-wrap">
                  <ul class="tests-endpoints-list" role="list">
                    <li
                      v-for="item in integrationPageDisplay"
                      :key="item.id"
                      class="tests-endpoints-list-item"
                      :class="`tests-endpoints-status-${item.status}`"
                    >
                      <span
                        class="tests-endpoints-badge"
                        :class="`tests-endpoints-badge-${item.status}`"
                      >
                        {{
                          item.status === 'todo'
                            ? '[TODO]'
                            : item.status === 'success'
                              ? '[OK]'
                              : '[FAIL]'
                        }}
                      </span>
                      <span class="tests-endpoints-list-title-inline">{{ item.title }}</span>
                      <span v-if="item.error" class="tests-endpoints-list-error">{{
                        item.error
                      }}</span>
                      <button
                        type="button"
                        class="tests-run-one-btn"
                        title="Запустить только эту страницу"
                        :disabled="
                          runAllTestsLoading ||
                          integrationPageLoading ||
                          integrationBothLoading ||
                          integrationPaymentLinkBusy ||
                          isGroupBlockedBySingle('integrationPages')
                        "
                        @click.stop="runSingleIntegrationPageTest(item.id)"
                      >
                        <i
                          class="fas"
                          :class="
                            isSingleRunning('integrationPages', item.id)
                              ? 'fa-spinner fa-spin'
                              : 'fa-play'
                          "
                        ></i>
                      </button>
                    </li>
                  </ul>
                </div>
                <div class="tests-endpoints-actions">
                  <button
                    type="button"
                    class="tests-run-group-btn"
                    :disabled="
                      runAllTestsLoading ||
                      integrationPageLoading ||
                      integrationBothLoading ||
                      integrationPaymentLinkBusy ||
                      isGroupBlockedBySingle('integrationPages')
                    "
                    @click="runIntegrationPageRoutesTests"
                  >
                    <i
                      class="fas"
                      :class="integrationPageLoading ? 'fa-spinner fa-spin' : 'fa-bolt'"
                    ></i>
                    {{ integrationPageLoading ? 'Проверяем...' : 'Проверить все страницы' }}
                  </button>
                </div>
              </div>

              <!-- Вкладка «Интеграция»: GetCourse и Lava отдельно -->
              <div
                v-if="showContent && testSuiteMode === 'integration'"
                class="tests-card tests-endpoints-card tests-crt-card"
              >
                <div class="tests-endpoints-header">
                  <i class="fas fa-link tests-endpoints-icon"></i>
                  <h2 class="tests-endpoints-title">Интеграция: ключи из Heap</h2>
                </div>
                <p class="tests-endpoints-desc">
                  Два GET:{' '}
                  <code class="tests-inline-code">…/integration-gc-credentials</code> и{' '}
                  <code class="tests-inline-code">…/integration-lava-credentials</code>
                  — те же живые проверки, что при сохранении настроек, по парам полей из Heap (как
                  отдельные блоки в админке).
                </p>
                <div v-if="integrationBothLastRunAt" class="tests-endpoints-last-run">
                  Результаты от: {{ integrationBothLastRunAt }}
                </div>
                <div class="tests-endpoints-list-wrap">
                  <ul class="tests-endpoints-list" role="list">
                    <li
                      v-for="item in integrationBothDisplay"
                      :key="item.id"
                      class="tests-endpoints-list-item"
                      :class="`tests-endpoints-status-${item.status}`"
                    >
                      <span
                        class="tests-endpoints-badge"
                        :class="`tests-endpoints-badge-${item.status}`"
                      >
                        {{
                          item.status === 'todo'
                            ? '[TODO]'
                            : item.status === 'success'
                              ? '[OK]'
                              : '[FAIL]'
                        }}
                      </span>
                      <span class="tests-endpoints-list-title-inline">{{ item.title }}</span>
                      <span v-if="item.error" class="tests-endpoints-list-error">{{
                        item.error
                      }}</span>
                      <button
                        type="button"
                        class="tests-run-one-btn"
                        title="Запустить только этот тест"
                        :disabled="
                          runAllTestsLoading ||
                          integrationBothLoading ||
                          integrationPageLoading ||
                          integrationPaymentLinkBusy ||
                          isGroupBlockedBySingle('integrationBoth')
                        "
                        @click.stop="runSingleIntegrationBothTest(item.id)"
                      >
                        <i
                          class="fas"
                          :class="
                            isSingleRunning('integrationBoth', item.id)
                              ? 'fa-spinner fa-spin'
                              : 'fa-play'
                          "
                        ></i>
                      </button>
                    </li>
                  </ul>
                </div>
                <div class="tests-endpoints-actions">
                  <button
                    type="button"
                    class="tests-run-group-btn"
                    :disabled="
                      runAllTestsLoading ||
                      integrationBothLoading ||
                      integrationPageLoading ||
                      integrationPaymentLinkBusy ||
                      isGroupBlockedBySingle('integrationBoth')
                    "
                    @click="runIntegrationBothTests"
                  >
                    <i
                      class="fas"
                      :class="integrationBothLoading ? 'fa-spinner fa-spin' : 'fa-bolt'"
                    ></i>
                    {{
                      integrationBothLoading
                        ? 'Проверяем...'
                        : 'Запустить обе проверки (GetCourse и Lava)'
                    }}
                  </button>
                </div>
              </div>

              <div
                v-if="showContent && testSuiteMode === 'integration'"
                class="tests-card tests-endpoints-card tests-crt-card"
              >
                <div class="tests-endpoints-header">
                  <i class="fas fa-shopping-cart tests-endpoints-icon"></i>
                  <h2 class="tests-endpoints-title">Интеграция: GetCourse по номеру заказа</h2>
                </div>
                <p class="tests-endpoints-desc">
                  Введите <code class="tests-inline-code">deal_number</code> заказа в GetCourse (не
                  <code class="tests-inline-code">test</code>). GET
                  <code class="tests-inline-code">…/integration-gc-order-pl-api</code> — проба PL
                  API (<code class="tests-inline-code">deal_status=in_work</code>; на боевом заказе
                  это может изменить статус в GetCourse). Email покупателя: передайте в поле ниже
                  или оставьте пустым, если для этого
                  <code class="tests-inline-code">gc_order_id</code> уже есть контракт в Heap
                  (payment-link).
                </p>
                <div class="tests-gc-order-probe-fields">
                  <div class="tests-webhook-live-url-row">
                    <span class="tests-webhook-live-label"
                      >Номер заказа GetCourse (обязательно)</span
                    >
                    <input
                      v-model="gcOrderPlProbeId"
                      class="tests-gc-order-probe-input"
                      type="text"
                      name="gcOrderPlProbeId"
                      autocomplete="off"
                      placeholder="например 13667463"
                    />
                  </div>
                  <div class="tests-webhook-live-url-row">
                    <span class="tests-webhook-live-label"
                      >Email покупателя (необязательно, иначе из Heap)</span
                    >
                    <input
                      v-model="gcOrderPlProbeBuyerEmail"
                      class="tests-gc-order-probe-input"
                      type="email"
                      name="gcOrderPlProbeBuyerEmail"
                      autocomplete="off"
                      placeholder="если пусто — buyer_email из lava_payment_contract"
                    />
                  </div>
                </div>
                <div v-if="gcOrderPlApiLastAt" class="tests-endpoints-last-run">
                  Последний запрос: {{ gcOrderPlApiLastAt }}
                </div>
                <div class="tests-endpoints-actions">
                  <button
                    type="button"
                    class="tests-run-group-btn"
                    :disabled="
                      runAllTestsLoading ||
                      integrationBothLoading ||
                      integrationPageLoading ||
                      integrationPaymentLinkBusy ||
                      !gcOrderPlProbeId.trim()
                    "
                    @click="runIntegrationGcOrderPlApiTest"
                  >
                    <i
                      class="fas"
                      :class="gcOrderPlApiLoading ? 'fa-spinner fa-spin' : 'fa-plug'"
                    ></i>
                    {{ gcOrderPlApiLoading ? 'Запрос к GetCourse…' : 'Проверить PL API по заказу' }}
                  </button>
                </div>
                <details v-if="gcOrderPlApiRaw" class="tests-payment-link-raw">
                  <summary>Ответ API</summary>
                  <pre class="tests-payment-link-raw-pre">{{
                    JSON.stringify(gcOrderPlApiRaw, null, 2)
                  }}</pre>
                </details>
              </div>

              <div
                v-if="showContent && testSuiteMode === 'integration'"
                class="tests-card tests-endpoints-card tests-crt-card"
              >
                <div class="tests-endpoints-header">
                  <i class="fas fa-credit-card tests-endpoints-icon"></i>
                  <h2 class="tests-endpoints-title">POST /api/integrations/lava/payment-link</h2>
                </div>
                <p class="tests-endpoints-desc">
                  <strong>[OK]</strong> — проверка прошла, <strong>[SKIP]</strong> у HTTP-теста — не
                  удалось собрать абсолютный URL (нет <code class="tests-inline-code">Host</code> /
                  <code class="tests-inline-code">Origin</code>), не ошибка. Юнит: GET
                  <code class="tests-inline-code">…/payment-link-dry-run-unit</code> —
                  <code class="tests-inline-code">route.run</code> +
                  <code class="tests-inline-code">integrationTestDryRun</code>. Интеграция: POST
                  <code class="tests-inline-code">…/payment-link-http-integration</code> —
                  <code class="tests-inline-code">request()</code> на тот же URL без заголовков
                  авторизации.
                </p>
                <div
                  v-if="paymentLinkDryRunUnitLastAt || paymentLinkHttpIntegrationLastAt"
                  class="tests-endpoints-last-run"
                >
                  Последний запуск: юнит
                  {{ paymentLinkDryRunUnitLastAt ?? '—' }}, HTTP
                  {{ paymentLinkHttpIntegrationLastAt ?? '—' }}
                </div>
                <div class="tests-endpoints-list-wrap">
                  <ul class="tests-endpoints-list" role="list">
                    <li
                      class="tests-endpoints-list-item"
                      :class="`tests-endpoints-status-${paymentLinkDryRunRow.status}`"
                    >
                      <span
                        class="tests-endpoints-badge"
                        :class="`tests-endpoints-badge-${paymentLinkDryRunRow.status}`"
                        >{{ paymentLinkRowBadgeLabel(paymentLinkDryRunRow.status) }}</span
                      >
                      <span class="tests-endpoints-list-title-inline"
                        >Юнит: dry-run (<code>route.run</code>)</span
                      >
                      <span
                        v-if="paymentLinkDryRunRow.detail"
                        :class="
                          paymentLinkDryRunRow.status === 'fail'
                            ? 'tests-endpoints-list-error'
                            : 'tests-endpoints-list-desc'
                        "
                        >{{ paymentLinkDryRunRow.detail }}</span
                      >
                      <button
                        type="button"
                        class="tests-run-one-btn"
                        title="Запустить юнит"
                        :disabled="
                          runAllTestsLoading ||
                          paymentLinkDryRunUnitLoading ||
                          paymentLinkHttpIntegrationLoading ||
                          integrationPageLoading ||
                          integrationBothLoading
                        "
                        @click.stop="runPaymentLinkDryRunUnit"
                      >
                        <i
                          class="fas"
                          :class="paymentLinkDryRunUnitLoading ? 'fa-spinner fa-spin' : 'fa-play'"
                        ></i>
                      </button>
                    </li>
                    <li
                      class="tests-endpoints-list-item"
                      :class="`tests-endpoints-status-${paymentLinkHttpRow.status}`"
                    >
                      <span
                        class="tests-endpoints-badge"
                        :class="`tests-endpoints-badge-${paymentLinkHttpRow.status}`"
                        >{{ paymentLinkRowBadgeLabel(paymentLinkHttpRow.status) }}</span
                      >
                      <span class="tests-endpoints-list-title-inline"
                        >Интеграция: HTTP POST (<code>request</code>)</span
                      >
                      <span
                        v-if="paymentLinkHttpRow.detail"
                        :class="
                          paymentLinkHttpRow.status === 'fail'
                            ? 'tests-endpoints-list-error'
                            : 'tests-endpoints-list-desc'
                        "
                        >{{ paymentLinkHttpRow.detail }}</span
                      >
                      <button
                        type="button"
                        class="tests-run-one-btn"
                        title="Запустить HTTP-интеграцию"
                        :disabled="
                          runAllTestsLoading ||
                          paymentLinkDryRunUnitLoading ||
                          paymentLinkHttpIntegrationLoading ||
                          integrationPageLoading ||
                          integrationBothLoading
                        "
                        @click.stop="runPaymentLinkHttpIntegration"
                      >
                        <i
                          class="fas"
                          :class="
                            paymentLinkHttpIntegrationLoading ? 'fa-spinner fa-spin' : 'fa-play'
                          "
                        ></i>
                      </button>
                    </li>
                  </ul>
                </div>
                <div class="tests-endpoints-actions">
                  <button
                    type="button"
                    class="tests-run-group-btn"
                    :disabled="
                      runAllTestsLoading ||
                      paymentLinkDryRunUnitLoading ||
                      paymentLinkHttpIntegrationLoading ||
                      integrationPageLoading ||
                      integrationBothLoading
                    "
                    @click="runPaymentLinkBothTests"
                  >
                    <i
                      class="fas"
                      :class="
                        paymentLinkDryRunUnitLoading || paymentLinkHttpIntegrationLoading
                          ? 'fa-spinner fa-spin'
                          : 'fa-bolt'
                      "
                    ></i>
                    {{
                      paymentLinkDryRunUnitLoading || paymentLinkHttpIntegrationLoading
                        ? 'Проверяем…'
                        : 'Запустить оба (юнит + HTTP)'
                    }}
                  </button>
                </div>
                <details v-if="paymentLinkDryRunRaw" class="tests-payment-link-raw">
                  <summary>Сырой ответ (юнит)</summary>
                  <pre class="tests-payment-link-raw-pre">{{ paymentLinkDryRunRaw }}</pre>
                </details>
                <details v-if="paymentLinkHttpRaw" class="tests-payment-link-raw">
                  <summary>Сырой ответ (HTTP)</summary>
                  <pre class="tests-payment-link-raw-pre">{{ paymentLinkHttpRaw }}</pre>
                </details>
              </div>

              <div
                v-if="showContent && testSuiteMode === 'integration'"
                class="tests-card tests-endpoints-card tests-crt-card"
              >
                <div class="tests-endpoints-header">
                  <i class="fas fa-bolt tests-endpoints-icon"></i>
                  <h2 class="tests-endpoints-title">Лайв: payment-link (Heap + Lava)</h2>
                </div>
                <p class="tests-endpoints-desc">
                  Реальные вызовы Lava и Heap: перед каждым полным сценарием активные контракты с
                  <code class="tests-inline-code">gc_order_id=test</code> переводятся в
                  <code class="tests-inline-code">cancelled</code>, чтобы идемпотентность не
                  обрывала цепочку. Тело: <code class="tests-inline-code">debug@khudoley.pro</code>,
                  сумма 50 RUB. У HTTP-теста <strong>[SKIP]</strong> — нет абсолютного URL (откройте
                  страницу из браузера).
                </p>
                <div
                  v-if="
                    paymentLinkHeapSettingsLastAt ||
                    paymentLinkFullRouteRunLastAt ||
                    paymentLinkFullHttpLastAt
                  "
                  class="tests-endpoints-last-run"
                >
                  Последний запуск: Heap {{ paymentLinkHeapSettingsLastAt ?? '—' }}, route.run
                  {{ paymentLinkFullRouteRunLastAt ?? '—' }}, HTTP
                  {{ paymentLinkFullHttpLastAt ?? '—' }}
                </div>
                <div class="tests-endpoints-list-wrap">
                  <ul class="tests-endpoints-list" role="list">
                    <li
                      class="tests-endpoints-list-item"
                      :class="`tests-endpoints-status-${paymentLinkHeapSettingsRow.status}`"
                    >
                      <span
                        class="tests-endpoints-badge"
                        :class="`tests-endpoints-badge-${paymentLinkHeapSettingsRow.status}`"
                        >{{ paymentLinkRowBadgeLabel(paymentLinkHeapSettingsRow.status) }}</span
                      >
                      <span class="tests-endpoints-list-title-inline"
                        >Чтение Heap (4 поля Lava)</span
                      >
                      <span
                        v-if="paymentLinkHeapSettingsRow.detail"
                        :class="
                          paymentLinkHeapSettingsRow.status === 'fail'
                            ? 'tests-endpoints-list-error'
                            : 'tests-endpoints-list-desc'
                        "
                        >{{ paymentLinkHeapSettingsRow.detail }}</span
                      >
                      <button
                        type="button"
                        class="tests-run-one-btn"
                        title="GET payment-link-heap-settings-read"
                        :disabled="
                          runAllTestsLoading ||
                          paymentLinkHeapSettingsLoading ||
                          paymentLinkFullRouteRunLoading ||
                          paymentLinkFullHttpLoading ||
                          integrationPageLoading ||
                          integrationBothLoading
                        "
                        @click.stop="runPaymentLinkHeapSettingsRead"
                      >
                        <i
                          class="fas"
                          :class="paymentLinkHeapSettingsLoading ? 'fa-spinner fa-spin' : 'fa-play'"
                        ></i>
                      </button>
                    </li>
                    <li
                      class="tests-endpoints-list-item"
                      :class="`tests-endpoints-status-${paymentLinkFullRouteRunRow.status}`"
                    >
                      <span
                        class="tests-endpoints-badge"
                        :class="`tests-endpoints-badge-${paymentLinkFullRouteRunRow.status}`"
                        >{{ paymentLinkRowBadgeLabel(paymentLinkFullRouteRunRow.status) }}</span
                      >
                      <span class="tests-endpoints-list-title-inline"
                        >Интеграция: <code>route.run</code> (без dry-run)</span
                      >
                      <span
                        v-if="paymentLinkFullRouteRunRow.detail"
                        :class="
                          paymentLinkFullRouteRunRow.status === 'fail'
                            ? 'tests-endpoints-list-error'
                            : 'tests-endpoints-list-desc'
                        "
                        >{{ paymentLinkFullRouteRunRow.detail }}</span
                      >
                      <button
                        type="button"
                        class="tests-run-one-btn"
                        title="GET payment-link-full-route-run"
                        :disabled="
                          runAllTestsLoading ||
                          paymentLinkHeapSettingsLoading ||
                          paymentLinkFullRouteRunLoading ||
                          paymentLinkFullHttpLoading ||
                          integrationPageLoading ||
                          integrationBothLoading
                        "
                        @click.stop="runPaymentLinkFullRouteRun"
                      >
                        <i
                          class="fas"
                          :class="paymentLinkFullRouteRunLoading ? 'fa-spinner fa-spin' : 'fa-play'"
                        ></i>
                      </button>
                    </li>
                    <li
                      class="tests-endpoints-list-item"
                      :class="`tests-endpoints-status-${paymentLinkFullHttpRow.status}`"
                    >
                      <span
                        class="tests-endpoints-badge"
                        :class="`tests-endpoints-badge-${paymentLinkFullHttpRow.status}`"
                        >{{ paymentLinkRowBadgeLabel(paymentLinkFullHttpRow.status) }}</span
                      >
                      <span class="tests-endpoints-list-title-inline"
                        >Интеграция: HTTP POST (без dry-run)</span
                      >
                      <span
                        v-if="paymentLinkFullHttpRow.detail"
                        :class="
                          paymentLinkFullHttpRow.status === 'fail'
                            ? 'tests-endpoints-list-error'
                            : 'tests-endpoints-list-desc'
                        "
                        >{{ paymentLinkFullHttpRow.detail }}</span
                      >
                      <button
                        type="button"
                        class="tests-run-one-btn"
                        title="POST payment-link-full-http-integration"
                        :disabled="
                          runAllTestsLoading ||
                          paymentLinkHeapSettingsLoading ||
                          paymentLinkFullRouteRunLoading ||
                          paymentLinkFullHttpLoading ||
                          integrationPageLoading ||
                          integrationBothLoading
                        "
                        @click.stop="runPaymentLinkFullHttpLive"
                      >
                        <i
                          class="fas"
                          :class="paymentLinkFullHttpLoading ? 'fa-spinner fa-spin' : 'fa-play'"
                        ></i>
                      </button>
                    </li>
                  </ul>
                </div>
                <div class="tests-endpoints-actions">
                  <button
                    type="button"
                    class="tests-run-group-btn"
                    :disabled="
                      runAllTestsLoading ||
                      paymentLinkHeapSettingsLoading ||
                      paymentLinkFullRouteRunLoading ||
                      paymentLinkFullHttpLoading ||
                      integrationPageLoading ||
                      integrationBothLoading
                    "
                    @click="runPaymentLinkLiveAllTests"
                  >
                    <i
                      class="fas"
                      :class="
                        paymentLinkHeapSettingsLoading ||
                        paymentLinkFullRouteRunLoading ||
                        paymentLinkFullHttpLoading
                          ? 'fa-spinner fa-spin'
                          : 'fa-bolt'
                      "
                    ></i>
                    {{
                      paymentLinkHeapSettingsLoading ||
                      paymentLinkFullRouteRunLoading ||
                      paymentLinkFullHttpLoading
                        ? 'Проверяем…'
                        : 'Запустить лайв-триаду (Heap + route.run + HTTP)'
                    }}
                  </button>
                </div>
                <details v-if="paymentLinkHeapSettingsRaw" class="tests-payment-link-raw">
                  <summary>Сырой ответ (Heap)</summary>
                  <pre class="tests-payment-link-raw-pre">{{ paymentLinkHeapSettingsRaw }}</pre>
                </details>
                <details v-if="paymentLinkFullRouteRunRaw" class="tests-payment-link-raw">
                  <summary>Сырой ответ (route.run)</summary>
                  <pre class="tests-payment-link-raw-pre">{{ paymentLinkFullRouteRunRaw }}</pre>
                </details>
                <details v-if="paymentLinkFullHttpRaw" class="tests-payment-link-raw">
                  <summary>Сырой ответ (HTTP лайв)</summary>
                  <pre class="tests-payment-link-raw-pre">{{ paymentLinkFullHttpRaw }}</pre>
                </details>
              </div>

              <div
                v-if="showContent && testSuiteMode === 'integration'"
                class="tests-card tests-endpoints-card tests-crt-card"
              >
                <div class="tests-endpoints-header">
                  <i class="fas fa-link tests-endpoints-icon"></i>
                  <h2 class="tests-endpoints-title">Лайв: webhook после оплаты</h2>
                </div>
                <p class="tests-endpoints-desc">
                  Оплатите по ссылке из лайва payment-link выше. Lava отправит
                  <code class="tests-inline-code">POST</code> на эндпоинт ниже с заголовком
                  <code class="tests-inline-code">X-Api-Key</code> = секрет из Heap. Для заказа
                  <code class="tests-inline-code">gc_order_id=test</code> вызов GetCourse из webhook
                  не выполняется. Нажмите «Вооружить проверку» и укажите ожидаемый
                  <code class="tests-inline-code">lava_contract_id</code> (подставляется из
                  последнего успешного route.run или HTTP). Зелёный статус — первый успешный
                  <code class="tests-inline-code">payment.success</code> +
                  <code class="tests-inline-code">completed</code> по этому контракту.
                </p>
                <div class="tests-webhook-live-urls">
                  <p class="tests-webhook-live-url-row">
                    <span class="tests-webhook-live-label">Эндпоинт webhook (куда шлёт Lava):</span>
                    <code class="tests-webhook-live-url-code">{{
                      webhookLiveApiResponse?.webhookUrl || '—'
                    }}</code>
                  </p>
                  <p class="tests-webhook-live-url-row">
                    <span class="tests-webhook-live-label"
                      >Ссылка на оплату (ожидаем проверку по ней):</span
                    >
                    <template v-if="webhookLivePaymentUrlDisplay">
                      <a
                        class="tests-webhook-live-pay-link"
                        :href="webhookLivePaymentUrlDisplay"
                        target="_blank"
                        rel="noopener noreferrer"
                        >{{ webhookLivePaymentUrlDisplay }}</a
                      >
                    </template>
                    <template v-else>
                      <span class="tests-endpoints-list-desc"
                        >Сначала успешно создайте ссылку в блоке выше.</span
                      >
                    </template>
                  </p>
                  <p v-if="paymentLinkLiveSnapshot" class="tests-webhook-live-meta">
                    Последний контракт из лайва:
                    <code class="tests-inline-code">{{
                      paymentLinkLiveSnapshot.lavaContractId
                    }}</code>
                    ({{ paymentLinkLiveSnapshot.source === 'http' ? 'HTTP' : 'route.run' }})
                  </p>
                </div>
                <div class="tests-endpoints-list-wrap">
                  <ul class="tests-endpoints-list" role="list">
                    <li
                      class="tests-endpoints-list-item"
                      :class="`tests-endpoints-status-${webhookLiveApiResponse?.state?.status === 'success' ? 'success' : 'todo'}`"
                    >
                      <span
                        class="tests-endpoints-badge"
                        :class="`tests-endpoints-badge-${webhookLiveApiResponse?.state?.status === 'success' ? 'success' : 'todo'}`"
                        >{{
                          webhookLiveApiResponse?.state?.status === 'success'
                            ? '[OK]'
                            : webhookLiveApiResponse?.state?.status === 'armed'
                              ? '[ЖДЁМ]'
                              : '[TODO]'
                        }}</span
                      >
                      <span class="tests-endpoints-list-title-inline"
                        >Проверка webhook по контракту</span
                      >
                      <span
                        v-if="webhookLiveApiResponse?.state?.expectedLavaContractId"
                        class="tests-endpoints-list-desc"
                        >ожидаем: {{ webhookLiveApiResponse?.state?.expectedLavaContractId }}</span
                      >
                      <button
                        type="button"
                        class="tests-run-one-btn"
                        title="Обновить статус"
                        :disabled="integrationPaymentLinkBusy"
                        @click.stop="fetchWebhookLiveTestStatus"
                      >
                        <i
                          class="fas"
                          :class="webhookLiveStatusLoading ? 'fa-spinner fa-spin' : 'fa-sync'"
                        ></i>
                      </button>
                    </li>
                  </ul>
                </div>
                <div class="tests-endpoints-actions">
                  <button
                    type="button"
                    class="tests-run-group-btn"
                    :disabled="
                      integrationPaymentLinkBusy || !paymentLinkLiveSnapshot?.lavaContractId
                    "
                    @click="armWebhookLiveTestFromSnapshot"
                  >
                    <i
                      class="fas"
                      :class="webhookLiveArmLoading ? 'fa-spinner fa-spin' : 'fa-crosshairs'"
                    ></i>
                    {{
                      webhookLiveArmLoading
                        ? 'Вооружаем…'
                        : 'Вооружить проверку (snapshot: последний успешный лайв)'
                    }}
                  </button>
                </div>
                <details
                  v-if="webhookLiveApiResponse?.state?.otherEvents?.length"
                  class="tests-payment-link-raw"
                >
                  <summary>Прочие события webhook (сырой JSON)</summary>
                  <pre
                    v-for="(ev, idx) in webhookLiveApiResponse?.state?.otherEvents ?? []"
                    :key="idx"
                    class="tests-payment-link-raw-pre tests-webhook-live-other-pre"
                    >{{ ev.reason }} @ {{ new Date(ev.at).toISOString() }}
{{ ev.payloadJson }}</pre
                  >
                </details>
              </div>

              <!-- Блок 1: Проверка эндпоинтов -->
              <div
                v-if="showContent && testSuiteMode === 'legacy'"
                class="tests-card tests-endpoints-card tests-crt-card"
              >
                <div class="tests-endpoints-header">
                  <i class="fas fa-plug tests-endpoints-icon"></i>
                  <h2 class="tests-endpoints-title">Проверка эндпоинтов</h2>
                </div>
                <p class="tests-endpoints-desc">
                  Проверка доступности маршрутов приложения (HTTP 200).
                </p>
                <div v-if="endpointsLastRunAt" class="tests-endpoints-last-run">
                  Результаты от: {{ endpointsLastRunAt }}
                </div>
                <div class="tests-endpoints-list-wrap">
                  <ul class="tests-endpoints-list" role="list">
                    <li
                      v-for="item in endpointsDisplay"
                      :key="item.id"
                      class="tests-endpoints-list-item"
                      :class="`tests-endpoints-status-${item.status}`"
                    >
                      <span
                        class="tests-endpoints-badge"
                        :class="`tests-endpoints-badge-${item.status}`"
                      >
                        {{
                          item.status === 'todo'
                            ? '[TODO]'
                            : item.status === 'success'
                              ? '[OK]'
                              : '[FAIL]'
                        }}
                      </span>
                      <span class="tests-endpoints-list-title-inline">{{ item.title }}</span>
                      <span v-if="item.error" class="tests-endpoints-list-error">{{
                        item.error
                      }}</span>
                      <button
                        type="button"
                        class="tests-run-one-btn"
                        title="Запустить только этот тест"
                        :disabled="
                          runAllTestsLoading ||
                          endpointsLoading ||
                          isGroupBlockedBySingle('endpoints')
                        "
                        @click.stop="runSingleEndpointTest(item.id)"
                      >
                        <i
                          class="fas"
                          :class="
                            isSingleRunning('endpoints', item.id) ? 'fa-spinner fa-spin' : 'fa-play'
                          "
                        ></i>
                      </button>
                    </li>
                  </ul>
                </div>
                <div class="tests-endpoints-actions">
                  <button
                    type="button"
                    class="tests-run-group-btn"
                    :disabled="
                      runAllTestsLoading || endpointsLoading || isGroupBlockedBySingle('endpoints')
                    "
                    @click="runEndpointsTests"
                  >
                    <i class="fas" :class="endpointsLoading ? 'fa-spinner fa-spin' : 'fa-bolt'"></i>
                    {{ endpointsLoading ? 'Проверяем...' : 'Запустить проверку эндпоинтов' }}
                  </button>
                </div>
              </div>

              <!-- Блок 2: Библиотека настроек -->
              <div
                v-if="showContent && testSuiteMode === 'legacy'"
                class="tests-card tests-endpoints-card tests-crt-card"
              >
                <div class="tests-endpoints-header">
                  <i class="fas fa-cog tests-endpoints-icon"></i>
                  <h2 class="tests-endpoints-title">Библиотека настроек</h2>
                </div>
                <p class="tests-endpoints-desc">Тесты библиотеки настроек (settings.lib).</p>
                <div v-if="settingsLastRunAt" class="tests-endpoints-last-run">
                  Результаты от: {{ settingsLastRunAt }}
                </div>
                <div class="tests-endpoints-list-wrap">
                  <ul class="tests-endpoints-list" role="list">
                    <li
                      v-for="item in settingsDisplay"
                      :key="item.id"
                      class="tests-endpoints-list-item"
                      :class="`tests-endpoints-status-${item.status}`"
                    >
                      <span
                        class="tests-endpoints-badge"
                        :class="`tests-endpoints-badge-${item.status}`"
                      >
                        {{
                          item.status === 'todo'
                            ? '[TODO]'
                            : item.status === 'success'
                              ? '[OK]'
                              : '[FAIL]'
                        }}
                      </span>
                      <span class="tests-endpoints-list-title-inline">{{ item.title }}</span>
                      <span v-if="item.error" class="tests-endpoints-list-error">{{
                        item.error
                      }}</span>
                      <button
                        type="button"
                        class="tests-run-one-btn"
                        title="Запустить только этот тест"
                        :disabled="
                          runAllTestsLoading ||
                          settingsLoading ||
                          isGroupBlockedBySingle('settings')
                        "
                        @click.stop="runSingleSettingsTest(item.id)"
                      >
                        <i
                          class="fas"
                          :class="
                            isSingleRunning('settings', item.id) ? 'fa-spinner fa-spin' : 'fa-play'
                          "
                        ></i>
                      </button>
                    </li>
                  </ul>
                </div>
                <div class="tests-endpoints-actions">
                  <button
                    type="button"
                    class="tests-run-group-btn"
                    :disabled="
                      runAllTestsLoading || settingsLoading || isGroupBlockedBySingle('settings')
                    "
                    @click="runSettingsTests"
                  >
                    <i class="fas" :class="settingsLoading ? 'fa-spinner fa-spin' : 'fa-bolt'"></i>
                    {{
                      settingsLoading ? 'Проверяем...' : 'Запустить проверку библиотеки настроек'
                    }}
                  </button>
                </div>
              </div>

              <!-- Блок 3: Репозиторий настроек -->
              <div
                v-if="showContent && testSuiteMode === 'legacy'"
                class="tests-card tests-endpoints-card tests-crt-card"
              >
                <div class="tests-endpoints-header">
                  <i class="fas fa-table tests-endpoints-icon"></i>
                  <h2 class="tests-endpoints-title">Репозиторий настроек</h2>
                </div>
                <p class="tests-endpoints-desc">Тесты репозитория настроек (settings.repo).</p>
                <div v-if="settingsRepoLastRunAt" class="tests-endpoints-last-run">
                  Результаты от: {{ settingsRepoLastRunAt }}
                </div>
                <div class="tests-endpoints-list-wrap">
                  <ul class="tests-endpoints-list" role="list">
                    <li
                      v-for="item in settingsRepoDisplay"
                      :key="item.id"
                      class="tests-endpoints-list-item"
                      :class="`tests-endpoints-status-${item.status}`"
                    >
                      <span
                        class="tests-endpoints-badge"
                        :class="`tests-endpoints-badge-${item.status}`"
                      >
                        {{
                          item.status === 'todo'
                            ? '[TODO]'
                            : item.status === 'success'
                              ? '[OK]'
                              : '[FAIL]'
                        }}
                      </span>
                      <span class="tests-endpoints-list-title-inline">{{ item.title }}</span>
                      <span v-if="item.error" class="tests-endpoints-list-error">{{
                        item.error
                      }}</span>
                      <button
                        type="button"
                        class="tests-run-one-btn"
                        title="Запустить только этот тест"
                        :disabled="
                          runAllTestsLoading ||
                          settingsRepoLoading ||
                          isGroupBlockedBySingle('settingsRepo')
                        "
                        @click.stop="runSingleSettingsRepoTest(item.id)"
                      >
                        <i
                          class="fas"
                          :class="
                            isSingleRunning('settingsRepo', item.id)
                              ? 'fa-spinner fa-spin'
                              : 'fa-play'
                          "
                        ></i>
                      </button>
                    </li>
                  </ul>
                </div>
                <div class="tests-endpoints-actions">
                  <button
                    type="button"
                    class="tests-run-group-btn"
                    :disabled="
                      runAllTestsLoading ||
                      settingsRepoLoading ||
                      isGroupBlockedBySingle('settingsRepo')
                    "
                    @click="runSettingsRepoTests"
                  >
                    <i
                      class="fas"
                      :class="settingsRepoLoading ? 'fa-spinner fa-spin' : 'fa-bolt'"
                    ></i>
                    {{
                      settingsRepoLoading
                        ? 'Проверяем...'
                        : 'Запустить проверку репозитория настроек'
                    }}
                  </button>
                </div>
              </div>

              <!-- Блок 4: Библиотека логов -->
              <div
                v-if="showContent && testSuiteMode === 'legacy'"
                class="tests-card tests-endpoints-card tests-crt-card"
              >
                <div class="tests-endpoints-header">
                  <i class="fas fa-file-alt tests-endpoints-icon"></i>
                  <h2 class="tests-endpoints-title">Библиотека логов</h2>
                </div>
                <p class="tests-endpoints-desc">Тесты библиотеки логов (logger.lib).</p>
                <div v-if="loggerLibLastRunAt" class="tests-endpoints-last-run">
                  Результаты от: {{ loggerLibLastRunAt }}
                </div>
                <div class="tests-endpoints-list-wrap">
                  <ul class="tests-endpoints-list" role="list">
                    <li
                      v-for="item in loggerLibDisplay"
                      :key="item.id"
                      class="tests-endpoints-list-item"
                      :class="`tests-endpoints-status-${item.status}`"
                    >
                      <span
                        class="tests-endpoints-badge"
                        :class="`tests-endpoints-badge-${item.status}`"
                      >
                        {{
                          item.status === 'todo'
                            ? '[TODO]'
                            : item.status === 'success'
                              ? '[OK]'
                              : '[FAIL]'
                        }}
                      </span>
                      <span class="tests-endpoints-list-title-inline">{{ item.title }}</span>
                      <span v-if="item.error" class="tests-endpoints-list-error">{{
                        item.error
                      }}</span>
                      <button
                        type="button"
                        class="tests-run-one-btn"
                        title="Запустить только этот тест"
                        :disabled="
                          runAllTestsLoading ||
                          loggerLibLoading ||
                          isGroupBlockedBySingle('loggerLib')
                        "
                        @click.stop="runSingleLoggerLibTest(item.id)"
                      >
                        <i
                          class="fas"
                          :class="
                            isSingleRunning('loggerLib', item.id) ? 'fa-spinner fa-spin' : 'fa-play'
                          "
                        ></i>
                      </button>
                    </li>
                  </ul>
                </div>
                <div class="tests-endpoints-actions">
                  <button
                    type="button"
                    class="tests-run-group-btn"
                    :disabled="
                      runAllTestsLoading || loggerLibLoading || isGroupBlockedBySingle('loggerLib')
                    "
                    @click="runLoggerLibTests"
                  >
                    <i class="fas" :class="loggerLibLoading ? 'fa-spinner fa-spin' : 'fa-bolt'"></i>
                    {{ loggerLibLoading ? 'Проверяем...' : 'Запустить проверку библиотеки логов' }}
                  </button>
                </div>
              </div>

              <!-- Блок 5: Репозиторий логов -->
              <div
                v-if="showContent && testSuiteMode === 'legacy'"
                class="tests-card tests-endpoints-card tests-crt-card"
              >
                <div class="tests-endpoints-header">
                  <i class="fas fa-database tests-endpoints-icon"></i>
                  <h2 class="tests-endpoints-title">Репозиторий логов</h2>
                </div>
                <p class="tests-endpoints-desc">Тесты репозитория логов (logs.repo).</p>
                <div v-if="logsRepoLastRunAt" class="tests-endpoints-last-run">
                  Результаты от: {{ logsRepoLastRunAt }}
                </div>
                <div class="tests-endpoints-list-wrap">
                  <ul class="tests-endpoints-list" role="list">
                    <li
                      v-for="item in logsRepoDisplay"
                      :key="item.id"
                      class="tests-endpoints-list-item"
                      :class="`tests-endpoints-status-${item.status}`"
                    >
                      <span
                        class="tests-endpoints-badge"
                        :class="`tests-endpoints-badge-${item.status}`"
                      >
                        {{
                          item.status === 'todo'
                            ? '[TODO]'
                            : item.status === 'success'
                              ? '[OK]'
                              : '[FAIL]'
                        }}
                      </span>
                      <span class="tests-endpoints-list-title-inline">{{ item.title }}</span>
                      <span v-if="item.error" class="tests-endpoints-list-error">{{
                        item.error
                      }}</span>
                      <button
                        type="button"
                        class="tests-run-one-btn"
                        title="Запустить только этот тест"
                        :disabled="
                          runAllTestsLoading ||
                          logsRepoLoading ||
                          isGroupBlockedBySingle('logsRepo')
                        "
                        @click.stop="runSingleLogsRepoTest(item.id)"
                      >
                        <i
                          class="fas"
                          :class="
                            isSingleRunning('logsRepo', item.id) ? 'fa-spinner fa-spin' : 'fa-play'
                          "
                        ></i>
                      </button>
                    </li>
                  </ul>
                </div>
                <div class="tests-endpoints-actions">
                  <button
                    type="button"
                    class="tests-run-group-btn"
                    :disabled="
                      runAllTestsLoading || logsRepoLoading || isGroupBlockedBySingle('logsRepo')
                    "
                    @click="runLogsRepoTests"
                  >
                    <i class="fas" :class="logsRepoLoading ? 'fa-spinner fa-spin' : 'fa-bolt'"></i>
                    {{ logsRepoLoading ? 'Проверяем...' : 'Запустить проверку репозитория логов' }}
                  </button>
                </div>
              </div>

              <!-- Блок 6: Библиотека админки -->
              <div
                v-if="showContent && testSuiteMode === 'legacy'"
                class="tests-card tests-endpoints-card tests-crt-card"
              >
                <div class="tests-endpoints-header">
                  <i class="fas fa-chart-line tests-endpoints-icon"></i>
                  <h2 class="tests-endpoints-title">Библиотека админки</h2>
                </div>
                <p class="tests-endpoints-desc">Тесты библиотеки админки (dashboard.lib).</p>
                <div v-if="dashboardLibLastRunAt" class="tests-endpoints-last-run">
                  Результаты от: {{ dashboardLibLastRunAt }}
                </div>
                <div class="tests-endpoints-list-wrap">
                  <ul class="tests-endpoints-list" role="list">
                    <li
                      v-for="item in dashboardLibDisplay"
                      :key="item.id"
                      class="tests-endpoints-list-item"
                      :class="`tests-endpoints-status-${item.status}`"
                    >
                      <span
                        class="tests-endpoints-badge"
                        :class="`tests-endpoints-badge-${item.status}`"
                      >
                        {{
                          item.status === 'todo'
                            ? '[TODO]'
                            : item.status === 'success'
                              ? '[OK]'
                              : '[FAIL]'
                        }}
                      </span>
                      <span class="tests-endpoints-list-title-inline">{{ item.title }}</span>
                      <span v-if="item.error" class="tests-endpoints-list-error">{{
                        item.error
                      }}</span>
                      <button
                        type="button"
                        class="tests-run-one-btn"
                        title="Запустить только этот тест"
                        :disabled="
                          runAllTestsLoading ||
                          dashboardLibLoading ||
                          isGroupBlockedBySingle('dashboardLib')
                        "
                        @click.stop="runSingleDashboardLibTest(item.id)"
                      >
                        <i
                          class="fas"
                          :class="
                            isSingleRunning('dashboardLib', item.id)
                              ? 'fa-spinner fa-spin'
                              : 'fa-play'
                          "
                        ></i>
                      </button>
                    </li>
                  </ul>
                </div>
                <div class="tests-endpoints-actions">
                  <button
                    type="button"
                    class="tests-run-group-btn"
                    :disabled="
                      runAllTestsLoading ||
                      dashboardLibLoading ||
                      isGroupBlockedBySingle('dashboardLib')
                    "
                    @click="runDashboardLibTests"
                  >
                    <i
                      class="fas"
                      :class="dashboardLibLoading ? 'fa-spinner fa-spin' : 'fa-bolt'"
                    ></i>
                    {{
                      dashboardLibLoading ? 'Проверяем...' : 'Запустить проверку библиотеки админки'
                    }}
                  </button>
                </div>
              </div>

              <!-- Блок 7: Ключи интеграции (GC и Lava отдельными строками) -->
              <div
                v-if="showContent && testSuiteMode === 'legacy'"
                class="tests-card tests-endpoints-card tests-crt-card"
              >
                <div class="tests-endpoints-header">
                  <i class="fas fa-key tests-endpoints-icon"></i>
                  <h2 class="tests-endpoints-title">Ключи настроек интеграции</h2>
                </div>
                <p class="tests-endpoints-desc">
                  Две независимые проверки, как отдельные поля в админке:
                  <strong>GetCourse</strong> — <code class="tests-inline-code">gc_api_key</code> +
                  <code class="tests-inline-code">gc_account_domain</code>,
                  <code class="tests-inline-code">verifyGcPlApiAccess</code>;
                  <strong>Lava</strong> — <code class="tests-inline-code">lava_api_key</code> +
                  <code class="tests-inline-code">lava_base_url</code>,
                  <code class="tests-inline-code">GET /api/v2/products</code>. Пока в Heap не задана
                  полная пара — строка пропускается (<code class="tests-inline-code">skipped</code
                  >).
                </p>
                <div v-if="settingKeysValidationLastRunAt" class="tests-endpoints-last-run">
                  Результаты от: {{ settingKeysValidationLastRunAt }}
                </div>
                <div class="tests-endpoints-list-wrap">
                  <ul class="tests-endpoints-list" role="list">
                    <li
                      v-for="item in settingKeysValidationDisplay"
                      :key="item.id"
                      class="tests-endpoints-list-item"
                      :class="`tests-endpoints-status-${item.status}`"
                    >
                      <span
                        class="tests-endpoints-badge"
                        :class="`tests-endpoints-badge-${item.status}`"
                      >
                        {{
                          item.status === 'todo'
                            ? '[TODO]'
                            : item.status === 'success'
                              ? '[OK]'
                              : '[FAIL]'
                        }}
                      </span>
                      <span class="tests-endpoints-list-title-inline">{{ item.title }}</span>
                      <span v-if="item.error" class="tests-endpoints-list-error">{{
                        item.error
                      }}</span>
                      <button
                        type="button"
                        class="tests-run-one-btn"
                        title="Запустить только этот тест"
                        :disabled="
                          runAllTestsLoading ||
                          settingKeysValidationLoading ||
                          isGroupBlockedBySingle('settingKeys')
                        "
                        @click.stop="runSingleSettingKeysValidationTest(item.id)"
                      >
                        <i
                          class="fas"
                          :class="
                            isSingleRunning('settingKeys', item.id)
                              ? 'fa-spinner fa-spin'
                              : 'fa-play'
                          "
                        ></i>
                      </button>
                    </li>
                  </ul>
                </div>
                <div class="tests-endpoints-actions">
                  <button
                    type="button"
                    class="tests-run-group-btn"
                    :disabled="
                      runAllTestsLoading ||
                      settingKeysValidationLoading ||
                      isGroupBlockedBySingle('settingKeys')
                    "
                    @click="runSettingKeysValidationTests"
                  >
                    <i
                      class="fas"
                      :class="settingKeysValidationLoading ? 'fa-spinner fa-spin' : 'fa-bolt'"
                    ></i>
                    {{
                      settingKeysValidationLoading
                        ? 'Проверяем...'
                        : 'Запустить проверку ключей интеграции'
                    }}
                  </button>
                </div>
              </div>
            </div>

            <!-- Логи справа (CRT), тот же сокет что в админке -->
            <aside
              v-if="showContent && props.encodedLogsSocketId"
              class="tests-logs-aside tests-crt-logs"
              aria-label="Логи приложения"
            >
              <div class="tests-logs-aside-inner">
                <div class="tests-logs-card-header">
                  <span class="tests-crt-bezel-title">MONITOR_01 // STREAM</span>
                  <h2 class="tests-logs-card-title">Логи</h2>
                </div>
                <div class="tests-logs-filters">
                  <button
                    type="button"
                    class="tests-log-filter-chip chip-info"
                    :class="{ active: logFilters.info }"
                    @click="toggleLogFilter('info')"
                  >
                    <i class="fas fa-info-circle"></i>
                    Info
                  </button>
                  <button
                    type="button"
                    class="tests-log-filter-chip chip-warn"
                    :class="{ active: logFilters.warn }"
                    @click="toggleLogFilter('warn')"
                  >
                    <i class="fas fa-exclamation-triangle"></i>
                    Warn
                  </button>
                  <button
                    type="button"
                    class="tests-log-filter-chip chip-error"
                    :class="{ active: logFilters.error }"
                    @click="toggleLogFilter('error')"
                  >
                    <i class="fas fa-exclamation-circle"></i>
                    Error
                  </button>
                </div>
                <div class="tests-logs-output custom-scrollbar" ref="logsOutputRef">
                  <div v-if="displayedLogs.length === 0" class="tests-logs-empty">
                    Логи появятся здесь...
                  </div>
                  <div v-for="(item, index) in displayedLogs" :key="index" class="tests-log-item">
                    <div v-if="item.type === 'divider'" class="tests-log-date-divider">
                      --- {{ item.date }} ---
                    </div>
                    <div v-else class="tests-log-entry">
                      <span class="tests-log-time">{{ item.formattedTime }}</span>
                      <span class="tests-log-level" :class="`tests-log-level-${item.entry.level}`">
                        [{{ item.entry.level.toUpperCase() }}]
                      </span>
                      <span class="tests-log-message">{{ item.formattedMessage }}</span>
                    </div>
                  </div>
                </div>
                <div class="tests-logs-actions">
                  <div v-if="logsLoading" class="tests-logs-loading">
                    <i class="fas fa-spinner fa-spin"></i>
                    Загрузка логов...
                  </div>
                  <p v-if="logsError" class="tests-logs-error">{{ logsError }}</p>
                  <div class="tests-logs-action-row">
                    <button
                      v-if="!logsLoading"
                      type="button"
                      class="tests-load-more-btn"
                      :class="{ 'tests-load-more-btn-disabled': !logsHasMore }"
                      :disabled="!logsHasMore"
                      :title="
                        logsHasMore ? 'Загрузить более старые логи' : 'Нет более старых логов'
                      "
                      @click="loadMoreLogs"
                    >
                      <i class="fas fa-arrow-down"></i>
                      Загрузить ещё 50
                    </button>
                    <button
                      type="button"
                      class="tests-logs-clear-btn"
                      title="Очистить логи"
                      @click="clearLogs"
                    >
                      <i class="fas fa-trash-alt"></i>
                    </button>
                  </div>
                </div>
              </div>
            </aside>
          </div>
        </section>
      </div>
    </main>

    <AppFooter v-if="bootLoaderDone" />
  </div>
</template>

<style scoped>
.app-layout {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: transparent;
  position: relative;
  margin: 0;
  padding-top: 0;
}

.content-wrapper {
  position: relative;
  z-index: 10;
}

.content-inner {
  max-width: 1320px;
  margin: 0 auto;
  padding: 1.25rem 1.25rem 2rem;
}

@media (max-width: 768px) {
  .content-inner {
    padding: 1.5rem 1rem;
  }
}

.tests-section {
  opacity: 0;
  transform: translateY(20px);
  transition:
    opacity 0.8s ease,
    transform 0.8s ease;
}

.tests-section.content-visible {
  opacity: 1;
  transform: translateY(0);
}

/* CRT-оболочка: основная колонка + боковой «монитор» логов */
.tests-crt {
  --crt-green: #39ff9c;
  --crt-green-dim: rgba(57, 255, 156, 0.12);
  --crt-amber: #ffb020;
  font-family: 'Share Tech Mono', ui-monospace, monospace;
  image-rendering: pixelated;
}

.tests-crt-frame {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  align-items: stretch;
  position: relative;
  border: 2px solid var(--color-border);
  background: linear-gradient(180deg, #0c0c0c 0%, #080808 100%);
  box-shadow:
    inset 0 0 0 1px rgba(255, 255, 255, 0.04),
    0 0 0 1px #000,
    0 12px 40px rgba(0, 0, 0, 0.65);
}

.tests-crt-frame:not(.tests-crt-frame--with-logs) .tests-main-stack {
  padding: 0.75rem;
}

.tests-crt-frame--with-logs {
  flex-direction: row;
  gap: 0;
  align-items: stretch;
}

.tests-main-stack {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  padding: 0.75rem;
}

.tests-crt-frame--with-logs .tests-main-stack {
  padding: 0.75rem 0.5rem 0.75rem 0.75rem;
  border-right: 2px solid var(--color-border);
}

.tests-logs-aside {
  flex: 0 0 min(360px, 34vw);
  width: min(360px, 34vw);
  min-width: 260px;
  display: flex;
  flex-direction: column;
  position: relative;
  background: #020403;
}

.tests-logs-aside-inner {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
  padding: 0.65rem 0.65rem 0.75rem;
  position: relative;
  z-index: 1;
}

.tests-crt-logs::after {
  content: '';
  pointer-events: none;
  position: absolute;
  inset: 0;
  background: repeating-linear-gradient(
    0deg,
    rgba(0, 0, 0, 0.1) 0px,
    rgba(0, 0, 0, 0.1) 1px,
    transparent 1px,
    transparent 3px
  );
  opacity: 0.35;
  z-index: 2;
}

.tests-crt-bezel-title {
  display: block;
  font-size: 0.65rem;
  letter-spacing: 0.22em;
  text-transform: uppercase;
  color: var(--crt-amber);
  margin-bottom: 0.35rem;
  text-shadow: 0 0 8px rgba(255, 176, 32, 0.35);
}

.tests-crt-label {
  display: inline-block;
  font-size: 0.65rem;
  letter-spacing: 0.18em;
  color: var(--color-text-tertiary);
  margin-bottom: 0.25rem;
}

.tests-dashboard-top {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  justify-content: space-between;
  gap: 0.75rem;
  margin-bottom: 0.5rem;
}

.tests-dashboard-title-row {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
}

.tests-dashboard-title {
  font-size: 1.1rem;
  font-weight: 700;
  color: var(--color-text);
  margin: 0;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

.tests-mode-switch {
  display: inline-flex;
  flex-wrap: wrap;
  border: 2px solid var(--color-border);
  background: #0a0a0a;
  box-shadow: inset 0 0 0 1px rgba(0, 0, 0, 0.8);
}

.tests-mode-btn {
  margin: 0;
  padding: 0.45rem 0.85rem;
  font-family: inherit;
  font-size: 0.75rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--color-text-tertiary);
  background: transparent;
  border: none;
  border-right: 2px solid var(--color-border);
  cursor: pointer;
  transition:
    color 0.15s ease,
    background 0.15s ease;
}

.tests-mode-btn:last-child {
  border-right: none;
}

.tests-mode-btn:hover {
  color: var(--color-text);
  background: rgba(255, 255, 255, 0.04);
}

.tests-mode-btn--active {
  color: #0a0a0a;
  background: var(--color-accent);
  box-shadow: inset 0 0 12px rgba(255, 255, 255, 0.15);
}

.tests-mode-btn--legacy-tab.tests-mode-btn--active {
  background: var(--crt-amber);
  color: #1a0a00;
  box-shadow: inset 0 0 12px rgba(255, 255, 255, 0.12);
}

.tests-empty-suite {
  border: 2px dashed var(--color-border);
  background: rgba(0, 0, 0, 0.35);
  padding: 1.25rem 1.35rem;
}

.tests-empty-suite-title {
  font-size: 0.88rem;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  margin: 0 0 0.5rem 0;
  color: var(--color-text-secondary);
}

.tests-empty-suite-text {
  margin: 0;
  font-size: 0.8rem;
  line-height: 1.5;
  color: var(--color-text-tertiary);
}

.tests-mode-hint {
  font-size: 0.78rem;
  line-height: 1.45;
  color: var(--color-text-secondary);
  margin: 0 0 0.85rem 0;
  padding: 0.5rem 0.6rem;
  border: 1px dashed var(--color-border);
  background: rgba(0, 0, 0, 0.35);
}

@media (max-width: 1024px) {
  .tests-crt-frame--with-logs {
    flex-direction: column;
    border: 2px solid var(--color-border);
  }

  .tests-crt-frame--with-logs .tests-main-stack {
    border-right: none;
    border-bottom: 2px solid var(--color-border);
    padding: 0.75rem;
  }

  .tests-logs-aside {
    flex: none;
    width: 100%;
    min-width: 0;
    min-height: 280px;
  }
}

.tests-card {
  background: linear-gradient(135deg, var(--color-bg-secondary) 0%, var(--color-bg-tertiary) 100%);
  border: 1px solid var(--color-border);
  border-radius: 0;
  padding: 1.35rem 1.5rem;
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.04),
    0 12px 28px rgba(0, 0, 0, 0.45);
  position: relative;
  overflow: hidden;
}

.tests-crt-card {
  border: 2px solid var(--color-border);
  background: linear-gradient(180deg, #121212 0%, #0d0d0d 100%);
  box-shadow:
    inset 0 0 0 1px rgba(0, 0, 0, 0.85),
    inset 0 -24px 48px rgba(0, 0, 0, 0.35);
}

.tests-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 1px;
  background: linear-gradient(90deg, transparent, var(--color-accent), transparent);
}

.tests-card-content {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.tests-placeholder {
  margin: 0;
  font-size: 1rem;
}

/* Дашборд метрик тестов */
.tests-dashboard {
  margin-bottom: 0;
}

.tests-dashboard-metrics {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 1rem;
  margin-bottom: 1rem;
}

@media (max-width: 600px) {
  .tests-dashboard-metrics {
    grid-template-columns: repeat(2, 1fr);
  }
}

.tests-metric {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 1rem;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid var(--color-border);
  border-radius: 0;
  gap: 0.25rem;
}

.tests-metric-value {
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--color-text);
}

.tests-metric-label {
  font-size: 0.8rem;
  color: var(--color-text-secondary);
  text-transform: lowercase;
}

.tests-metric-passed .tests-metric-value {
  color: #2ecc71;
}
.tests-metric-failed .tests-metric-value {
  color: #e74c3c;
}
.tests-metric-skipped .tests-metric-value {
  color: #95a5a6;
}

.tests-dashboard-last-run {
  font-size: 0.85rem;
  color: var(--color-text-tertiary);
  margin: 0 0 1rem 0;
}

.tests-dashboard-actions {
  display: flex;
  justify-content: flex-start;
}

.tests-run-all-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 0.65rem 1.25rem;
  font-family: inherit;
  font-size: 0.95rem;
  color: #fff;
  background: linear-gradient(135deg, var(--color-accent) 0%, var(--color-accent-hover) 100%);
  border: 1px solid var(--color-accent);
  border-radius: 0;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: 0 4px 12px rgba(211, 35, 75, 0.3);
}

.tests-run-all-btn:hover:not(:disabled) {
  box-shadow: 0 6px 16px rgba(211, 35, 75, 0.4);
  filter: brightness(1.05);
}

.tests-run-all-btn:disabled {
  opacity: 0.7;
  cursor: not-allowed;
  transform: none;
}

/* Блок «Проверка эндпоинтов» */
.tests-endpoints-card {
  margin-bottom: 0;
}

.tests-endpoints-header {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 0.5rem;
}

.tests-endpoints-icon {
  font-size: 1.25rem;
  color: var(--color-accent);
}

.tests-endpoints-title {
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--color-text);
  margin: 0;
}

.tests-endpoints-desc {
  font-size: 0.9rem;
  color: var(--color-text-secondary);
  margin: 0 0 0.5rem 0;
  line-height: 1.45;
}

.tests-inline-code {
  font-family: ui-monospace, monospace;
  font-size: 0.85em;
  padding: 0.1em 0.35em;
  border-radius: 0;
  background: color-mix(in srgb, var(--color-text) 8%, transparent);
}

.tests-endpoints-last-run {
  font-size: 0.8rem;
  color: var(--color-text-tertiary);
  margin: 0 0 0.75rem 0;
}

.tests-endpoints-legend {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem 1.5rem;
  margin-bottom: 0.75rem;
  padding: 0.5rem 0;
  font-size: 0.85rem;
  color: var(--color-text-secondary);
}

.tests-endpoints-legend-item {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
}

.tests-endpoints-legend .tests-endpoints-badge {
  font-size: 0.65rem;
  padding: 0.15rem 0.35rem;
}

.tests-endpoints-list-label {
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--color-text);
  margin: 0 0 0.5rem 0;
}

.tests-endpoints-list-wrap {
  background: rgba(0, 0, 0, 0.25);
  border: 1px solid var(--color-border);
  border-radius: 0;
  padding: 0.75rem 1rem;
  margin-bottom: 1.25rem;
}

.tests-endpoints-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 0;
}

.tests-endpoints-list-item {
  display: flex;
  align-items: flex-start;
  flex-wrap: wrap;
  gap: 0.6rem;
  font-size: 0.9rem;
  min-height: 2.25rem;
  padding: 0.5rem 0;
  border-bottom: 1px solid var(--color-border);
  font-family: 'Share Tech Mono', monospace;
}

.tests-endpoints-list-item:last-child {
  border-bottom: none;
}

.tests-endpoints-list-item.tests-endpoints-status-success {
  border-left: 3px solid #22c55e;
  padding-left: 0.5rem;
  margin-left: -0.5rem;
}

.tests-endpoints-list-item.tests-endpoints-status-fail {
  border-left: 3px solid var(--color-accent);
  padding-left: 0.5rem;
  margin-left: -0.5rem;
}

.tests-endpoints-list-item.tests-endpoints-status-todo {
  border-left: 3px solid var(--color-border);
  padding-left: 0.5rem;
  margin-left: -0.5rem;
}

.tests-endpoints-badge {
  flex-shrink: 0;
  font-size: 0.7rem;
  font-weight: 600;
  padding: 0.2rem 0.5rem;
  border-radius: 0;
  letter-spacing: 0.03em;
}

.tests-endpoints-badge-todo {
  background: rgba(255, 255, 255, 0.06);
  color: var(--color-text-tertiary);
  border: 1px solid var(--color-border);
}

.tests-endpoints-badge-success {
  background: rgba(34, 197, 94, 0.18);
  color: #4ade80;
  border: 1px solid rgba(34, 197, 94, 0.35);
}

.tests-endpoints-badge-fail {
  background: rgba(211, 35, 75, 0.12);
  color: var(--color-accent);
  border: 1px solid rgba(211, 35, 75, 0.3);
}

.tests-endpoints-list-item.tests-endpoints-status-skip {
  border-left: 3px solid #ca8a04;
  padding-left: 0.5rem;
  margin-left: -0.5rem;
}

.tests-endpoints-badge-skip {
  background: rgba(234, 179, 8, 0.15);
  color: #facc15;
  border: 1px solid rgba(234, 179, 8, 0.35);
}

.tests-payment-link-raw {
  margin-top: 0.75rem;
  font-size: 0.75rem;
  color: var(--color-text-secondary);
}

.tests-payment-link-raw summary {
  cursor: pointer;
  user-select: none;
  margin-bottom: 0.35rem;
}

.tests-payment-link-raw-pre {
  max-height: 10rem;
  overflow: auto;
  margin: 0;
  padding: 0.5rem;
  white-space: pre-wrap;
  font-family: 'Share Tech Mono', monospace;
  background: rgba(0, 0, 0, 0.25);
  border: 1px solid var(--color-border);
}

.tests-webhook-live-urls {
  margin-top: 0.5rem;
  margin-bottom: 0.75rem;
  font-size: 0.8rem;
}

.tests-webhook-live-url-row {
  margin: 0.45rem 0;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.tests-webhook-live-label {
  color: var(--color-text-secondary);
  font-size: 0.75rem;
}

.tests-webhook-live-url-code {
  display: block;
  word-break: break-all;
  font-family: 'Share Tech Mono', monospace;
  font-size: 0.72rem;
  padding: 0.35rem 0.5rem;
  background: rgba(0, 0, 0, 0.2);
  border: 1px solid var(--color-border);
  border-radius: 4px;
}

.tests-webhook-live-pay-link {
  word-break: break-all;
  color: var(--color-accent, #7dd3fc);
}

.tests-webhook-live-meta {
  margin: 0.35rem 0 0;
  font-size: 0.75rem;
  color: var(--color-text-secondary);
}

.tests-gc-order-probe-fields {
  margin-top: 0.5rem;
  margin-bottom: 0.5rem;
}

.tests-gc-order-probe-input {
  width: 100%;
  max-width: 28rem;
  box-sizing: border-box;
  font-family: inherit;
  font-size: 0.85rem;
  padding: 0.45rem 0.55rem;
  color: var(--color-text);
  background: rgba(0, 0, 0, 0.2);
  border: 1px solid var(--color-border);
  border-radius: 4px;
}

.tests-gc-order-probe-input::placeholder {
  color: var(--color-text-tertiary);
}

.tests-webhook-live-other-pre {
  margin-bottom: 0.5rem;
}

.tests-endpoints-list-content {
  flex: 1;
  min-width: 0;
}

.tests-endpoints-list-title {
  font-weight: 600;
  color: var(--color-text);
  display: block;
  margin-bottom: 0.2rem;
}

.tests-endpoints-list-title-inline {
  font-weight: 600;
  color: var(--color-text);
  flex: 1;
  min-width: 0;
}

.tests-endpoints-list-category {
  font-size: 0.7rem;
  font-weight: 400;
  color: var(--color-text-tertiary);
  margin-left: 0.5rem;
}

.tests-endpoints-list-desc {
  font-size: 0.8rem;
  color: var(--color-text-secondary);
  line-height: 1.4;
  margin: 0;
  font-weight: 400;
  font-family: inherit;
}

.tests-endpoints-list-error {
  font-size: 0.8rem;
  color: var(--color-text-secondary);
  flex-shrink: 0;
}

.tests-endpoints-actions {
  display: flex;
  justify-content: flex-start;
}

.tests-run-group-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 0.65rem 1.25rem;
  font-family: inherit;
  font-size: 0.95rem;
  color: #fff;
  background: linear-gradient(135deg, var(--color-accent) 0%, var(--color-accent-hover) 100%);
  border: 1px solid var(--color-accent);
  border-radius: 0;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: 0 4px 12px rgba(211, 35, 75, 0.25);
}

.tests-run-group-btn:hover:not(:disabled) {
  box-shadow: 0 6px 16px rgba(211, 35, 75, 0.35);
  filter: brightness(1.05);
}

.tests-run-group-btn:disabled {
  opacity: 0.7;
  cursor: not-allowed;
  transform: none;
}

.tests-run-one-btn {
  flex-shrink: 0;
  margin-left: auto;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2rem;
  height: 2rem;
  padding: 0;
  font-size: 0.75rem;
  color: var(--color-text-secondary);
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid var(--color-border);
  border-radius: 0;
  cursor: pointer;
  transition:
    color 0.2s ease,
    border-color 0.2s ease,
    background 0.2s ease;
}

.tests-run-one-btn:hover:not(:disabled) {
  color: #fff;
  border-color: var(--color-accent);
  background: rgba(211, 35, 75, 0.15);
}

.tests-run-one-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* Блок логов (выше tests-card) */
.tests-logs-card {
  background: linear-gradient(135deg, var(--color-bg-secondary) 0%, var(--color-bg-tertiary) 100%);
  border: 1px solid var(--color-border);
  border-radius: 0;
  padding: 2rem;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.4);
  position: relative;
  overflow: hidden;
  margin-bottom: 2rem;
}

.tests-logs-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 1px;
  background: linear-gradient(90deg, transparent, var(--color-accent), transparent);
}

.tests-logs-card-header {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 1rem;
}

.tests-logs-aside .tests-logs-card-header {
  flex-direction: column;
  align-items: flex-start;
  gap: 0.15rem;
  margin-bottom: 0.65rem;
  border-bottom: 1px solid rgba(57, 255, 156, 0.2);
  padding-bottom: 0.5rem;
}

.tests-logs-card-icon {
  font-size: 1.25rem;
  color: var(--color-accent);
}

.tests-logs-card-title {
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--color-text);
  margin: 0;
}

.tests-logs-aside .tests-logs-card-title {
  font-size: 1rem;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--crt-green);
  text-shadow: 0 0 10px rgba(57, 255, 156, 0.35);
}

.tests-logs-filters {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-bottom: 1rem;
}

.tests-log-filter-chip {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.35rem 0.75rem;
  font-family: inherit;
  font-size: 0.8rem;
  color: var(--color-text-tertiary);
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid var(--color-border);
  border-radius: 0;
  cursor: pointer;
  transition: all 0.2s ease;
  letter-spacing: 0.04em;
}

.tests-log-filter-chip:hover {
  color: var(--color-text-secondary);
  border-color: var(--color-border-light);
  background: rgba(255, 255, 255, 0.05);
}

.tests-log-filter-chip.active {
  color: var(--color-text);
}

.tests-log-filter-chip.chip-info.active {
  border-color: #3498db;
  background: rgba(52, 152, 219, 0.12);
}

.tests-log-filter-chip.chip-info.active i {
  color: #3498db;
}

.tests-log-filter-chip.chip-warn.active {
  border-color: #f39c12;
  background: rgba(243, 156, 18, 0.12);
}

.tests-log-filter-chip.chip-warn.active i {
  color: #f39c12;
}

.tests-log-filter-chip.chip-error.active {
  border-color: #e74c3c;
  background: rgba(231, 76, 60, 0.12);
}

.tests-log-filter-chip.chip-error.active i {
  color: #e74c3c;
}

.tests-logs-output {
  background: #080808;
  border: 1px solid var(--color-border);
  border-radius: 0;
  height: 400px;
  overflow: auto;
  padding: 1rem;
  font-family: 'Share Tech Mono', 'Courier New', monospace;
  font-size: 0.8rem;
}

.tests-logs-aside .tests-logs-output {
  flex: 1;
  min-height: 220px;
  height: auto;
  max-height: min(72vh, 640px);
  background: #010403;
  border: 1px solid rgba(57, 255, 156, 0.22);
  box-shadow:
    inset 0 0 40px rgba(0, 40, 20, 0.45),
    inset 0 0 0 1px rgba(0, 0, 0, 0.9);
  font-size: 0.72rem;
  line-height: 1.35;
}

.tests-logs-empty {
  color: var(--color-text-secondary);
  text-align: center;
  padding: 2rem;
}

.tests-log-item {
  margin-bottom: 0;
}

.tests-log-date-divider {
  text-align: center;
  color: #555;
  font-size: 0.75rem;
  padding: 0.5rem 0;
  margin: 0.5rem 0;
  opacity: 0.7;
  letter-spacing: 0.1em;
}

.tests-log-entry {
  display: flex;
  gap: 0.5rem;
  padding: 0.15rem 0;
  line-height: 1.4;
}

.tests-log-time {
  color: var(--color-text-tertiary);
  flex-shrink: 0;
}

.tests-log-level {
  flex-shrink: 0;
  font-weight: 600;
}

.tests-log-level-debug {
  color: #9b59b6;
}
.tests-log-level-info {
  color: #3498db;
}
.tests-log-level-notice {
  color: #1abc9c;
}
.tests-log-level-warning {
  color: #f39c12;
}
.tests-log-level-error {
  color: #e74c3c;
}
.tests-log-level-critical {
  color: #c0392b;
}
.tests-log-level-alert {
  color: #e67e22;
}
.tests-log-level-emergency {
  color: #d35400;
}

.tests-log-message {
  color: var(--color-text-secondary);
  word-break: break-word;
  flex: 1;
  min-width: 0;
}

.tests-logs-actions {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  margin-top: 1rem;
}

.tests-logs-action-row {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 0.5rem;
  width: 100%;
}

.tests-logs-action-row .tests-load-more-btn {
  flex: 1;
  min-width: 0;
  margin-right: auto;
}

.tests-logs-clear-btn {
  flex-shrink: 0;
  width: 2.75rem;
  height: 2.75rem;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  font-size: 1rem;
  color: var(--color-text-secondary);
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid var(--color-border);
  border-radius: 0;
  cursor: pointer;
  transition: all 0.2s ease;
}

.tests-logs-clear-btn:hover {
  color: #fff;
  background: #e74c3c;
  border-color: #e74c3c;
  box-shadow: 0 0 12px rgba(231, 76, 60, 0.3);
}

.tests-logs-loading {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.85rem;
  color: var(--color-text-secondary);
  padding: 0.5rem 0;
}

.tests-logs-loading i {
  color: var(--color-accent);
}

.tests-logs-error {
  font-size: 0.85rem;
  color: #e74c3c;
  margin: 0;
  padding: 0.5rem 0.75rem;
  background: rgba(231, 76, 60, 0.1);
  border: 1px solid rgba(231, 76, 60, 0.3);
  border-radius: 0;
}

.tests-load-more-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 0.6rem 1.2rem;
  font-family: inherit;
  font-size: 0.9rem;
  color: var(--color-text);
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid var(--color-border);
  border-radius: 0;
  cursor: pointer;
  transition: all 0.2s ease;
  letter-spacing: 0.04em;
}

.tests-load-more-btn:hover:not(:disabled) {
  color: #fff;
  background: var(--color-accent);
  border-color: var(--color-accent);
  box-shadow: 0 0 12px rgba(211, 35, 75, 0.3);
}

.tests-load-more-btn:disabled,
.tests-load-more-btn.tests-load-more-btn-disabled {
  color: var(--color-text-tertiary);
  cursor: not-allowed;
  opacity: 0.7;
}

.tests-load-more-btn:disabled:hover,
.tests-load-more-btn.tests-load-more-btn-disabled:hover {
  background: rgba(255, 255, 255, 0.04);
  border-color: var(--color-border);
  box-shadow: none;
}

.tests-load-more-btn i {
  font-size: 0.85rem;
}

@media (max-width: 768px) {
  .tests-heading {
    font-size: 2rem;
  }

  .tests-card {
    padding: 1.5rem;
  }

  .tests-logs-card {
    padding: 1.5rem;
  }
}
</style>
