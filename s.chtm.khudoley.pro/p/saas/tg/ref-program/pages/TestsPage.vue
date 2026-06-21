<script setup lang="ts">
import { onMounted, onBeforeUnmount, onUnmounted, ref, computed } from 'vue'
import { getOrCreateBrowserSocketClient } from '@app/socket'
import Header from '../components/Header.vue'
import GlobalGlitch from '../components/GlobalGlitch.vue'
import AppFooter from '../components/AppFooter.vue'
import { createComponentLogger, setLogSink, type LogEntry } from '../shared/logger'
import { getRecentLogsRoute } from '../api/admin/logs/recent'
import { getLogsBeforeRoute } from '../api/admin/logs/before'

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

const displayedTitle = ref('')
const displayedDescription = ref('')
const showCursor = ref(false)
const cursorPosition = ref<'title' | 'description' | 'final'>('title')
const showTitleUnderline = ref(false)

const intervalIds = {
  title: null as ReturnType<typeof setInterval> | null,
  desc: null as ReturnType<typeof setInterval> | null
}

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

const typeTextSequence = () => {
  log.debug('Tests title animation started')
  const titleText = 'Тесты'
  cursorPosition.value = 'title'

  let titleIndex = 0
  intervalIds.title = setInterval(() => {
    if (titleIndex < titleText.length) {
      displayedTitle.value = titleText.substring(0, titleIndex + 1)
      titleIndex++
    } else {
      if (intervalIds.title) clearInterval(intervalIds.title)
      intervalIds.title = null
      showTitleUnderline.value = true
      typeDescription()
    }
  }, 15)
}

const typeDescription = () => {
  const descriptionText = 'Страница для тестов и проверок'
  cursorPosition.value = 'description'
  let descIndex = 0
  intervalIds.desc = setInterval(() => {
    if (descIndex < descriptionText.length) {
      displayedDescription.value = descriptionText.substring(0, descIndex + 1)
      descIndex++
    } else {
      if (intervalIds.desc) clearInterval(intervalIds.desc)
      intervalIds.desc = null
      cursorPosition.value = 'final'
      showContent.value = true
    }
  }, 15)
}

const startAnimations = () => {
  log.info('Boot loader complete, starting tests page animations')
  bootLoaderDone.value = true
  showCursor.value = true
  cursorPosition.value = 'title'
  setTimeout(() => typeTextSequence(), 200)
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
  if (intervalIds.title) clearInterval(intervalIds.title)
  if (intervalIds.desc) clearInterval(intervalIds.desc)
})

const openChatiumLink = () => {
  log.notice('Opening Chatium link')
  window.open('https://chatium.ru/?start=pl-LGBT1Oge7c61RkKTU4t0start', '_blank')
}

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

/** Базовый URL (origin + путь проекта без trailing slash) */
function getApiBaseUrl(): string {
  const path = props.indexUrl.startsWith('http') ? new URL(props.indexUrl).pathname : props.indexUrl
  const basePath = path.replace(/\/$/, '') || '/p/template_project'
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
  { id: 'web-tests', path: '/web/tests', title: 'Эндпоинт /web/tests' }
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

/* --- Блок 7: Генератор идентификаторов (refGenerator) --- */
const REF_GENERATOR_TESTS: Array<{ id: string; title: string }> = [
  { id: 'generateUrlSafeId-default', title: 'generateUrlSafeId() — длина 8, base62' },
  { id: 'generateUrlSafeId-length', title: 'generateUrlSafeId(12) — длина 12, base62' },
  { id: 'generateCampaignSecret', title: 'generateCampaignSecret() — длина 8, base62' },
  { id: 'generateLinkSlug', title: 'generateLinkSlug() — длина 10, base62' }
]
const refGeneratorResults = ref<TestResult[]>([])
const refGeneratorLoading = ref(false)
const refGeneratorLastRunAt = ref<string | null>(null)

const refGeneratorDisplay = computed(() => {
  const byId = new Map(refGeneratorResults.value.map((r) => [r.id, r]))
  return REF_GENERATOR_TESTS.map((t) => {
    const res = byId.get(t.id)
    return {
      id: t.id,
      title: t.title,
      status: res === undefined ? 'todo' : res.passed ? 'success' : 'fail',
      error: res && !res.passed ? res.error : undefined
    }
  })
})

/* --- Блок 7b: Fingerprint (lib/core/fingerprint) --- */
const FINGERPRINT_TESTS: Array<{ id: string; title: string }> = [
  { id: 'computeFingerprint-basic', title: 'computeFingerprint — hash и parts по заголовкам' },
  {
    id: 'computeFingerprint-x-forwarded-for-first',
    title: 'IP из X-Forwarded-For — берётся первый адрес'
  },
  { id: 'computeFingerprint-x-real-ip', title: 'IP из X-Real-IP при отсутствии X-Forwarded-For' },
  { id: 'computeFingerprint-empty-headers', title: 'Пустые заголовки — ip unknown, строки пустые' },
  { id: 'computeFingerprint-deterministic', title: 'Один и тот же запрос — один и тот же hash' },
  { id: 'computeFingerprint-optional-fields', title: 'Опциональные поля platform и timezone' }
]
const fingerprintResults = ref<TestResult[]>([])
const fingerprintLoading = ref(false)
const fingerprintLastRunAt = ref<string | null>(null)

const fingerprintDisplay = computed(() => {
  const byId = new Map(fingerprintResults.value.map((r) => [r.id, r]))
  return FINGERPRINT_TESTS.map((t) => {
    const res = byId.get(t.id)
    return {
      id: t.id,
      title: t.title,
      status: res === undefined ? 'todo' : res.passed ? 'success' : 'fail',
      error: res && !res.passed ? res.error : undefined
    }
  })
})

async function runRefGeneratorTests() {
  refGeneratorLoading.value = true
  refGeneratorResults.value = []
  const baseUrl = getApiBaseUrl().replace(/\/$/, '')
  log.info('Запуск проверки генератора идентификаторов')
  try {
    const res = await fetch(`${baseUrl}/api/tests/endpoints-check/ref-generator`, {
      method: 'GET',
      credentials: 'include'
    })
    const data = (await res.json().catch(() => null)) as {
      success?: boolean
      results?: TestResult[]
    }
    if (res.ok && data?.success && Array.isArray(data.results)) {
      refGeneratorResults.value = data.results
    } else {
      refGeneratorResults.value = REF_GENERATOR_TESTS.map((t) => ({
        id: t.id,
        title: t.title,
        passed: false,
        error: 'Ошибка запроса'
      }))
    }
    refGeneratorLastRunAt.value = new Date().toLocaleString('ru-RU')
  } finally {
    refGeneratorLoading.value = false
  }
}

async function runFingerprintTests() {
  fingerprintLoading.value = true
  fingerprintResults.value = []
  const baseUrl = getApiBaseUrl().replace(/\/$/, '')
  log.info('Запуск проверки fingerprint')
  try {
    const res = await fetch(`${baseUrl}/api/tests/endpoints-check/fingerprint`, {
      method: 'GET',
      credentials: 'include'
    })
    const data = (await res.json().catch(() => null)) as {
      success?: boolean
      results?: TestResult[]
    }
    if (res.ok && data?.success && Array.isArray(data.results)) {
      fingerprintResults.value = data.results
    } else {
      fingerprintResults.value = FINGERPRINT_TESTS.map((t) => ({
        id: t.id,
        title: t.title,
        passed: false,
        error: 'Ошибка запроса'
      }))
    }
    fingerprintLastRunAt.value = new Date().toLocaleString('ru-RU')
  } finally {
    fingerprintLoading.value = false
  }
}

/* --- Блок 8: Репозиторий участников кампании (memberRepo) --- */
const MEMBER_REPO_TESTS: Array<{ id: string; title: string }> = [
  { id: 'addMember', title: 'addMember' },
  { id: 'checkCampaignAccess-hasAccess', title: 'checkCampaignAccess (есть доступ)' },
  { id: 'checkCampaignAccess-noAccess', title: 'checkCampaignAccess (нет доступа)' }
]
const memberRepoResults = ref<TestResult[]>([])
const memberRepoLoading = ref(false)
const memberRepoLastRunAt = ref<string | null>(null)

const memberRepoDisplay = computed(() => {
  const byId = new Map(memberRepoResults.value.map((r) => [r.id, r]))
  return MEMBER_REPO_TESTS.map((t) => {
    const res = byId.get(t.id)
    return {
      id: t.id,
      title: t.title,
      status: res === undefined ? 'todo' : res.passed ? 'success' : 'fail',
      error: res && !res.passed ? res.error : undefined
    }
  })
})

async function runMemberRepoTests() {
  memberRepoLoading.value = true
  memberRepoResults.value = []
  const baseUrl = getApiBaseUrl().replace(/\/$/, '')
  log.info('Запуск проверки репозитория участников кампании')
  try {
    const res = await fetch(`${baseUrl}/api/tests/endpoints-check/member-repo`, {
      method: 'GET',
      credentials: 'include'
    })
    const data = (await res.json().catch(() => null)) as {
      success?: boolean
      results?: TestResult[]
    }
    if (res.ok && data?.success && Array.isArray(data.results)) {
      memberRepoResults.value = data.results
    } else {
      memberRepoResults.value = MEMBER_REPO_TESTS.map((t) => ({
        id: t.id,
        title: t.title,
        passed: false,
        error: 'Ошибка запроса'
      }))
    }
    memberRepoLastRunAt.value = new Date().toLocaleString('ru-RU')
  } finally {
    memberRepoLoading.value = false
  }
}

/* --- Блок 9: Репозиторий кампаний (campaignRepo) --- */
const CAMPAIGN_REPO_TESTS: Array<{ id: string; title: string }> = [
  { id: 'createCampaign', title: 'createCampaign' },
  { id: 'getCampaignById-found', title: 'getCampaignById (найдена)' },
  { id: 'getCampaignById-notFound', title: 'getCampaignById (не найдена)' },
  { id: 'getUserCampaigns', title: 'getUserCampaigns' }
]
const campaignRepoResults = ref<TestResult[]>([])
const campaignRepoLoading = ref(false)
const campaignRepoLastRunAt = ref<string | null>(null)

const campaignRepoDisplay = computed(() => {
  const byId = new Map(campaignRepoResults.value.map((r) => [r.id, r]))
  return CAMPAIGN_REPO_TESTS.map((t) => {
    const res = byId.get(t.id)
    return {
      id: t.id,
      title: t.title,
      status: res === undefined ? 'todo' : res.passed ? 'success' : 'fail',
      error: res && !res.passed ? res.error : undefined
    }
  })
})

async function runCampaignRepoTests() {
  campaignRepoLoading.value = true
  campaignRepoResults.value = []
  const baseUrl = getApiBaseUrl().replace(/\/$/, '')
  log.info('Запуск проверки репозитория кампаний')
  try {
    const res = await fetch(`${baseUrl}/api/tests/endpoints-check/campaign-repo`, {
      method: 'GET',
      credentials: 'include'
    })
    const data = (await res.json().catch(() => null)) as {
      success?: boolean
      results?: TestResult[]
    }
    if (res.ok && data?.success && Array.isArray(data.results)) {
      campaignRepoResults.value = data.results
    } else {
      campaignRepoResults.value = CAMPAIGN_REPO_TESTS.map((t) => ({
        id: t.id,
        title: t.title,
        passed: false,
        error: 'Ошибка запроса'
      }))
    }
    campaignRepoLastRunAt.value = new Date().toLocaleString('ru-RU')
  } finally {
    campaignRepoLoading.value = false
  }
}

/* --- Блок 10: API кампаний (list, create) --- */
const CAMPAIGNS_API_TESTS: Array<{ id: string; title: string }> = [
  { id: 'campaigns-list', title: 'GET /api/campaigns/list' },
  { id: 'campaigns-create', title: 'POST /api/campaigns/create (успех)' },
  { id: 'campaigns-create-validation', title: 'POST /api/campaigns/create (валидация)' }
]
const campaignsApiResults = ref<TestResult[]>([])
const campaignsApiLoading = ref(false)
const campaignsApiLastRunAt = ref<string | null>(null)

const campaignsApiDisplay = computed(() => {
  const byId = new Map(campaignsApiResults.value.map((r) => [r.id, r]))
  return CAMPAIGNS_API_TESTS.map((t) => {
    const res = byId.get(t.id)
    return {
      id: t.id,
      title: t.title,
      status: res === undefined ? 'todo' : res.passed ? 'success' : 'fail',
      error: res && !res.passed ? res.error : undefined
    }
  })
})

/* --- Блок 11: Построение URL (urlBuilder) --- */
const URL_BUILDER_TESTS: Array<{ id: string; title: string }> = [
  { id: 'substituteRef-single', title: 'substituteRef — одна подстановка {ref}' },
  { id: 'substituteRef-multiple', title: 'substituteRef — несколько вхождений {ref}' },
  { id: 'buildPartnerLinkUrl', title: 'buildPartnerLinkUrl — URL содержит slug и путь редиректа' }
]
const urlBuilderResults = ref<TestResult[]>([])
const urlBuilderLoading = ref(false)
const urlBuilderLastRunAt = ref<string | null>(null)

const urlBuilderDisplay = computed(() => {
  const byId = new Map(urlBuilderResults.value.map((r) => [r.id, r]))
  return URL_BUILDER_TESTS.map((t) => {
    const res = byId.get(t.id)
    return {
      id: t.id,
      title: t.title,
      status: res === undefined ? 'todo' : res.passed ? 'success' : 'fail',
      error: res && !res.passed ? res.error : undefined
    }
  })
})

async function runUrlBuilderTests() {
  urlBuilderLoading.value = true
  urlBuilderResults.value = []
  const baseUrl = getApiBaseUrl().replace(/\/$/, '')
  log.info('Запуск проверки urlBuilder')
  try {
    const res = await fetch(`${baseUrl}/api/tests/endpoints-check/url-builder`, {
      method: 'GET',
      credentials: 'include'
    })
    const data = (await res.json().catch(() => null)) as {
      success?: boolean
      results?: TestResult[]
    }
    if (res.ok && data?.success && Array.isArray(data.results)) {
      urlBuilderResults.value = data.results
    } else {
      urlBuilderResults.value = URL_BUILDER_TESTS.map((t) => ({
        id: t.id,
        title: t.title,
        passed: false,
        error: 'Ошибка запроса'
      }))
    }
    urlBuilderLastRunAt.value = new Date().toLocaleString('ru-RU')
  } finally {
    urlBuilderLoading.value = false
  }
}

/* --- Блок 12: Репозиторий страниц (pageRepo) --- */
const PAGE_REPO_TESTS: Array<{ id: string; title: string }> = [
  { id: 'createPage', title: 'createPage' },
  { id: 'getPageById-found', title: 'getPageById (найдена)' },
  { id: 'getPageById-notFound', title: 'getPageById (не найдена)' },
  { id: 'getCampaignPages', title: 'getCampaignPages' }
]
const pageRepoResults = ref<TestResult[]>([])
const pageRepoLoading = ref(false)
const pageRepoLastRunAt = ref<string | null>(null)

const pageRepoDisplay = computed(() => {
  const byId = new Map(pageRepoResults.value.map((r) => [r.id, r]))
  return PAGE_REPO_TESTS.map((t) => {
    const res = byId.get(t.id)
    return {
      id: t.id,
      title: t.title,
      status: res === undefined ? 'todo' : res.passed ? 'success' : 'fail',
      error: res && !res.passed ? res.error : undefined
    }
  })
})

async function runPageRepoTests() {
  pageRepoLoading.value = true
  pageRepoResults.value = []
  const baseUrl = getApiBaseUrl().replace(/\/$/, '')
  log.info('Запуск проверки pageRepo')
  try {
    const res = await fetch(`${baseUrl}/api/tests/endpoints-check/page-repo`, {
      method: 'GET',
      credentials: 'include'
    })
    const data = (await res.json().catch(() => null)) as {
      success?: boolean
      results?: TestResult[]
    }
    if (res.ok && data?.success && Array.isArray(data.results)) {
      pageRepoResults.value = data.results
    } else {
      pageRepoResults.value = PAGE_REPO_TESTS.map((t) => ({
        id: t.id,
        title: t.title,
        passed: false,
        error: 'Ошибка запроса'
      }))
    }
    pageRepoLastRunAt.value = new Date().toLocaleString('ru-RU')
  } finally {
    pageRepoLoading.value = false
  }
}

/* --- Блок 13: Репозиторий партнёрских ссылок (linkRepo) --- */
const LINK_REPO_TESTS: Array<{ id: string; title: string }> = [
  { id: 'getOrCreatePartnerLink', title: 'getOrCreatePartnerLink' },
  {
    id: 'getOrCreatePartnerLink-idempotent',
    title: 'getOrCreatePartnerLink (повтор — та же ссылка)'
  },
  { id: 'getPartnerLinks', title: 'getPartnerLinks' },
  { id: 'findLinkByPublicSlug', title: 'findLinkByPublicSlug' }
]
const linkRepoResults = ref<TestResult[]>([])
const linkRepoLoading = ref(false)
const linkRepoLastRunAt = ref<string | null>(null)

const linkRepoDisplay = computed(() => {
  const byId = new Map(linkRepoResults.value.map((r) => [r.id, r]))
  return LINK_REPO_TESTS.map((t) => {
    const res = byId.get(t.id)
    return {
      id: t.id,
      title: t.title,
      status: res === undefined ? 'todo' : res.passed ? 'success' : 'fail',
      error: res && !res.passed ? res.error : undefined
    }
  })
})

/* --- Блок 14: Репозиторий визитов (visitRepo) --- */
const VISIT_REPO_TESTS: Array<{ id: string; title: string }> = [
  { id: 'createVisit', title: 'createVisit (новый визит)' },
  { id: 'createVisit-idempotent', title: 'createVisit (повтор — тот же ref)' },
  { id: 'findVisitByRef-found', title: 'findVisitByRef (найден)' },
  { id: 'findVisitByRef-notFound', title: 'findVisitByRef (не найден)' },
  { id: 'markVisitRegistered', title: 'markVisitRegistered' }
]
const visitRepoResults = ref<TestResult[]>([])
const visitRepoLoading = ref(false)
const visitRepoLastRunAt = ref<string | null>(null)

const visitRepoDisplay = computed(() => {
  const byId = new Map(visitRepoResults.value.map((r) => [r.id, r]))
  return VISIT_REPO_TESTS.map((t) => {
    const res = byId.get(t.id)
    return {
      id: t.id,
      title: t.title,
      status: res === undefined ? 'todo' : res.passed ? 'success' : 'fail',
      error: res && !res.passed ? res.error : undefined
    }
  })
})

async function runLinkRepoTests() {
  linkRepoLoading.value = true
  linkRepoResults.value = []
  const baseUrl = getApiBaseUrl().replace(/\/$/, '')
  log.info('Запуск проверки linkRepo')
  try {
    const res = await fetch(`${baseUrl}/api/tests/endpoints-check/link-repo`, {
      method: 'GET',
      credentials: 'include'
    })
    const data = (await res.json().catch(() => null)) as {
      success?: boolean
      results?: TestResult[]
    }
    if (res.ok && data?.success && Array.isArray(data.results)) {
      linkRepoResults.value = data.results
    } else {
      linkRepoResults.value = LINK_REPO_TESTS.map((t) => ({
        id: t.id,
        title: t.title,
        passed: false,
        error: 'Ошибка запроса'
      }))
    }
    linkRepoLastRunAt.value = new Date().toLocaleString('ru-RU')
  } finally {
    linkRepoLoading.value = false
  }
}

async function runVisitRepoTests() {
  visitRepoLoading.value = true
  visitRepoResults.value = []
  const baseUrl = getApiBaseUrl().replace(/\/$/, '')
  log.info('Запуск проверки visitRepo')
  try {
    const res = await fetch(`${baseUrl}/api/tests/endpoints-check/visit-repo`, {
      method: 'GET',
      credentials: 'include'
    })
    const data = (await res.json().catch(() => null)) as {
      success?: boolean
      results?: TestResult[]
    }
    if (res.ok && data?.success && Array.isArray(data.results)) {
      visitRepoResults.value = data.results
    } else {
      visitRepoResults.value = VISIT_REPO_TESTS.map((t) => ({
        id: t.id,
        title: t.title,
        passed: false,
        error: 'Ошибка запроса'
      }))
    }
    visitRepoLastRunAt.value = new Date().toLocaleString('ru-RU')
  } finally {
    visitRepoLoading.value = false
  }
}

/* --- Блок 15: Роут редиректа (GET /r?linkId=) --- */
const REDIRECT_ROUTE_TESTS: Array<{ id: string; title: string }> = [
  { id: 'redirect-404-unknown-slug', title: 'GET /r?linkId= — неизвестный slug → 404' },
  { id: 'redirect-success', title: 'GET /r?linkId= — редирект и визит' },
  { id: 'redirect-idempotent', title: 'GET /r?linkId= — повторный клик (тот же ref)' }
]
const redirectRouteResults = ref<TestResult[]>([])
const redirectRouteLoading = ref(false)
const redirectRouteLastRunAt = ref<string | null>(null)

const redirectRouteDisplay = computed(() => {
  const byId = new Map(redirectRouteResults.value.map((r) => [r.id, r]))
  return REDIRECT_ROUTE_TESTS.map((t) => {
    const res = byId.get(t.id)
    return {
      id: t.id,
      title: t.title,
      status: res === undefined ? 'todo' : res.passed ? 'success' : 'fail',
      error: res && !res.passed ? res.error : undefined
    }
  })
})

async function runRedirectRouteTests() {
  redirectRouteLoading.value = true
  redirectRouteResults.value = []
  const baseUrl = getApiBaseUrl().replace(/\/$/, '')
  log.info('Запуск проверки роута редиректа')
  try {
    const res = await fetch(`${baseUrl}/api/tests/endpoints-check/redirect-route`, {
      method: 'GET',
      credentials: 'include'
    })
    log.info('Ответ от redirect-route:', { status: res.status, ok: res.ok })
    const data = (await res.json().catch(() => null)) as {
      success?: boolean
      results?: TestResult[]
    }
    log.info('Данные от redirect-route:', {
      success: data?.success,
      resultsCount: data?.results?.length
    })
    if (res.ok && data?.success && Array.isArray(data.results)) {
      redirectRouteResults.value = data.results.map((r) => ({
        id: r.id,
        title: r.title,
        passed: !!r.passed,
        error: r.error
      }))
    } else if (!res.ok) {
      redirectRouteResults.value = REDIRECT_ROUTE_TESTS.map((t) => ({
        id: t.id,
        title: t.title,
        passed: false,
        error: `HTTP ${res.status}`
      }))
    } else {
      redirectRouteResults.value = REDIRECT_ROUTE_TESTS.map((t) => ({
        id: t.id,
        title: t.title,
        passed: false,
        error: data?.success === false ? 'Ошибка сервера' : 'Неверный формат ответа'
      }))
    }
    redirectRouteLastRunAt.value = new Date().toLocaleString('ru-RU')
  } catch (e) {
    log.error('Ошибка запроса проверки роута редиректа', e)
    redirectRouteResults.value = REDIRECT_ROUTE_TESTS.map((t) => ({
      id: t.id,
      title: t.title,
      passed: false,
      error: (e as Error)?.message ?? 'Ошибка сети'
    }))
    redirectRouteLastRunAt.value = new Date().toLocaleString('ru-RU')
  } finally {
    redirectRouteLoading.value = false
  }
}

/* --- Блок: Репозиторий рефералов (referral-repo) --- */
const REFERRAL_REPO_TESTS: Array<{ id: string; title: string }> = [
  { id: 'createOrUpdateReferral-new', title: 'createOrUpdateReferral (новый реферал)' },
  { id: 'createOrUpdateReferral-update', title: 'createOrUpdateReferral (обновление)' },
  { id: 'incrementReferralStats', title: 'incrementReferralStats' }
]
const referralRepoResults = ref<TestResult[]>([])
const referralRepoLoading = ref(false)
const referralRepoLastRunAt = ref<string | null>(null)
const referralRepoDisplay = computed(() => {
  const byId = new Map(referralRepoResults.value.map((r) => [r.id, r]))
  return REFERRAL_REPO_TESTS.map((t) => {
    const res = byId.get(t.id)
    return {
      id: t.id,
      title: t.title,
      status: res === undefined ? 'todo' : res.passed ? 'success' : 'fail',
      error: res && !res.passed ? res.error : undefined
    }
  })
})
async function runReferralRepoTests() {
  referralRepoLoading.value = true
  referralRepoResults.value = []
  const baseUrl = getApiBaseUrl().replace(/\/$/, '')
  try {
    const res = await fetch(`${baseUrl}/api/tests/endpoints-check/referral-repo`, {
      method: 'GET',
      credentials: 'include'
    })
    const data = (await res.json()) as { success?: boolean; results?: TestResult[] }
    if (res.ok && data?.success && Array.isArray(data.results)) {
      referralRepoResults.value = data.results.map((r) => ({
        id: r.id,
        title: r.title,
        passed: !!r.passed,
        error: r.error
      }))
    } else {
      referralRepoResults.value = REFERRAL_REPO_TESTS.map((t) => ({
        id: t.id,
        title: t.title,
        passed: false,
        error: 'Ошибка запроса'
      }))
    }
    referralRepoLastRunAt.value = new Date().toLocaleString('ru-RU')
  } catch (e) {
    referralRepoResults.value = REFERRAL_REPO_TESTS.map((t) => ({
      id: t.id,
      title: t.title,
      passed: false,
      error: (e as Error)?.message ?? 'Ошибка сети'
    }))
    referralRepoLastRunAt.value = new Date().toLocaleString('ru-RU')
  } finally {
    referralRepoLoading.value = false
  }
}

/* --- Блок: Репозиторий событий (event-repo) --- */
const EVENT_REPO_TESTS: Array<{ id: string; title: string }> = [
  { id: 'processRegistration-new', title: 'processRegistration (новый)' },
  { id: 'processRegistration-idempotent', title: 'processRegistration (идемпотентность)' },
  { id: 'processOrder-new', title: 'processOrder (новый заказ)' },
  { id: 'processOrder-idempotent', title: 'processOrder (идемпотентность)' },
  { id: 'processPayment-new', title: 'processPayment (новая оплата)' }
]
const eventRepoResults = ref<TestResult[]>([])
const eventRepoLoading = ref(false)
const eventRepoLastRunAt = ref<string | null>(null)
const eventRepoDisplay = computed(() => {
  const byId = new Map(eventRepoResults.value.map((r) => [r.id, r]))
  return EVENT_REPO_TESTS.map((t) => {
    const res = byId.get(t.id)
    return {
      id: t.id,
      title: t.title,
      status: res === undefined ? 'todo' : res.passed ? 'success' : 'fail',
      error: res && !res.passed ? res.error : undefined
    }
  })
})
async function runEventRepoTests() {
  eventRepoLoading.value = true
  eventRepoResults.value = []
  const baseUrl = getApiBaseUrl().replace(/\/$/, '')
  try {
    const res = await fetch(`${baseUrl}/api/tests/endpoints-check/event-repo`, {
      method: 'GET',
      credentials: 'include'
    })
    const data = (await res.json()) as { success?: boolean; results?: TestResult[] }
    if (res.ok && data?.success && Array.isArray(data.results)) {
      eventRepoResults.value = data.results.map((r) => ({
        id: r.id,
        title: r.title,
        passed: !!r.passed,
        error: r.error
      }))
    } else {
      eventRepoResults.value = EVENT_REPO_TESTS.map((t) => ({
        id: t.id,
        title: t.title,
        passed: false,
        error: 'Ошибка запроса'
      }))
    }
    eventRepoLastRunAt.value = new Date().toLocaleString('ru-RU')
  } catch (e) {
    eventRepoResults.value = EVENT_REPO_TESTS.map((t) => ({
      id: t.id,
      title: t.title,
      passed: false,
      error: (e as Error)?.message ?? 'Ошибка сети'
    }))
    eventRepoLastRunAt.value = new Date().toLocaleString('ru-RU')
  } finally {
    eventRepoLoading.value = false
  }
}

/* --- Блок: Webhook'и фичи 5 (register, order, payment) --- */
const WEBHOOKS_FEATURE5_TESTS: Array<{ id: string; title: string }> = [
  { id: 'hook-register', title: 'POST hook/register → success' },
  { id: 'hook-order', title: 'POST hook/order → success' },
  { id: 'hook-payment', title: 'POST hook/payment → success' }
]
const webhooksFeature5Results = ref<TestResult[]>([])
const webhooksFeature5Loading = ref(false)
const webhooksFeature5LastRunAt = ref<string | null>(null)
const webhooksFeature5Display = computed(() => {
  const byId = new Map(webhooksFeature5Results.value.map((r) => [r.id, r]))
  return WEBHOOKS_FEATURE5_TESTS.map((t) => {
    const res = byId.get(t.id)
    return {
      id: t.id,
      title: t.title,
      status: res === undefined ? 'todo' : res.passed ? 'success' : 'fail',
      error: res && !res.passed ? res.error : undefined
    }
  })
})
async function runWebhooksFeature5Tests() {
  webhooksFeature5Loading.value = true
  webhooksFeature5Results.value = []
  const baseUrl = getApiBaseUrl().replace(/\/$/, '')
  try {
    const res = await fetch(`${baseUrl}/api/tests/endpoints-check/webhooks-feature5`, {
      method: 'GET',
      credentials: 'include'
    })
    const data = (await res.json()) as { success?: boolean; results?: TestResult[] }
    if (res.ok && data?.success && Array.isArray(data.results)) {
      webhooksFeature5Results.value = data.results.map((r) => ({
        id: r.id,
        title: r.title,
        passed: !!r.passed,
        error: r.error
      }))
    } else {
      webhooksFeature5Results.value = WEBHOOKS_FEATURE5_TESTS.map((t) => ({
        id: t.id,
        title: t.title,
        passed: false,
        error: 'Ошибка запроса'
      }))
    }
    webhooksFeature5LastRunAt.value = new Date().toLocaleString('ru-RU')
  } catch (e) {
    webhooksFeature5Results.value = WEBHOOKS_FEATURE5_TESTS.map((t) => ({
      id: t.id,
      title: t.title,
      passed: false,
      error: (e as Error)?.message ?? 'Ошибка сети'
    }))
    webhooksFeature5LastRunAt.value = new Date().toLocaleString('ru-RU')
  } finally {
    webhooksFeature5Loading.value = false
  }
}

/* --- Блок 16: Репозиторий партнёров (partner-repo) --- */
const PARTNER_REPO_TESTS: Array<{ id: string; title: string }> = [
  { id: 'getOrCreatePartner-new', title: 'getOrCreatePartner (новый партнёр)' },
  { id: 'getOrCreatePartner-existing', title: 'getOrCreatePartner (существующий)' },
  { id: 'getPartnerById-found', title: 'getPartnerById (найден)' },
  { id: 'getPartnerById-notFound', title: 'getPartnerById (не найден)' }
]
const partnerRepoResults = ref<TestResult[]>([])
const partnerRepoLoading = ref(false)
const partnerRepoLastRunAt = ref<string | null>(null)

const partnerRepoDisplay = computed(() => {
  const byId = new Map(partnerRepoResults.value.map((r) => [r.id, r]))
  return PARTNER_REPO_TESTS.map((t) => {
    const res = byId.get(t.id)
    return {
      id: t.id,
      title: t.title,
      status: res === undefined ? 'todo' : res.passed ? 'success' : 'fail',
      error: res && !res.passed ? res.error : undefined
    }
  })
})

async function runPartnerRepoTests() {
  partnerRepoLoading.value = true
  partnerRepoResults.value = []
  const baseUrl = getApiBaseUrl().replace(/\/$/, '')
  try {
    const res = await fetch(`${baseUrl}/api/tests/endpoints-check/partner-repo`, {
      method: 'GET',
      credentials: 'include'
    })
    const data = (await res.json().catch(() => null)) as {
      success?: boolean
      results?: TestResult[]
    }
    if (res.ok && data?.success && Array.isArray(data.results)) {
      partnerRepoResults.value = data.results.map((r) => ({
        id: r.id,
        title: r.title,
        passed: !!r.passed,
        error: r.error
      }))
    } else {
      partnerRepoResults.value = PARTNER_REPO_TESTS.map((t) => ({
        id: t.id,
        title: t.title,
        passed: false,
        error: 'Ошибка запроса'
      }))
    }
    partnerRepoLastRunAt.value = new Date().toLocaleString('ru-RU')
  } finally {
    partnerRepoLoading.value = false
  }
}

/* --- Блок 17: Репозиторий ботов (bot-repo) --- */
const BOT_REPO_TESTS: Array<{ id: string; title: string }> = [
  { id: 'getBotById-found', title: 'getBotById (найден)' },
  { id: 'getBotById-notFound', title: 'getBotById (не найден)' },
  { id: 'saveUpdate', title: 'saveUpdate (запись апдейта)' }
]
const botRepoResults = ref<TestResult[]>([])
const botRepoLoading = ref(false)
const botRepoLastRunAt = ref<string | null>(null)

const botRepoDisplay = computed(() => {
  const byId = new Map(botRepoResults.value.map((r) => [r.id, r]))
  return BOT_REPO_TESTS.map((t) => {
    const res = byId.get(t.id)
    return {
      id: t.id,
      title: t.title,
      status: res === undefined ? 'todo' : res.passed ? 'success' : 'fail',
      error: res && !res.passed ? res.error : undefined
    }
  })
})

async function runBotRepoTests() {
  botRepoLoading.value = true
  botRepoResults.value = []
  const baseUrl = getApiBaseUrl().replace(/\/$/, '')
  try {
    const res = await fetch(`${baseUrl}/api/tests/endpoints-check/bot-repo`, {
      method: 'GET',
      credentials: 'include'
    })
    const data = (await res.json().catch(() => null)) as {
      success?: boolean
      results?: TestResult[]
    }
    if (res.ok && data?.success && Array.isArray(data.results)) {
      botRepoResults.value = data.results.map((r) => ({
        id: r.id,
        title: r.title,
        passed: !!r.passed,
        error: r.error
      }))
    } else {
      botRepoResults.value = BOT_REPO_TESTS.map((t) => ({
        id: t.id,
        title: t.title,
        passed: false,
        error: 'Ошибка запроса'
      }))
    }
    botRepoLastRunAt.value = new Date().toLocaleString('ru-RU')
  } finally {
    botRepoLoading.value = false
  }
}

/* --- Блок 18: Telegram-бот (URL, сообщения, токен) --- */
const TELEGRAM_BOT_TESTS: Array<{ id: string; title: string }> = [
  { id: 'getTelegramWebhookUrl', title: 'getTelegramWebhookUrl' },
  { id: 'buildWelcomeMessage', title: 'buildWelcomeMessage' },
  { id: 'buildStatsMessage', title: 'buildStatsMessage' },
  { id: 'telegram-getMe', title: 'Telegram getMe (тестовый токен)' }
]
const telegramBotResults = ref<TestResult[]>([])
const telegramBotLoading = ref(false)
const telegramBotLastRunAt = ref<string | null>(null)

const telegramBotDisplay = computed(() => {
  const byId = new Map(telegramBotResults.value.map((r) => [r.id, r]))
  return TELEGRAM_BOT_TESTS.map((t) => {
    const res = byId.get(t.id)
    return {
      id: t.id,
      title: t.title,
      status: res === undefined ? 'todo' : res.passed ? 'success' : 'fail',
      error: res && !res.passed ? res.error : undefined
    }
  })
})

async function runTelegramBotTests() {
  telegramBotLoading.value = true
  telegramBotResults.value = []
  const baseUrl = getApiBaseUrl().replace(/\/$/, '')
  try {
    const res = await fetch(`${baseUrl}/api/tests/endpoints-check/telegram-bot`, {
      method: 'GET',
      credentials: 'include'
    })
    const data = (await res.json().catch(() => null)) as {
      success?: boolean
      results?: TestResult[]
    }
    if (res.ok && data?.success && Array.isArray(data.results)) {
      telegramBotResults.value = data.results.map((r) => ({
        id: r.id,
        title: r.title,
        passed: !!r.passed,
        error: r.error
      }))
    } else {
      telegramBotResults.value = TELEGRAM_BOT_TESTS.map((t) => ({
        id: t.id,
        title: t.title,
        passed: false,
        error: 'Ошибка запроса'
      }))
    }
    telegramBotLastRunAt.value = new Date().toLocaleString('ru-RU')
  } finally {
    telegramBotLoading.value = false
  }
}

/* --- Блок 19: Webhook Telegram --- */
const TELEGRAM_HOOK_TESTS: Array<{ id: string; title: string }> = [
  { id: 'hook-unknown-botId-200', title: 'POST hook — неизвестный botId → 200' }
]
const telegramHookResults = ref<TestResult[]>([])
const telegramHookLoading = ref(false)
const telegramHookLastRunAt = ref<string | null>(null)

const telegramHookDisplay = computed(() => {
  const byId = new Map(telegramHookResults.value.map((r) => [r.id, r]))
  return TELEGRAM_HOOK_TESTS.map((t) => {
    const res = byId.get(t.id)
    return {
      id: t.id,
      title: t.title,
      status: res === undefined ? 'todo' : res.passed ? 'success' : 'fail',
      error: res && !res.passed ? res.error : undefined
    }
  })
})

async function runTelegramHookTests() {
  telegramHookLoading.value = true
  telegramHookResults.value = []
  const baseUrl = getApiBaseUrl().replace(/\/$/, '')
  try {
    const res = await fetch(`${baseUrl}/api/tests/endpoints-check/telegram-hook`, {
      method: 'GET',
      credentials: 'include'
    })
    const data = (await res.json().catch(() => null)) as {
      success?: boolean
      results?: TestResult[]
    }
    if (res.ok && data?.success && Array.isArray(data.results)) {
      telegramHookResults.value = data.results.map((r) => ({
        id: r.id,
        title: r.title,
        passed: !!r.passed,
        error: r.error
      }))
    } else {
      telegramHookResults.value = TELEGRAM_HOOK_TESTS.map((t) => ({
        id: t.id,
        title: t.title,
        passed: false,
        error: 'Ошибка запроса'
      }))
    }
    telegramHookLastRunAt.value = new Date().toLocaleString('ru-RU')
  } finally {
    telegramHookLoading.value = false
  }
}

async function runCampaignsApiTests() {
  campaignsApiLoading.value = true
  campaignsApiResults.value = []
  const baseUrl = getApiBaseUrl().replace(/\/$/, '')
  let createdCampaignId: string | null = null
  log.info('Запуск проверки API кампаний')
  try {
    const results: TestResult[] = []

    const listRes = await fetch(`${baseUrl}/api/campaigns/list`, {
      method: 'GET',
      credentials: 'include'
    })
    const listData = (await listRes.json().catch(() => null)) as {
      success?: boolean
      campaigns?: unknown[]
    }
    const listPassed = listRes.ok && listData?.success === true && Array.isArray(listData.campaigns)
    results.push({
      id: 'campaigns-list',
      title: 'GET /api/campaigns/list',
      passed: listPassed,
      error: listPassed
        ? undefined
        : listRes.ok
          ? 'Неверный формат ответа'
          : `HTTP ${listRes.status}`
    })

    const createRes = await fetch(`${baseUrl}/api/campaigns/create`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'Тест API ' + Date.now() })
    })
    const createData = (await createRes.json().catch(() => null)) as {
      success?: boolean
      campaign?: { id?: string }
    }
    createdCampaignId = createData?.campaign?.id ?? null
    const createPassed = createRes.ok && createData?.success === true && createdCampaignId
    results.push({
      id: 'campaigns-create',
      title: 'POST /api/campaigns/create (успех)',
      passed: createPassed,
      error: createPassed
        ? undefined
        : createRes.ok
          ? 'Нет campaign в ответе'
          : `HTTP ${createRes.status}`
    })

    const validationRes = await fetch(`${baseUrl}/api/campaigns/create`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'x' })
    })
    const validationData = (await validationRes.json().catch(() => null)) as {
      success?: boolean
      error?: string
    }
    const validationPassed =
      validationRes.ok &&
      validationData?.success === false &&
      typeof validationData?.error === 'string'
    results.push({
      id: 'campaigns-create-validation',
      title: 'POST /api/campaigns/create (валидация)',
      passed: validationPassed,
      error: validationPassed
        ? undefined
        : validationRes.ok
          ? 'Ожидался success: false и error'
          : `HTTP ${validationRes.status}`
    })

    campaignsApiResults.value = results
    campaignsApiLastRunAt.value = new Date().toLocaleString('ru-RU')
    log.info('Проверка API кампаний завершена', {
      passed: results.filter((r) => r.passed).length,
      failed: results.filter((r) => !r.passed).length
    })
  } finally {
    if (createdCampaignId) {
      try {
        await fetch(`${baseUrl}/api/tests/cleanup-campaign`, {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ campaignId: createdCampaignId })
        })
      } catch (_) {}
    }
    campaignsApiLoading.value = false
  }
}

/** Запустить все тесты (все блоки) и обновить метрики дашборда */
const runAllTests = async () => {
  runAllTestsLoading.value = true
  log.info('Запуск всех тестов')
  try {
    await runEndpointsTests()
    await runSettingsTests()
    await runSettingsRepoTests()
    await runLoggerLibTests()
    await runLogsRepoTests()
    await runDashboardLibTests()
    await runRefGeneratorTests()
    await runFingerprintTests()
    await runMemberRepoTests()
    await runCampaignRepoTests()
    await runCampaignsApiTests()
    await runUrlBuilderTests()
    await runPageRepoTests()
    await runLinkRepoTests()
    await runVisitRepoTests()
    await runRedirectRouteTests()
    await runReferralRepoTests()
    await runEventRepoTests()
    await runWebhooksFeature5Tests()
    await runPartnerRepoTests()
    await runBotRepoTests()
    await runTelegramBotTests()
    await runTelegramHookTests()
    const all = [
      ...endpointsResults.value,
      ...settingsResults.value,
      ...settingsRepoResults.value,
      ...loggerLibResults.value,
      ...logsRepoResults.value,
      ...dashboardLibResults.value,
      ...refGeneratorResults.value,
      ...fingerprintResults.value,
      ...memberRepoResults.value,
      ...campaignRepoResults.value,
      ...campaignsApiResults.value,
      ...urlBuilderResults.value,
      ...pageRepoResults.value,
      ...linkRepoResults.value,
      ...visitRepoResults.value,
      ...redirectRouteResults.value,
      ...referralRepoResults.value,
      ...eventRepoResults.value,
      ...webhooksFeature5Results.value,
      ...partnerRepoResults.value,
      ...botRepoResults.value,
      ...telegramBotResults.value,
      ...telegramHookResults.value
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
        <section class="tests-section" :class="{ 'content-visible': showContent }">
          <div class="tests-header">
            <div class="tests-icon-wrapper">
              <i class="fas fa-flask tests-icon"></i>
            </div>
            <h1 class="tests-heading" :class="{ 'show-underline': showTitleUnderline }">
              {{ displayedTitle
              }}<span
                v-if="showCursor && (cursorPosition === 'title' || cursorPosition === 'final')"
                class="typing-cursor"
                >▮</span
              >
            </h1>
            <p class="tests-description">
              {{ displayedDescription
              }}<span v-if="showCursor && cursorPosition === 'description'" class="typing-cursor"
                >▮</span
              >
            </p>
          </div>

          <!-- Логи (тот же сокет, что в админке; только для админа) -->
          <div v-if="showContent && props.encodedLogsSocketId" class="tests-logs-card">
            <div class="tests-logs-card-header">
              <i class="fas fa-terminal tests-logs-card-icon"></i>
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
                  :title="logsHasMore ? 'Загрузить более старые логи' : 'Нет более старых логов'"
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

          <!-- Дашборд с метриками по тестам -->
          <div v-if="showContent" class="tests-card tests-dashboard">
            <div class="tests-dashboard-header">
              <i class="fas fa-chart-line tests-dashboard-icon"></i>
              <h2 class="tests-dashboard-title">Метрики тестов</h2>
            </div>
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
                :disabled="runAllTestsLoading"
                @click="runAllTests"
              >
                <i class="fas" :class="runAllTestsLoading ? 'fa-spinner fa-spin' : 'fa-play'"></i>
                {{ runAllTestsLoading ? 'Запуск...' : 'Запустить все тесты' }}
              </button>
            </div>
          </div>

          <!-- Блок 1: Проверка эндпоинтов -->
          <div v-if="showContent" class="tests-card tests-endpoints-card">
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
                  <span v-if="item.error" class="tests-endpoints-list-error">{{ item.error }}</span>
                </li>
              </ul>
            </div>
            <div class="tests-endpoints-actions">
              <button
                type="button"
                class="tests-run-group-btn"
                :disabled="endpointsLoading"
                @click="runEndpointsTests"
              >
                <i class="fas" :class="endpointsLoading ? 'fa-spinner fa-spin' : 'fa-bolt'"></i>
                {{ endpointsLoading ? 'Проверяем...' : 'Запустить проверку эндпоинтов' }}
              </button>
            </div>
          </div>

          <!-- Блок 2: Библиотека настроек -->
          <div v-if="showContent" class="tests-card tests-endpoints-card">
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
                  <span v-if="item.error" class="tests-endpoints-list-error">{{ item.error }}</span>
                </li>
              </ul>
            </div>
            <div class="tests-endpoints-actions">
              <button
                type="button"
                class="tests-run-group-btn"
                :disabled="settingsLoading"
                @click="runSettingsTests"
              >
                <i class="fas" :class="settingsLoading ? 'fa-spinner fa-spin' : 'fa-bolt'"></i>
                {{ settingsLoading ? 'Проверяем...' : 'Запустить проверку библиотеки настроек' }}
              </button>
            </div>
          </div>

          <!-- Блок 3: Репозиторий настроек -->
          <div v-if="showContent" class="tests-card tests-endpoints-card">
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
                  <span v-if="item.error" class="tests-endpoints-list-error">{{ item.error }}</span>
                </li>
              </ul>
            </div>
            <div class="tests-endpoints-actions">
              <button
                type="button"
                class="tests-run-group-btn"
                :disabled="settingsRepoLoading"
                @click="runSettingsRepoTests"
              >
                <i class="fas" :class="settingsRepoLoading ? 'fa-spinner fa-spin' : 'fa-bolt'"></i>
                {{
                  settingsRepoLoading ? 'Проверяем...' : 'Запустить проверку репозитория настроек'
                }}
              </button>
            </div>
          </div>

          <!-- Блок 4: Библиотека логов -->
          <div v-if="showContent" class="tests-card tests-endpoints-card">
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
                  <span v-if="item.error" class="tests-endpoints-list-error">{{ item.error }}</span>
                </li>
              </ul>
            </div>
            <div class="tests-endpoints-actions">
              <button
                type="button"
                class="tests-run-group-btn"
                :disabled="loggerLibLoading"
                @click="runLoggerLibTests"
              >
                <i class="fas" :class="loggerLibLoading ? 'fa-spinner fa-spin' : 'fa-bolt'"></i>
                {{ loggerLibLoading ? 'Проверяем...' : 'Запустить проверку библиотеки логов' }}
              </button>
            </div>
          </div>

          <!-- Блок 5: Репозиторий логов -->
          <div v-if="showContent" class="tests-card tests-endpoints-card">
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
                  <span v-if="item.error" class="tests-endpoints-list-error">{{ item.error }}</span>
                </li>
              </ul>
            </div>
            <div class="tests-endpoints-actions">
              <button
                type="button"
                class="tests-run-group-btn"
                :disabled="logsRepoLoading"
                @click="runLogsRepoTests"
              >
                <i class="fas" :class="logsRepoLoading ? 'fa-spinner fa-spin' : 'fa-bolt'"></i>
                {{ logsRepoLoading ? 'Проверяем...' : 'Запустить проверку репозитория логов' }}
              </button>
            </div>
          </div>

          <!-- Блок 6: Библиотека админки -->
          <div v-if="showContent" class="tests-card tests-endpoints-card">
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
                  <span v-if="item.error" class="tests-endpoints-list-error">{{ item.error }}</span>
                </li>
              </ul>
            </div>
            <div class="tests-endpoints-actions">
              <button
                type="button"
                class="tests-run-group-btn"
                :disabled="dashboardLibLoading"
                @click="runDashboardLibTests"
              >
                <i class="fas" :class="dashboardLibLoading ? 'fa-spinner fa-spin' : 'fa-bolt'"></i>
                {{ dashboardLibLoading ? 'Проверяем...' : 'Запустить проверку библиотеки админки' }}
              </button>
            </div>
          </div>

          <!-- Блок 7: Генератор идентификаторов -->
          <div v-if="showContent" class="tests-card tests-endpoints-card">
            <div class="tests-endpoints-header">
              <i class="fas fa-fingerprint tests-endpoints-icon"></i>
              <h2 class="tests-endpoints-title">Генератор идентификаторов</h2>
            </div>
            <p class="tests-endpoints-desc">
              Тесты lib/core/refGenerator (generateUrlSafeId, generateCampaignSecret).
            </p>
            <div v-if="refGeneratorLastRunAt" class="tests-endpoints-last-run">
              Результаты от: {{ refGeneratorLastRunAt }}
            </div>
            <div class="tests-endpoints-list-wrap">
              <ul class="tests-endpoints-list" role="list">
                <li
                  v-for="item in refGeneratorDisplay"
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
                  <span v-if="item.error" class="tests-endpoints-list-error">{{ item.error }}</span>
                </li>
              </ul>
            </div>
            <div class="tests-endpoints-actions">
              <button
                type="button"
                class="tests-run-group-btn"
                :disabled="refGeneratorLoading"
                @click="runRefGeneratorTests"
              >
                <i class="fas" :class="refGeneratorLoading ? 'fa-spinner fa-spin' : 'fa-bolt'"></i>
                {{ refGeneratorLoading ? 'Проверяем...' : 'Запустить проверку refGenerator' }}
              </button>
            </div>
          </div>

          <!-- Блок 7b: Fingerprint -->
          <div v-if="showContent" class="tests-card tests-endpoints-card">
            <div class="tests-endpoints-header">
              <i class="fas fa-id-badge tests-endpoints-icon"></i>
              <h2 class="tests-endpoints-title">Fingerprint (дедупликация визитов)</h2>
            </div>
            <p class="tests-endpoints-desc">
              Тесты lib/core/fingerprint (computeFingerprint: hash, parts, IP из заголовков,
              детерминированность).
            </p>
            <div v-if="fingerprintLastRunAt" class="tests-endpoints-last-run">
              Результаты от: {{ fingerprintLastRunAt }}
            </div>
            <div class="tests-endpoints-list-wrap">
              <ul class="tests-endpoints-list" role="list">
                <li
                  v-for="item in fingerprintDisplay"
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
                  <span v-if="item.error" class="tests-endpoints-list-error">{{ item.error }}</span>
                </li>
              </ul>
            </div>
            <div class="tests-endpoints-actions">
              <button
                type="button"
                class="tests-run-group-btn"
                :disabled="fingerprintLoading"
                @click="runFingerprintTests"
              >
                <i class="fas" :class="fingerprintLoading ? 'fa-spinner fa-spin' : 'fa-bolt'"></i>
                {{ fingerprintLoading ? 'Проверяем...' : 'Запустить проверку fingerprint' }}
              </button>
            </div>
          </div>

          <!-- Блок 8: Репозиторий участников кампании -->
          <div v-if="showContent" class="tests-card tests-endpoints-card">
            <div class="tests-endpoints-header">
              <i class="fas fa-users tests-endpoints-icon"></i>
              <h2 class="tests-endpoints-title">Репозиторий участников кампании</h2>
            </div>
            <p class="tests-endpoints-desc">
              Тесты lib/repo/memberRepo (addMember, checkCampaignAccess).
            </p>
            <div v-if="memberRepoLastRunAt" class="tests-endpoints-last-run">
              Результаты от: {{ memberRepoLastRunAt }}
            </div>
            <div class="tests-endpoints-list-wrap">
              <ul class="tests-endpoints-list" role="list">
                <li
                  v-for="item in memberRepoDisplay"
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
                  <span v-if="item.error" class="tests-endpoints-list-error">{{ item.error }}</span>
                </li>
              </ul>
            </div>
            <div class="tests-endpoints-actions">
              <button
                type="button"
                class="tests-run-group-btn"
                :disabled="memberRepoLoading"
                @click="runMemberRepoTests"
              >
                <i class="fas" :class="memberRepoLoading ? 'fa-spinner fa-spin' : 'fa-bolt'"></i>
                {{ memberRepoLoading ? 'Проверяем...' : 'Запустить проверку memberRepo' }}
              </button>
            </div>
          </div>

          <!-- Блок 9: Репозиторий кампаний -->
          <div v-if="showContent" class="tests-card tests-endpoints-card">
            <div class="tests-endpoints-header">
              <i class="fas fa-bullhorn tests-endpoints-icon"></i>
              <h2 class="tests-endpoints-title">Репозиторий кампаний</h2>
            </div>
            <p class="tests-endpoints-desc">
              Тесты lib/repo/campaignRepo (createCampaign, getCampaignById, getUserCampaigns).
            </p>
            <div v-if="campaignRepoLastRunAt" class="tests-endpoints-last-run">
              Результаты от: {{ campaignRepoLastRunAt }}
            </div>
            <div class="tests-endpoints-list-wrap">
              <ul class="tests-endpoints-list" role="list">
                <li
                  v-for="item in campaignRepoDisplay"
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
                  <span v-if="item.error" class="tests-endpoints-list-error">{{ item.error }}</span>
                </li>
              </ul>
            </div>
            <div class="tests-endpoints-actions">
              <button
                type="button"
                class="tests-run-group-btn"
                :disabled="campaignRepoLoading"
                @click="runCampaignRepoTests"
              >
                <i class="fas" :class="campaignRepoLoading ? 'fa-spinner fa-spin' : 'fa-bolt'"></i>
                {{ campaignRepoLoading ? 'Проверяем...' : 'Запустить проверку campaignRepo' }}
              </button>
            </div>
          </div>

          <!-- Блок 10: API кампаний -->
          <div v-if="showContent" class="tests-card tests-endpoints-card">
            <div class="tests-endpoints-header">
              <i class="fas fa-code tests-endpoints-icon"></i>
              <h2 class="tests-endpoints-title">API кампаний</h2>
            </div>
            <p class="tests-endpoints-desc">
              Тесты API кампаний: GET /api/campaigns/list, POST /api/campaigns/create (успех и
              валидация).
            </p>
            <div v-if="campaignsApiLastRunAt" class="tests-endpoints-last-run">
              Результаты от: {{ campaignsApiLastRunAt }}
            </div>
            <div class="tests-endpoints-list-wrap">
              <ul class="tests-endpoints-list" role="list">
                <li
                  v-for="item in campaignsApiDisplay"
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
                  <span v-if="item.error" class="tests-endpoints-list-error">{{ item.error }}</span>
                </li>
              </ul>
            </div>
            <div class="tests-endpoints-actions">
              <button
                type="button"
                class="tests-run-group-btn"
                :disabled="campaignsApiLoading"
                @click="runCampaignsApiTests"
              >
                <i class="fas" :class="campaignsApiLoading ? 'fa-spinner fa-spin' : 'fa-bolt'"></i>
                {{ campaignsApiLoading ? 'Проверяем...' : 'Запустить проверку API кампаний' }}
              </button>
            </div>
          </div>

          <!-- Блок 11: Построение URL (urlBuilder) -->
          <div v-if="showContent" class="tests-card tests-endpoints-card">
            <div class="tests-endpoints-header">
              <i class="fas fa-link tests-endpoints-icon"></i>
              <h2 class="tests-endpoints-title">Построение URL</h2>
            </div>
            <p class="tests-endpoints-desc">
              Тесты lib/core/urlBuilder (substituteRef, buildPartnerLinkUrl).
            </p>
            <div v-if="urlBuilderLastRunAt" class="tests-endpoints-last-run">
              Результаты от: {{ urlBuilderLastRunAt }}
            </div>
            <div class="tests-endpoints-list-wrap">
              <ul class="tests-endpoints-list" role="list">
                <li
                  v-for="item in urlBuilderDisplay"
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
                  <span v-if="item.error" class="tests-endpoints-list-error">{{ item.error }}</span>
                </li>
              </ul>
            </div>
            <div class="tests-endpoints-actions">
              <button
                type="button"
                class="tests-run-group-btn"
                :disabled="urlBuilderLoading"
                @click="runUrlBuilderTests"
              >
                <i class="fas" :class="urlBuilderLoading ? 'fa-spinner fa-spin' : 'fa-bolt'"></i>
                {{ urlBuilderLoading ? 'Проверяем...' : 'Запустить проверку urlBuilder' }}
              </button>
            </div>
          </div>

          <!-- Блок 12: Репозиторий страниц (pageRepo) -->
          <div v-if="showContent" class="tests-card tests-endpoints-card">
            <div class="tests-endpoints-header">
              <i class="fas fa-file-alt tests-endpoints-icon"></i>
              <h2 class="tests-endpoints-title">Репозиторий страниц</h2>
            </div>
            <p class="tests-endpoints-desc">
              Тесты lib/repo/pageRepo (createPage, getPageById, getCampaignPages).
            </p>
            <div v-if="pageRepoLastRunAt" class="tests-endpoints-last-run">
              Результаты от: {{ pageRepoLastRunAt }}
            </div>
            <div class="tests-endpoints-list-wrap">
              <ul class="tests-endpoints-list" role="list">
                <li
                  v-for="item in pageRepoDisplay"
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
                  <span v-if="item.error" class="tests-endpoints-list-error">{{ item.error }}</span>
                </li>
              </ul>
            </div>
            <div class="tests-endpoints-actions">
              <button
                type="button"
                class="tests-run-group-btn"
                :disabled="pageRepoLoading"
                @click="runPageRepoTests"
              >
                <i class="fas" :class="pageRepoLoading ? 'fa-spinner fa-spin' : 'fa-bolt'"></i>
                {{ pageRepoLoading ? 'Проверяем...' : 'Запустить проверку pageRepo' }}
              </button>
            </div>
          </div>

          <!-- Блок 13: Репозиторий партнёрских ссылок (linkRepo) -->
          <div v-if="showContent" class="tests-card tests-endpoints-card">
            <div class="tests-endpoints-header">
              <i class="fas fa-share-alt tests-endpoints-icon"></i>
              <h2 class="tests-endpoints-title">Репозиторий партнёрских ссылок</h2>
            </div>
            <p class="tests-endpoints-desc">
              Тесты lib/repo/linkRepo (getOrCreatePartnerLink, getPartnerLinks,
              findLinkByPublicSlug).
            </p>
            <div v-if="linkRepoLastRunAt" class="tests-endpoints-last-run">
              Результаты от: {{ linkRepoLastRunAt }}
            </div>
            <div class="tests-endpoints-list-wrap">
              <ul class="tests-endpoints-list" role="list">
                <li
                  v-for="item in linkRepoDisplay"
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
                  <span v-if="item.error" class="tests-endpoints-list-error">{{ item.error }}</span>
                </li>
              </ul>
            </div>
            <div class="tests-endpoints-actions">
              <button
                type="button"
                class="tests-run-group-btn"
                :disabled="linkRepoLoading"
                @click="runLinkRepoTests"
              >
                <i class="fas" :class="linkRepoLoading ? 'fa-spinner fa-spin' : 'fa-bolt'"></i>
                {{ linkRepoLoading ? 'Проверяем...' : 'Запустить проверку linkRepo' }}
              </button>
            </div>
          </div>

          <!-- Блок 14: Репозиторий визитов (visitRepo) -->
          <div v-if="showContent" class="tests-card tests-endpoints-card">
            <div class="tests-endpoints-header">
              <i class="fas fa-mouse-pointer tests-endpoints-icon"></i>
              <h2 class="tests-endpoints-title">Репозиторий визитов</h2>
            </div>
            <p class="tests-endpoints-desc">
              Тесты lib/repo/visitRepo (createVisit, findVisitByRef, markVisitRegistered).
            </p>
            <div v-if="visitRepoLastRunAt" class="tests-endpoints-last-run">
              Результаты от: {{ visitRepoLastRunAt }}
            </div>
            <div class="tests-endpoints-list-wrap">
              <ul class="tests-endpoints-list" role="list">
                <li
                  v-for="item in visitRepoDisplay"
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
                  <span v-if="item.error" class="tests-endpoints-list-error">{{ item.error }}</span>
                </li>
              </ul>
            </div>
            <div class="tests-endpoints-actions">
              <button
                type="button"
                class="tests-run-group-btn"
                :disabled="visitRepoLoading"
                @click="runVisitRepoTests"
              >
                <i class="fas" :class="visitRepoLoading ? 'fa-spinner fa-spin' : 'fa-bolt'"></i>
                {{ visitRepoLoading ? 'Проверяем...' : 'Запустить проверку visitRepo' }}
              </button>
            </div>
          </div>

          <!-- Блок 15: Роут редиректа (GET /r?linkId=) -->
          <div v-if="showContent" class="tests-card tests-endpoints-card">
            <div class="tests-endpoints-header">
              <i class="fas fa-external-link-alt tests-endpoints-icon"></i>
              <h2 class="tests-endpoints-title">Роут редиректа /r?linkId=</h2>
            </div>
            <p class="tests-endpoints-desc">
              Тесты GET /r?linkId=: 404 для неизвестного slug, редирект с созданием визита,
              идемпотентность.
            </p>
            <div v-if="redirectRouteLastRunAt" class="tests-endpoints-last-run">
              Результаты от: {{ redirectRouteLastRunAt }}
            </div>
            <div class="tests-endpoints-list-wrap">
              <ul class="tests-endpoints-list" role="list">
                <li
                  v-for="item in redirectRouteDisplay"
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
                  <span v-if="item.error" class="tests-endpoints-list-error">{{ item.error }}</span>
                </li>
              </ul>
            </div>
            <div class="tests-endpoints-actions">
              <button
                type="button"
                class="tests-run-group-btn"
                :disabled="redirectRouteLoading"
                @click="runRedirectRouteTests"
              >
                <i class="fas" :class="redirectRouteLoading ? 'fa-spinner fa-spin' : 'fa-bolt'"></i>
                {{ redirectRouteLoading ? 'Проверяем...' : 'Запустить проверку роута редиректа' }}
              </button>
            </div>
          </div>

          <!-- Блок: Репозиторий рефералов (referral-repo) -->
          <div v-if="showContent" class="tests-card tests-endpoints-card">
            <div class="tests-endpoints-header">
              <i class="fas fa-users tests-endpoints-icon"></i>
              <h2 class="tests-endpoints-title">Репозиторий рефералов</h2>
            </div>
            <p class="tests-endpoints-desc">
              createOrUpdateReferral, incrementReferralStats (campaignId + ref).
            </p>
            <div v-if="referralRepoLastRunAt" class="tests-endpoints-last-run">
              Результаты от: {{ referralRepoLastRunAt }}
            </div>
            <div class="tests-endpoints-list-wrap">
              <ul class="tests-endpoints-list" role="list">
                <li
                  v-for="item in referralRepoDisplay"
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
                  <span v-if="item.error" class="tests-endpoints-list-error">{{ item.error }}</span>
                </li>
              </ul>
            </div>
            <div class="tests-endpoints-actions">
              <button
                type="button"
                class="tests-run-group-btn"
                :disabled="referralRepoLoading"
                @click="runReferralRepoTests"
              >
                <i class="fas" :class="referralRepoLoading ? 'fa-spinner fa-spin' : 'fa-bolt'"></i>
                {{ referralRepoLoading ? 'Проверяем...' : 'Запустить проверку referral-repo' }}
              </button>
            </div>
          </div>

          <!-- Блок: Репозиторий событий (event-repo) -->
          <div v-if="showContent" class="tests-card tests-endpoints-card">
            <div class="tests-endpoints-header">
              <i class="fas fa-calendar-check tests-endpoints-icon"></i>
              <h2 class="tests-endpoints-title">Репозиторий событий (eventRepo)</h2>
            </div>
            <p class="tests-endpoints-desc">
              processRegistration, processOrder, processPayment (идемпотентность по ref/orderId).
            </p>
            <div v-if="eventRepoLastRunAt" class="tests-endpoints-last-run">
              Результаты от: {{ eventRepoLastRunAt }}
            </div>
            <div class="tests-endpoints-list-wrap">
              <ul class="tests-endpoints-list" role="list">
                <li
                  v-for="item in eventRepoDisplay"
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
                  <span v-if="item.error" class="tests-endpoints-list-error">{{ item.error }}</span>
                </li>
              </ul>
            </div>
            <div class="tests-endpoints-actions">
              <button
                type="button"
                class="tests-run-group-btn"
                :disabled="eventRepoLoading"
                @click="runEventRepoTests"
              >
                <i class="fas" :class="eventRepoLoading ? 'fa-spinner fa-spin' : 'fa-bolt'"></i>
                {{ eventRepoLoading ? 'Проверяем...' : 'Запустить проверку event-repo' }}
              </button>
            </div>
          </div>

          <!-- Блок: Webhook'и фичи 5 (register, order, payment) -->
          <div v-if="showContent" class="tests-card tests-endpoints-card">
            <div class="tests-endpoints-header">
              <i class="fas fa-plug tests-endpoints-icon"></i>
              <h2 class="tests-endpoints-title">Webhook'и фичи 5 (register, order, payment)</h2>
            </div>
            <p class="tests-endpoints-desc">
              POST hook/register, hook/order, hook/payment с key и ref.
            </p>
            <div v-if="webhooksFeature5LastRunAt" class="tests-endpoints-last-run">
              Результаты от: {{ webhooksFeature5LastRunAt }}
            </div>
            <div class="tests-endpoints-list-wrap">
              <ul class="tests-endpoints-list" role="list">
                <li
                  v-for="item in webhooksFeature5Display"
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
                  <span v-if="item.error" class="tests-endpoints-list-error">{{ item.error }}</span>
                </li>
              </ul>
            </div>
            <div class="tests-endpoints-actions">
              <button
                type="button"
                class="tests-run-group-btn"
                :disabled="webhooksFeature5Loading"
                @click="runWebhooksFeature5Tests"
              >
                <i
                  class="fas"
                  :class="webhooksFeature5Loading ? 'fa-spinner fa-spin' : 'fa-bolt'"
                ></i>
                {{
                  webhooksFeature5Loading ? 'Проверяем...' : 'Запустить проверку webhooks-feature5'
                }}
              </button>
            </div>
          </div>

          <!-- Блок 16: Репозиторий партнёров -->
          <div v-if="showContent" class="tests-card tests-endpoints-card">
            <div class="tests-endpoints-header">
              <i class="fas fa-user-friends tests-endpoints-icon"></i>
              <h2 class="tests-endpoints-title">Репозиторий партнёров</h2>
            </div>
            <p class="tests-endpoints-desc">getOrCreatePartner, getPartnerById.</p>
            <div v-if="partnerRepoLastRunAt" class="tests-endpoints-last-run">
              Результаты от: {{ partnerRepoLastRunAt }}
            </div>
            <div class="tests-endpoints-list-wrap">
              <ul class="tests-endpoints-list" role="list">
                <li
                  v-for="item in partnerRepoDisplay"
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
                  <span v-if="item.error" class="tests-endpoints-list-error">{{ item.error }}</span>
                </li>
              </ul>
            </div>
            <div class="tests-endpoints-actions">
              <button
                type="button"
                class="tests-run-group-btn"
                :disabled="partnerRepoLoading"
                @click="runPartnerRepoTests"
              >
                <i class="fas" :class="partnerRepoLoading ? 'fa-spinner fa-spin' : 'fa-bolt'"></i>
                {{ partnerRepoLoading ? 'Проверяем...' : 'Запустить проверку partner-repo' }}
              </button>
            </div>
          </div>

          <!-- Блок 17: Репозиторий ботов -->
          <div v-if="showContent" class="tests-card tests-endpoints-card">
            <div class="tests-endpoints-header">
              <i class="fas fa-robot tests-endpoints-icon"></i>
              <h2 class="tests-endpoints-title">Репозиторий ботов</h2>
            </div>
            <p class="tests-endpoints-desc">getBotById, saveUpdate.</p>
            <div v-if="botRepoLastRunAt" class="tests-endpoints-last-run">
              Результаты от: {{ botRepoLastRunAt }}
            </div>
            <div class="tests-endpoints-list-wrap">
              <ul class="tests-endpoints-list" role="list">
                <li
                  v-for="item in botRepoDisplay"
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
                  <span v-if="item.error" class="tests-endpoints-list-error">{{ item.error }}</span>
                </li>
              </ul>
            </div>
            <div class="tests-endpoints-actions">
              <button
                type="button"
                class="tests-run-group-btn"
                :disabled="botRepoLoading"
                @click="runBotRepoTests"
              >
                <i class="fas" :class="botRepoLoading ? 'fa-spinner fa-spin' : 'fa-bolt'"></i>
                {{ botRepoLoading ? 'Проверяем...' : 'Запустить проверку bot-repo' }}
              </button>
            </div>
          </div>

          <!-- Блок 18: Telegram-бот (URL, сообщения, токен) -->
          <div v-if="showContent" class="tests-card tests-endpoints-card">
            <div class="tests-endpoints-header">
              <i class="fas fa-paper-plane tests-endpoints-icon"></i>
              <h2 class="tests-endpoints-title">Telegram-бот (URL, сообщения, токен)</h2>
            </div>
            <p class="tests-endpoints-desc">
              getTelegramWebhookUrl, buildWelcomeMessage, buildStatsMessage, Telegram getMe. Токен —
              настройка telegram_test_bot_token (от @BotFather).
            </p>
            <div v-if="telegramBotLastRunAt" class="tests-endpoints-last-run">
              Результаты от: {{ telegramBotLastRunAt }}
            </div>
            <div class="tests-endpoints-list-wrap">
              <ul class="tests-endpoints-list" role="list">
                <li
                  v-for="item in telegramBotDisplay"
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
                  <span v-if="item.error" class="tests-endpoints-list-error">{{ item.error }}</span>
                </li>
              </ul>
            </div>
            <div class="tests-endpoints-actions">
              <button
                type="button"
                class="tests-run-group-btn"
                :disabled="telegramBotLoading"
                @click="runTelegramBotTests"
              >
                <i class="fas" :class="telegramBotLoading ? 'fa-spinner fa-spin' : 'fa-bolt'"></i>
                {{ telegramBotLoading ? 'Проверяем...' : 'Запустить проверку telegram-bot' }}
              </button>
            </div>
          </div>

          <!-- Блок 19: Webhook Telegram -->
          <div v-if="showContent" class="tests-card tests-endpoints-card">
            <div class="tests-endpoints-header">
              <i class="fas fa-webhook tests-endpoints-icon"></i>
              <h2 class="tests-endpoints-title">Webhook Telegram</h2>
            </div>
            <p class="tests-endpoints-desc">
              POST hook/telegram?botId= — неизвестный botId → 200 и { ok: true }.
            </p>
            <div v-if="telegramHookLastRunAt" class="tests-endpoints-last-run">
              Результаты от: {{ telegramHookLastRunAt }}
            </div>
            <div class="tests-endpoints-list-wrap">
              <ul class="tests-endpoints-list" role="list">
                <li
                  v-for="item in telegramHookDisplay"
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
                  <span v-if="item.error" class="tests-endpoints-list-error">{{ item.error }}</span>
                </li>
              </ul>
            </div>
            <div class="tests-endpoints-actions">
              <button
                type="button"
                class="tests-run-group-btn"
                :disabled="telegramHookLoading"
                @click="runTelegramHookTests"
              >
                <i class="fas" :class="telegramHookLoading ? 'fa-spinner fa-spin' : 'fa-bolt'"></i>
                {{ telegramHookLoading ? 'Проверяем...' : 'Запустить проверку telegram-hook' }}
              </button>
            </div>
          </div>
        </section>
      </div>
    </main>

    <AppFooter v-if="bootLoaderDone" @chatium-click="openChatiumLink" />
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
  max-width: 1000px;
  margin: 0 auto;
  padding: 2rem;
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

.tests-header {
  text-align: center;
  margin-bottom: 3rem;
}

.tests-icon-wrapper {
  width: 5rem;
  height: 5rem;
  margin: 0 auto 1.5rem;
  border-radius: 0;
  background: linear-gradient(135deg, var(--color-accent) 0%, var(--color-accent-hover) 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow:
    0 8px 24px rgba(211, 35, 75, 0.4),
    0 4px 12px rgba(211, 35, 75, 0.3),
    0 0 30px rgba(211, 35, 75, 0.2),
    inset 0 0 0 2px rgba(0, 0, 0, 0.3);
  position: relative;
  overflow: hidden;
  clip-path: polygon(
    0 4px,
    4px 4px,
    4px 0,
    calc(100% - 4px) 0,
    calc(100% - 4px) 4px,
    100% 4px,
    100% calc(100% - 4px),
    calc(100% - 4px) calc(100% - 4px),
    calc(100% - 4px) 100%,
    4px 100%,
    4px calc(100% - 4px),
    0 calc(100% - 4px)
  );
}

.tests-icon {
  font-size: 2rem;
  color: #ffffff;
  text-shadow: 0 0 10px rgba(255, 255, 255, 0.35);
  position: relative;
  z-index: 3;
}

.tests-heading {
  font-size: 2.5rem;
  font-weight: 700;
  color: var(--color-text);
  margin: 0 0 1rem 0;
  position: relative;
  display: inline-block;
}

.tests-heading.show-underline::after {
  content: '';
  position: absolute;
  left: 50%;
  bottom: -10px;
  transform: translateX(-50%);
  width: 100px;
  height: 2px;
  background: var(--color-accent);
  box-shadow: 0 0 10px var(--color-accent);
}

.tests-description {
  color: var(--color-text-secondary);
  font-size: 1.1rem;
  margin: 0;
  min-height: 1.5rem;
}

.typing-cursor {
  display: inline-block;
  color: var(--color-accent);
  animation: cursor-blink 1s step-end infinite;
  margin-left: 2px;
}

@keyframes cursor-blink {
  0%,
  50% {
    opacity: 1;
  }
  51%,
  100% {
    opacity: 0;
  }
}

.tests-card {
  background: linear-gradient(135deg, var(--color-bg-secondary) 0%, var(--color-bg-tertiary) 100%);
  border: 1px solid var(--color-border);
  border-radius: 12px;
  padding: 2rem;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.4);
  position: relative;
  overflow: hidden;
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
  margin-bottom: 2rem;
}

.tests-dashboard-header {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 1.25rem;
}

.tests-dashboard-icon {
  font-size: 1.25rem;
  color: var(--color-accent);
}

.tests-dashboard-title {
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--color-text);
  margin: 0;
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
  border-radius: 8px;
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
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: 0 4px 12px rgba(211, 35, 75, 0.3);
}

.tests-run-all-btn:hover:not(:disabled) {
  box-shadow: 0 6px 16px rgba(211, 35, 75, 0.4);
  transform: translateY(-1px);
}

.tests-run-all-btn:disabled {
  opacity: 0.7;
  cursor: not-allowed;
  transform: none;
}

/* Блок «Проверка эндпоинтов» */
.tests-endpoints-card {
  margin-bottom: 2rem;
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
  border-radius: 8px;
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
  border-radius: 4px;
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
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: 0 4px 12px rgba(211, 35, 75, 0.25);
}

.tests-run-group-btn:hover:not(:disabled) {
  box-shadow: 0 6px 16px rgba(211, 35, 75, 0.35);
  transform: translateY(-1px);
}

.tests-run-group-btn:disabled {
  opacity: 0.7;
  cursor: not-allowed;
  transform: none;
}

/* Блок логов (выше tests-card) */
.tests-logs-card {
  background: linear-gradient(135deg, var(--color-bg-secondary) 0%, var(--color-bg-tertiary) 100%);
  border: 1px solid var(--color-border);
  border-radius: 12px;
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
  border-radius: 4px;
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
  border-radius: 4px;
  min-height: 200px;
  max-height: 400px;
  overflow: auto;
  padding: 1rem;
  font-family: 'Share Tech Mono', 'Courier New', monospace;
  font-size: 0.8rem;
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
  border-radius: 4px;
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
  border-radius: 4px;
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
  border-radius: 4px;
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
