<script setup lang="ts">
import { onMounted, onBeforeUnmount, onUnmounted, ref, computed, watch } from 'vue'
import { getOrCreateBrowserSocketClient } from '@app/socket'
import Header from '../components/Header.vue'
import GlobalGlitch from '../components/GlobalGlitch.vue'
import AppFooter from '../components/AppFooter.vue'
import { createComponentLogger, setLogSink, type LogEntry } from '../shared/logger'
import { createBrowserRemoteLogger } from '../shared/browserRemoteLogger'
import { getRecentLogsRoute } from '../api/admin/logs/recent'
import { getLogsBeforeRoute } from '../api/admin/logs/before'
import { postBrowserLogsRoute } from '../api/logger/browser'
import {
  UNIT_TEST_BLOCKS,
  INTEGRATION_SERVER_TEST_BLOCKS,
  INTEGRATION_HTTP_TEST_BLOCK,
  flattenCatalogBlocks,
  type TestCatalogBlock,
  type TestCatalogEntry
} from '../shared/testCatalog'

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
const LOG_FETCH_LIMIT = 50
const logEntries = ref<LogEntry[]>([])
let logsSocketSubscription: { unsubscribe?: () => void } | null = null
const logsOutputRef = ref<HTMLElement | null>(null)
const logsLoading = ref(false)
const logsError = ref('')
const logsHasMore = ref(false)
const oldestLogTimestamp = ref<number | null>(null)
const logsRequestId = ref(0)
const selectedLogStream = ref<'all' | 'info' | 'warn' | 'error'>('all')

let browserRemoteLogger: ReturnType<typeof createBrowserRemoteLogger> | null = null

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

/** Записи приложения уже показаны через setLogSink; с сервера приходит тот же лог по WebSocket — пропускаем дубль. */
function isBrowserSinkEchoFromSocket(entry: LogEntry): boolean {
  const p = entry.args[1]
  if (!p || typeof p !== 'object' || Array.isArray(p)) return false
  const o = p as { source?: string; channel?: string }
  return o.source === 'browser' && o.channel === 'sink'
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

const displayedLogRowIndices = computed(() => {
  const items = displayedLogs.value
  const indices: number[] = []
  for (let i = 0; i < items.length; i++) {
    if (items[i].type === 'log') indices.push(i)
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
  log.info('loadRecentLogs entry')
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
      log.info('loadRecentLogs loaded', { count: data.entries.length })
    } else {
      logsError.value = data?.error || 'Ошибка загрузки логов'
      log.error('loadRecentLogs error', logsError.value)
    }
  } catch (e) {
    if (requestId !== logsRequestId.value) return
    logsError.value = (e as Error)?.message || 'Ошибка сети'
    log.error('loadRecentLogs network error', e)
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
      logsHasMore.value = data?.hasMore ?? data.entries.length === LOG_FETCH_LIMIT
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
  log.info('Логи очищены: окно готово к новому потоку')
}

const expandedLogRows = ref<Record<number, boolean>>({})
const toggleLogRow = (idx: number) => {
  expandedLogRows.value[idx] = !expandedLogRows.value[idx]
}

watch(selectedLogStream, () => {
  logsRequestId.value += 1
  logEntries.value = []
  oldestLogTimestamp.value = null
  logsHasMore.value = false
  logsError.value = ''
  expandedLogRows.value = {}
  if (props.encodedLogsSocketId) {
    loadRecentLogs()
  }
})

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

  if (window.bootLoaderComplete) {
    startAnimations()
  } else {
    window.addEventListener('bootloader-complete', startAnimations)
  }

  if (props.encodedLogsSocketId) {
    browserRemoteLogger = createBrowserRemoteLogger({
      post: (payload) => postBrowserLogsRoute.run(ctx, payload)
    })
    browserRemoteLogger.installConsoleAndGlobalHandlers()
    setLogSink((entry: LogEntry) => {
      pushVisibleLogEntry(entry)
      browserRemoteLogger!.pushSinkEntry(entry)
    })
    getOrCreateBrowserSocketClient()
      .then((socketClient) => {
        logsSocketSubscription = socketClient.subscribeToData(props.encodedLogsSocketId!)
        logsSocketSubscription.listen((data: { type?: string; data?: LogEntry }) => {
          if (data?.type === 'new-log' && data.data) {
            const entry = data.data as LogEntry
            if (isBrowserSinkEchoFromSocket(entry)) return
            pushVisibleLogEntry(entry)
          }
        })
      })
      .catch((err) => log.error('Не удалось подписаться на логи по WebSocket', err))
    loadRecentLogs()
  }
})

onBeforeUnmount(() => {
  log.info('onBeforeUnmount: cleaning up socket subscription')
  if (logsSocketSubscription?.unsubscribe) {
    logsSocketSubscription.unsubscribe()
    logsSocketSubscription = null
  }
})

onUnmounted(() => {
  log.info('Component unmounted')
  setLogSink(null)
  if (browserRemoteLogger) {
    browserRemoteLogger.teardown()
    browserRemoteLogger = null
  }
  window.removeEventListener('bootloader-complete', startAnimations)
  if (intervalIds.title) clearInterval(intervalIds.title)
  if (intervalIds.desc) clearInterval(intervalIds.desc)
})

const openChatiumLink = () => {
  log.notice('Opening Chatium link')
  window.open('https://chatium.ru/?start=pl-LGBT1Oge7c61RkKTU4t0start', '_blank')
}

type SuiteRow = { id: string; title: string; passed: boolean; error?: string }

type RowVisual = {
  id: string
  title: string
  status: 'pending' | 'success' | 'fail'
  badgeText: string
  error?: string
}

const testsSuiteTab = ref<'unit' | 'integration' | 'http'>('unit')
const lastSuiteRunAt = ref<string | null>(null)
const runAllTestsLoading = ref(false)
const runTabTestsLoading = ref(false)

const unitResults = ref<SuiteRow[]>([])
const integrationResults = ref<SuiteRow[]>([])
const httpPageResults = ref<SuiteRow[]>([])
const unitLoading = ref(false)
const integrationLoading = ref(false)
const httpPagesLoading = ref(false)
type SingleRunGroup = 'unit' | 'integration' | 'http'
const singleTestRun = ref<{ group: SingleRunGroup; id: string } | null>(null)

function getApiBaseUrl(): string {
  const path = props.indexUrl.startsWith('http') ? new URL(props.indexUrl).pathname : props.indexUrl
  const basePath = path.replace(/\/$/, '') || '/p/units/chatiumclub/sdk'
  const origin = props.indexUrl.startsWith('http')
    ? new URL(props.indexUrl).origin
    : window.location.origin
  return `${origin}${basePath.startsWith('/') ? basePath : '/' + basePath}`
}

const HTTP_PATH_BY_TEST_ID: Record<string, string> = {
  index: '/',
  'web-admin': '/web/admin',
  'web-profile': '/web/profile',
  'web-login': '/web/login',
  'web-tests': '/web/tests'
}

/** Минимальные фрагменты SSR для проверки (п. 6 плана). */
const HTTP_HTML_SNIPPETS: Record<string, string[]> = {
  index: ['window.__BOOT__', 'Тонкий клиент Chatium+GC'],
  'web-admin': ['window.__BOOT__', 'Админка'],
  'web-profile': ['window.__BOOT__', 'Профиль'],
  'web-login': ['Вход'],
  /** Не «Юнит» из вкладок: в ответе может быть только head + boot, без полного тела до гидрации. См. meta в web/tests/index.tsx */
  'web-tests': ['window.__BOOT__', 'chatiumclub-sdk-tests-page']
}

function httpPagePassed(
  testId: string,
  res: Response,
  html: string
): { ok: boolean; error?: string } {
  if (!res.ok) return { ok: false, error: `HTTP ${res.status}` }
  const finalUrl = res.url || ''
  if (testId === 'web-admin') {
    if (finalUrl.includes('/web/admin')) {
      const ok = html.includes('__BOOT__') && html.includes('Админка')
      return ok ? { ok: true } : { ok: false, error: 'нет SSR админки' }
    }
    const ok = html.includes('Вход') || html.includes('Перенаправление')
    return ok ? { ok: true } : { ok: false, error: 'ожидался редирект на вход' }
  }
  if (testId === 'web-profile') {
    if (finalUrl.includes('/web/profile')) {
      const ok = html.includes('__BOOT__') && html.includes('Профиль')
      return ok ? { ok: true } : { ok: false, error: 'нет SSR профиля' }
    }
    const ok = html.includes('Вход') || html.includes('login')
    return ok ? { ok: true } : { ok: false, error: 'ожидался редирект на вход' }
  }
  const need = HTTP_HTML_SNIPPETS[testId]
  if (!need?.length) return { ok: true }
  for (const s of need) {
    if (!html.includes(s)) return { ok: false, error: `нет фрагмента: ${s.slice(0, 40)}…` }
  }
  return { ok: true }
}

function resultById(results: SuiteRow[], id: string): SuiteRow | undefined {
  return results.find((r) => r.id === id)
}

function upsertTestResults(existing: SuiteRow[], incoming: SuiteRow[]): SuiteRow[] {
  const byId = new Map(existing.map((row) => [row.id, row]))
  for (const row of incoming) byId.set(row.id, row)
  return Array.from(byId.values())
}

function isSingleRunning(group: SingleRunGroup, id: string): boolean {
  const active = singleTestRun.value
  return active !== null && active.group === group && active.id === id
}

function isGroupBlockedBySingle(group: SingleRunGroup): boolean {
  return singleTestRun.value?.group === group
}

function rowVisual(test: TestCatalogEntry, results: SuiteRow[]): RowVisual {
  const r = resultById(results, test.id)
  if (!r) {
    return { id: test.id, title: test.title, status: 'pending', badgeText: 'ОЖИД' }
  }
  return {
    id: test.id,
    title: test.title,
    status: r.passed ? 'success' : 'fail',
    badgeText: r.passed ? 'OK' : 'FAIL',
    error: r.error
  }
}

function blockRollup(block: TestCatalogBlock, results: SuiteRow[]) {
  const n = block.tests.length
  let ok = 0
  let fail = 0
  let pend = 0
  for (const t of block.tests) {
    const r = resultById(results, t.id)
    if (!r) pend++
    else if (r.passed) ok++
    else fail++
  }
  let label: string
  if (pend === n) {
    label = 'не запускали'
  } else if (fail > 0) {
    label = `${ok} пройдено, ${fail} с ошибкой${pend ? `, ${pend} без прогона` : ''}`
  } else if (pend > 0) {
    label = `${ok}/${n} пройдено, ${pend} без прогона`
  } else {
    label = `все ${n} пройдены`
  }
  return { ok, fail, pend, n, label }
}

function metricsFromBlocks(blocks: TestCatalogBlock[], results: SuiteRow[]) {
  const total = flattenCatalogBlocks(blocks).length
  let passed = 0
  let failed = 0
  for (const t of flattenCatalogBlocks(blocks)) {
    const r = resultById(results, t.id)
    if (!r) continue
    if (r.passed) passed++
    else failed++
  }
  const skipped = total - passed - failed
  return { total, passed, failed, skipped }
}

const tabTestMetrics = computed(() => {
  if (testsSuiteTab.value === 'unit') {
    return metricsFromBlocks(UNIT_TEST_BLOCKS, unitResults.value)
  }
  if (testsSuiteTab.value === 'integration') {
    return metricsFromBlocks(INTEGRATION_SERVER_TEST_BLOCKS, integrationResults.value)
  }
  return metricsFromBlocks([INTEGRATION_HTTP_TEST_BLOCK], httpPageResults.value)
})

const tabRunButtonIdleLabel = computed(() => {
  if (testsSuiteTab.value === 'unit') return 'Запустить юнит-набор'
  if (testsSuiteTab.value === 'integration') return 'Запустить серверную интеграцию'
  return 'Проверить HTTP-страницы'
})

function summarizeRows(rows: SuiteRow[]) {
  const passed = rows.filter((r) => r.passed).length
  return { total: rows.length, passed, failed: rows.length - passed, todo: 0 }
}

type BlockSectionView = {
  block: TestCatalogBlock
  rollupLabel: string
  rows: { test: TestCatalogEntry; visual: RowVisual }[]
}

function mapBlocksToView(blocks: TestCatalogBlock[], results: SuiteRow[]): BlockSectionView[] {
  return blocks.map((block) => ({
    block,
    rollupLabel: blockRollup(block, results).label,
    rows: block.tests.map((test) => ({
      test,
      visual: rowVisual(test, results)
    }))
  }))
}

const unitBlocksView = computed(() => mapBlocksToView(UNIT_TEST_BLOCKS, unitResults.value))

const integrationServerBlocksView = computed(() =>
  mapBlocksToView(INTEGRATION_SERVER_TEST_BLOCKS, integrationResults.value)
)

const integrationHttpBlocksView = computed(() =>
  mapBlocksToView([INTEGRATION_HTTP_TEST_BLOCK], httpPageResults.value)
)

type SuiteSectionTab = 'unit' | 'integration' | 'http'

/** Ключ `tab:blockId`. Если ключа нет — по умолчанию развёрнута только первая категория (index 0). */
const suiteSectionOpen = ref<Record<string, boolean>>({})

function suiteSectionStateKey(tab: SuiteSectionTab, blockId: string): string {
  return `${tab}:${blockId}`
}

function isSuiteSectionExpanded(
  tab: SuiteSectionTab,
  blockId: string,
  blockIndex: number
): boolean {
  const key = suiteSectionStateKey(tab, blockId)
  const v = suiteSectionOpen.value[key]
  if (v !== undefined) return v
  return blockIndex === 0
}

function toggleSuiteSection(tab: SuiteSectionTab, blockId: string, blockIndex: number): void {
  const key = suiteSectionStateKey(tab, blockId)
  const next = !isSuiteSectionExpanded(tab, blockId, blockIndex)
  suiteSectionOpen.value = { ...suiteSectionOpen.value, [key]: next }
}

async function runUnitSuite() {
  unitLoading.value = true
  try {
    const base = getApiBaseUrl().replace(/\/$/, '')
    const res = await fetch(`${base}/api/tests/unit`, { credentials: 'include' })
    const data = (await res.json().catch(() => null)) as { results?: SuiteRow[] }
    unitResults.value = Array.isArray(data?.results) ? data.results : []
    lastSuiteRunAt.value = new Date().toLocaleString('ru-RU')
    log.info('Юнит-набор', summarizeRows(unitResults.value))
  } catch (e) {
    unitResults.value = [
      {
        id: 'fetch',
        title: 'GET /api/tests/unit',
        passed: false,
        error: (e as Error)?.message ?? String(e)
      }
    ]
  } finally {
    unitLoading.value = false
  }
}

async function runSingleUnitTest(testId: string) {
  const fallbackTitle =
    flattenCatalogBlocks(UNIT_TEST_BLOCKS).find((t) => t.id === testId)?.title ?? testId
  singleTestRun.value = { group: 'unit', id: testId }
  try {
    const base = getApiBaseUrl().replace(/\/$/, '')
    const res = await fetch(`${base}/api/tests/unit`, { credentials: 'include' })
    const data = (await res.json().catch(() => null)) as { results?: SuiteRow[] }
    const one = Array.isArray(data?.results) ? data.results.find((r) => r.id === testId) : undefined
    unitResults.value = upsertTestResults(unitResults.value, [
      one ?? {
        id: testId,
        title: fallbackTitle,
        passed: false,
        error: 'Тест не найден в ответе /api/tests/unit'
      }
    ])
    lastSuiteRunAt.value = new Date().toLocaleString('ru-RU')
  } catch (e) {
    unitResults.value = upsertTestResults(unitResults.value, [
      { id: testId, title: fallbackTitle, passed: false, error: (e as Error)?.message ?? String(e) }
    ])
  } finally {
    singleTestRun.value = null
  }
}

async function runIntegrationSuite() {
  integrationLoading.value = true
  try {
    const base = getApiBaseUrl().replace(/\/$/, '')
    const res = await fetch(`${base}/api/tests/integration`, { credentials: 'include' })
    const data = (await res.json().catch(() => null)) as { results?: SuiteRow[] }
    integrationResults.value = Array.isArray(data?.results) ? data.results : []
    lastSuiteRunAt.value = new Date().toLocaleString('ru-RU')
    log.info('Интеграция (сервер)', summarizeRows(integrationResults.value))
  } catch (e) {
    integrationResults.value = [
      {
        id: 'fetch',
        title: 'GET /api/tests/integration',
        passed: false,
        error: (e as Error)?.message ?? String(e)
      }
    ]
  } finally {
    integrationLoading.value = false
  }
}

async function runSingleIntegrationTest(testId: string) {
  const fallbackTitle =
    flattenCatalogBlocks(INTEGRATION_SERVER_TEST_BLOCKS).find((t) => t.id === testId)?.title ??
    testId
  singleTestRun.value = { group: 'integration', id: testId }
  try {
    const base = getApiBaseUrl().replace(/\/$/, '')
    const res = await fetch(`${base}/api/tests/integration`, { credentials: 'include' })
    const data = (await res.json().catch(() => null)) as { results?: SuiteRow[] }
    const one = Array.isArray(data?.results) ? data.results.find((r) => r.id === testId) : undefined
    integrationResults.value = upsertTestResults(integrationResults.value, [
      one ?? {
        id: testId,
        title: fallbackTitle,
        passed: false,
        error: 'Тест не найден в ответе /api/tests/integration'
      }
    ])
    lastSuiteRunAt.value = new Date().toLocaleString('ru-RU')
  } catch (e) {
    integrationResults.value = upsertTestResults(integrationResults.value, [
      { id: testId, title: fallbackTitle, passed: false, error: (e as Error)?.message ?? String(e) }
    ])
  } finally {
    singleTestRun.value = null
  }
}

async function runHttpPageChecks() {
  httpPagesLoading.value = true
  const base = getApiBaseUrl().replace(/\/$/, '')
  const out: SuiteRow[] = []
  try {
    for (const t of INTEGRATION_HTTP_TEST_BLOCK.tests) {
      const path = HTTP_PATH_BY_TEST_ID[t.id] ?? '/'
      const url = `${base}${path === '/' ? '' : path}`
      try {
        const res = await fetch(url, { method: 'GET', credentials: 'include' })
        const html = await res.text()
        const chk = httpPagePassed(t.id, res, html)
        out.push({
          id: t.id,
          title: t.title,
          passed: chk.ok,
          error: chk.error
        })
      } catch (e) {
        out.push({
          id: t.id,
          title: t.title,
          passed: false,
          error: (e as Error)?.message ?? String(e)
        })
      }
    }
    httpPageResults.value = out
    lastSuiteRunAt.value = new Date().toLocaleString('ru-RU')
    log.info('HTTP страниц шаблона', summarizeRows(out))
  } finally {
    httpPagesLoading.value = false
  }
}

async function runSingleHttpPageCheck(testId: string) {
  const fallbackTitle =
    INTEGRATION_HTTP_TEST_BLOCK.tests.find((t) => t.id === testId)?.title ?? testId
  const path = HTTP_PATH_BY_TEST_ID[testId]
  singleTestRun.value = { group: 'http', id: testId }
  try {
    if (!path) {
      httpPageResults.value = upsertTestResults(httpPageResults.value, [
        {
          id: testId,
          title: fallbackTitle,
          passed: false,
          error: 'Маршрут не найден в HTTP_PATH_BY_TEST_ID'
        }
      ])
      return
    }
    const base = getApiBaseUrl().replace(/\/$/, '')
    const url = `${base}${path === '/' ? '' : path}`
    const res = await fetch(url, { method: 'GET', credentials: 'include' })
    const html = await res.text()
    const chk = httpPagePassed(testId, res, html)
    httpPageResults.value = upsertTestResults(httpPageResults.value, [
      {
        id: testId,
        title: fallbackTitle,
        passed: chk.ok,
        error: chk.error
      }
    ])
    lastSuiteRunAt.value = new Date().toLocaleString('ru-RU')
  } catch (e) {
    httpPageResults.value = upsertTestResults(httpPageResults.value, [
      { id: testId, title: fallbackTitle, passed: false, error: (e as Error)?.message ?? String(e) }
    ])
  } finally {
    singleTestRun.value = null
  }
}

const runAllTestsOnCurrentTab = async () => {
  runTabTestsLoading.value = true
  try {
    if (testsSuiteTab.value === 'unit') {
      await runUnitSuite()
    } else if (testsSuiteTab.value === 'integration') {
      await runIntegrationSuite()
    } else {
      await runHttpPageChecks()
    }
    lastSuiteRunAt.value = new Date().toLocaleString('ru-RU')
  } finally {
    runTabTestsLoading.value = false
  }
}

const runAllTests = async () => {
  runAllTestsLoading.value = true
  log.info('Полный прогон шаблонных тестов')
  try {
    await runUnitSuite()
    await runIntegrationSuite()
    await runHttpPageChecks()
    lastSuiteRunAt.value = new Date().toLocaleString('ru-RU')
  } finally {
    runAllTestsLoading.value = false
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

    <main class="tp-wrap flex flex-col flex-1 relative z-10 min-h-0 w-full min-w-0 overflow-hidden">
      <div class="tp" :class="{ ready: bootLoaderDone }">
        <div class="tp-toolbar">
          <div class="tp-toolbar-left">
            <i class="fas fa-flask tp-icon-muted"></i>
            <span class="tp-path">/web/tests</span>
            <div class="tp-tabs">
              <button
                type="button"
                class="tp-tab"
                :class="{ active: testsSuiteTab === 'unit' }"
                @click="testsSuiteTab = 'unit'"
              >
                <i class="fas fa-cube tp-icon-tab"></i> Юнит
              </button>
              <button
                type="button"
                class="tp-tab"
                :class="{ active: testsSuiteTab === 'integration' }"
                @click="testsSuiteTab = 'integration'"
              >
                <i class="fas fa-network-wired tp-icon-tab"></i> Интеграция
              </button>
              <button
                type="button"
                class="tp-tab"
                :class="{ active: testsSuiteTab === 'http' }"
                @click="testsSuiteTab = 'http'"
              >
                <i class="fas fa-globe tp-icon-tab"></i> HTTP
              </button>
            </div>
          </div>
          <div class="tp-toolbar-right">
            <span v-if="lastSuiteRunAt" class="tp-last-run"
              ><i class="fas fa-clock tp-icon-muted"></i> {{ lastSuiteRunAt }}</span
            >
            <button
              type="button"
              class="tp-btn tp-btn--primary"
              :disabled="
                runTabTestsLoading ||
                runAllTestsLoading ||
                (testsSuiteTab === 'unit' && unitLoading) ||
                (testsSuiteTab === 'integration' && integrationLoading) ||
                (testsSuiteTab === 'http' && httpPagesLoading)
              "
              @click="runAllTestsOnCurrentTab"
            >
              <i v-if="runTabTestsLoading" class="fas fa-circle-notch fa-spin"></i>
              <i v-else class="fas fa-play"></i>
              {{ runTabTestsLoading ? 'Запуск...' : tabRunButtonIdleLabel }}
            </button>
            <button
              type="button"
              class="tp-btn"
              :disabled="runAllTestsLoading || runTabTestsLoading"
              @click="runAllTests"
            >
              <i v-if="runAllTestsLoading" class="fas fa-circle-notch fa-spin"></i>
              <i v-else class="fas fa-bolt"></i>
              {{ runAllTestsLoading ? 'Полный...' : 'Полный прогон' }}
            </button>
          </div>
          <div class="tp-toolbar-sweep"></div>
        </div>

        <div class="tp-grid" :class="{ 'tp-grid--logs': props.encodedLogsSocketId }">
          <div class="tp-main content-wrapper">
            <div class="tp-metrics">
              <div class="tp-metric">
                <i class="fas fa-list-ol tp-metric-icon"></i>
                <strong>{{ tabTestMetrics.total }}</strong>
                <span>всего</span>
              </div>
              <div class="tp-metric tp-metric--pass">
                <div class="tp-metric-accent"></div>
                <i class="fas fa-check-circle tp-metric-icon tp-metric-icon--pass"></i>
                <strong>{{ tabTestMetrics.passed }}</strong>
                <span>прошли</span>
              </div>
              <div class="tp-metric tp-metric--fail">
                <div class="tp-metric-accent"></div>
                <i class="fas fa-times-circle tp-metric-icon tp-metric-icon--fail"></i>
                <strong>{{ tabTestMetrics.failed }}</strong>
                <span>ошибки</span>
              </div>
              <div class="tp-metric tp-metric--skip">
                <div class="tp-metric-accent"></div>
                <i class="fas fa-minus-circle tp-metric-icon tp-metric-icon--skip"></i>
                <strong>{{ tabTestMetrics.skipped }}</strong>
                <span>не запущены</span>
              </div>
            </div>

            <div v-show="testsSuiteTab === 'unit'" class="tp-tab-panel">
              <div class="tp-suite">
                <div class="tp-suite-hd">
                  <h2><i class="fas fa-vial tp-icon-hd"></i> Юнит-тесты</h2>
                  <code class="tp-code">GET /api/tests/unit</code>
                </div>
                <div
                  v-for="(section, sIdx) in unitBlocksView"
                  :key="section.block.id"
                  class="tp-block"
                >
                  <button
                    type="button"
                    class="tp-block-hd tp-block-hd--toggle"
                    :aria-expanded="isSuiteSectionExpanded('unit', section.block.id, sIdx)"
                    @click="toggleSuiteSection('unit', section.block.id, sIdx)"
                  >
                    <span class="tp-block-hd-title">
                      <i
                        class="tp-icon-block"
                        :class="
                          isSuiteSectionExpanded('unit', section.block.id, sIdx)
                            ? 'fas fa-folder-open'
                            : 'fas fa-folder'
                        "
                      ></i>
                      {{ section.block.title }}
                    </span>
                    <span class="tp-block-info">{{ section.rollupLabel }}</span>
                  </button>
                  <div
                    v-show="isSuiteSectionExpanded('unit', section.block.id, sIdx)"
                    class="tp-block-body"
                  >
                    <p v-if="section.block.description" class="tp-block-desc">
                      {{ section.block.description }}
                    </p>
                    <ul class="tp-tests" role="list">
                      <li
                        v-for="row in section.rows"
                        :key="row.test.id"
                        class="tp-test"
                        :class="`tp-test--${row.visual.status}`"
                      >
                        <div
                          class="tp-test-accent"
                          :class="`tp-test-accent--${row.visual.status}`"
                        ></div>
                        <div class="tp-test-content">
                          <div class="tp-test-main">
                            <span class="tp-badge" :class="`tp-badge--${row.visual.status}`">{{
                              row.visual.badgeText
                            }}</span>
                            <span class="tp-test-name">{{ row.test.title }}</span>
                            <button
                              type="button"
                              class="tp-test-run"
                              :disabled="unitLoading || isGroupBlockedBySingle('unit')"
                              @click="runSingleUnitTest(row.test.id)"
                            >
                              <i
                                v-if="isSingleRunning('unit', row.test.id)"
                                class="fas fa-circle-notch fa-spin"
                              ></i>
                              <i v-else class="fas fa-play"></i>
                            </button>
                          </div>
                          <code class="tp-test-id">{{ row.test.id }}</code>
                          <p v-if="row.visual.error" class="tp-test-err">
                            <i class="fas fa-exclamation-circle"></i> {{ row.visual.error }}
                          </p>
                        </div>
                      </li>
                    </ul>
                  </div>
                </div>
                <button
                  type="button"
                  class="tp-btn tp-suite-run"
                  :disabled="unitLoading || isGroupBlockedBySingle('unit')"
                  @click="runUnitSuite"
                >
                  <i v-if="unitLoading" class="fas fa-circle-notch fa-spin"></i>
                  <i v-else class="fas fa-play"></i>
                  {{ unitLoading ? 'Запуск...' : 'Запустить юнит-набор' }}
                </button>
              </div>
            </div>

            <div v-show="testsSuiteTab === 'integration'" class="tp-tab-panel">
              <div class="tp-suite">
                <div class="tp-suite-hd">
                  <h2><i class="fas fa-server tp-icon-hd"></i> Серверная интеграция</h2>
                  <code class="tp-code">GET /api/tests/integration</code>
                </div>
                <div
                  v-for="(section, sIdx) in integrationServerBlocksView"
                  :key="section.block.id"
                  class="tp-block"
                >
                  <button
                    type="button"
                    class="tp-block-hd tp-block-hd--toggle"
                    :aria-expanded="isSuiteSectionExpanded('integration', section.block.id, sIdx)"
                    @click="toggleSuiteSection('integration', section.block.id, sIdx)"
                  >
                    <span class="tp-block-hd-title">
                      <i
                        class="tp-icon-block"
                        :class="
                          isSuiteSectionExpanded('integration', section.block.id, sIdx)
                            ? 'fas fa-folder-open'
                            : 'fas fa-folder'
                        "
                      ></i>
                      {{ section.block.title }}
                    </span>
                    <span class="tp-block-info">{{ section.rollupLabel }}</span>
                  </button>
                  <div
                    v-show="isSuiteSectionExpanded('integration', section.block.id, sIdx)"
                    class="tp-block-body"
                  >
                    <p v-if="section.block.description" class="tp-block-desc">
                      {{ section.block.description }}
                    </p>
                    <ul class="tp-tests" role="list">
                      <li
                        v-for="row in section.rows"
                        :key="row.test.id"
                        class="tp-test"
                        :class="`tp-test--${row.visual.status}`"
                      >
                        <div
                          class="tp-test-accent"
                          :class="`tp-test-accent--${row.visual.status}`"
                        ></div>
                        <div class="tp-test-content">
                          <div class="tp-test-main">
                            <span class="tp-badge" :class="`tp-badge--${row.visual.status}`">{{
                              row.visual.badgeText
                            }}</span>
                            <span class="tp-test-name">{{ row.test.title }}</span>
                            <button
                              type="button"
                              class="tp-test-run"
                              :disabled="
                                integrationLoading || isGroupBlockedBySingle('integration')
                              "
                              @click="runSingleIntegrationTest(row.test.id)"
                            >
                              <i
                                v-if="isSingleRunning('integration', row.test.id)"
                                class="fas fa-circle-notch fa-spin"
                              ></i>
                              <i v-else class="fas fa-play"></i>
                            </button>
                          </div>
                          <code class="tp-test-id">{{ row.test.id }}</code>
                          <p v-if="row.visual.error" class="tp-test-err">
                            <i class="fas fa-exclamation-circle"></i> {{ row.visual.error }}
                          </p>
                        </div>
                      </li>
                    </ul>
                  </div>
                </div>
                <button
                  type="button"
                  class="tp-btn tp-suite-run"
                  :disabled="integrationLoading || isGroupBlockedBySingle('integration')"
                  @click="runIntegrationSuite"
                >
                  <i v-if="integrationLoading" class="fas fa-circle-notch fa-spin"></i>
                  <i v-else class="fas fa-play"></i>
                  {{ integrationLoading ? 'Запуск...' : 'Запустить серверную интеграцию' }}
                </button>
              </div>
            </div>

            <div v-show="testsSuiteTab === 'http'" class="tp-tab-panel">
              <div class="tp-suite">
                <div class="tp-suite-hd">
                  <h2><i class="fas fa-globe tp-icon-hd"></i> HTTP-проверки страниц</h2>
                  <code class="tp-code">GET /, /web/*</code>
                </div>
                <div
                  v-for="(section, sIdx) in integrationHttpBlocksView"
                  :key="section.block.id"
                  class="tp-block"
                >
                  <button
                    type="button"
                    class="tp-block-hd tp-block-hd--toggle"
                    :aria-expanded="isSuiteSectionExpanded('http', section.block.id, sIdx)"
                    @click="toggleSuiteSection('http', section.block.id, sIdx)"
                  >
                    <span class="tp-block-hd-title">
                      <i
                        class="tp-icon-block"
                        :class="
                          isSuiteSectionExpanded('http', section.block.id, sIdx)
                            ? 'fas fa-folder-open'
                            : 'fas fa-folder'
                        "
                      ></i>
                      {{ section.block.title }}
                    </span>
                    <span class="tp-block-info">{{ section.rollupLabel }}</span>
                  </button>
                  <div
                    v-show="isSuiteSectionExpanded('http', section.block.id, sIdx)"
                    class="tp-block-body"
                  >
                    <p v-if="section.block.description" class="tp-block-desc">
                      {{ section.block.description }}
                    </p>
                    <ul class="tp-tests" role="list">
                      <li
                        v-for="row in section.rows"
                        :key="row.test.id"
                        class="tp-test"
                        :class="`tp-test--${row.visual.status}`"
                      >
                        <div
                          class="tp-test-accent"
                          :class="`tp-test-accent--${row.visual.status}`"
                        ></div>
                        <div class="tp-test-content">
                          <div class="tp-test-main">
                            <span class="tp-badge" :class="`tp-badge--${row.visual.status}`">{{
                              row.visual.badgeText
                            }}</span>
                            <span class="tp-test-name">{{ row.test.title }}</span>
                            <button
                              type="button"
                              class="tp-test-run"
                              :disabled="httpPagesLoading || isGroupBlockedBySingle('http')"
                              @click="runSingleHttpPageCheck(row.test.id)"
                            >
                              <i
                                v-if="isSingleRunning('http', row.test.id)"
                                class="fas fa-circle-notch fa-spin"
                              ></i>
                              <i v-else class="fas fa-play"></i>
                            </button>
                          </div>
                          <code class="tp-test-id">{{ row.test.id }}</code>
                          <p v-if="row.visual.error" class="tp-test-err">
                            <i class="fas fa-exclamation-circle"></i> {{ row.visual.error }}
                          </p>
                        </div>
                      </li>
                    </ul>
                  </div>
                </div>
                <button
                  type="button"
                  class="tp-btn tp-suite-run"
                  :disabled="httpPagesLoading || isGroupBlockedBySingle('http')"
                  @click="runHttpPageChecks"
                >
                  <i v-if="httpPagesLoading" class="fas fa-circle-notch fa-spin"></i>
                  <i v-else class="fas fa-play"></i>
                  {{ httpPagesLoading ? 'Запуск...' : 'Проверить HTTP-страницы' }}
                </button>
              </div>
            </div>
          </div>

          <aside v-if="props.encodedLogsSocketId" class="tp-side">
            <section class="tp-card tp-log-card">
              <div class="tp-card-hd">
                <h2><i class="fas fa-stream tp-icon-hd"></i> Монитор логов</h2>
                <span class="tp-log-ct">{{ currentLogCount }} зап.</span>
              </div>
              <div class="tp-log-filters">
                <button
                  v-for="s in LOG_STREAM_KEYS"
                  :key="s"
                  type="button"
                  class="tp-flt"
                  :class="{ active: selectedLogStream === s }"
                  @click="toggleLogFilter(s)"
                >
                  {{ LOG_STREAM_LABELS[s] }}
                </button>
              </div>
              <div v-if="displayedLogRowIndices.length" class="tp-log-toggle-row">
                <button
                  type="button"
                  class="tp-btn tp-btn--toggle-all"
                  @click="toggleExpandCollapseAllLogs"
                >
                  <i
                    :class="hasAnyExpandedLogRow ? 'fas fa-compress-alt' : 'fas fa-expand-alt'"
                  ></i>
                  {{ hasAnyExpandedLogRow ? 'Свернуть все' : 'Развернуть все' }}
                </button>
              </div>
              <div class="tp-log-out custom-scrollbar" ref="logsOutputRef">
                <div v-if="!displayedLogs.length" class="tp-log-empty">
                  <i
                    class="fas fa-inbox"
                    style="font-size: 1.2rem; display: block; margin-bottom: 0.5rem; opacity: 0.4"
                  ></i>
                  Поток «{{ selectedLogStreamLabel }}» пуст
                </div>
                <template v-for="(item, index) in displayedLogs" :key="index">
                  <div v-if="item.type === 'divider'" class="tp-log-div">
                    <span>{{ item.date }}</span>
                  </div>
                  <div
                    v-else
                    class="tp-log-row"
                    :class="{ expanded: expandedLogRows[index] }"
                    @click="toggleLogRow(index)"
                  >
                    <span class="tp-log-t">{{ item.formattedTime }}</span>
                    <span class="tp-log-l" :class="`lvl-${item.entry.level}`"
                      >[{{ item.entry.level.toUpperCase() }}]</span
                    >
                    <span class="tp-log-m">{{ item.formattedMessage }}</span>
                  </div>
                </template>
              </div>
              <div class="tp-log-ft">
                <span v-if="logsLoading" class="tp-log-sync">
                  <i class="fas fa-circle-notch fa-spin"></i> Загрузка...
                </span>
                <p v-if="logsError" class="tp-err">
                  <i class="fas fa-exclamation-circle"></i> {{ logsError }}
                </p>
                <div class="tp-log-btns">
                  <button
                    v-if="logsHasMore && !logsLoading"
                    type="button"
                    class="tp-btn"
                    @click="loadMoreLogs"
                  >
                    <i class="fas fa-chevron-down"></i> Ещё 50
                  </button>
                  <button type="button" class="tp-btn tp-btn--danger" @click="clearLogs">
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
/* Высота окна: хедер и футер фиксированы; вертикальный скролл у левой колонки, не у <main>. */
.app-layout {
  height: 100vh;
  height: 100dvh;
  max-height: 100vh;
  max-height: 100dvh;
  overflow: hidden;
  position: relative;
  width: 100%;
}

.tp-wrap {
  display: flex;
  flex-direction: column;
  min-height: 0;
  min-width: 0;
  width: 100%;
  overflow: hidden;
}

.tp {
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
  --c-cyan: #7dbfcc;

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
.tp.ready {
  opacity: 1;
  transform: none;
}
.tp,
.tp :deep(*) {
  box-sizing: border-box;
  border-radius: 0 !important;
  line-height: 1.45;
}

.tp-icon-muted {
  font-size: 0.65rem;
  opacity: 0.55;
}
.tp-icon-hd {
  font-size: 0.68rem;
  opacity: 0.6;
  margin-right: 0.15rem;
}
.tp-icon-tab {
  font-size: 0.6rem;
  opacity: 0.6;
  margin-right: 0.1rem;
}
.tp-icon-block {
  font-size: 0.62rem;
  opacity: 0.55;
  margin-right: 0.15rem;
}

/* ── TOOLBAR ── */
.tp-toolbar {
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
  flex-wrap: wrap;
  position: relative;
  overflow: hidden;
}
.tp-toolbar::after {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 1px;
  background: linear-gradient(90deg, transparent, var(--c-red), transparent);
  opacity: 0.3;
}
.tp-toolbar-sweep {
  position: absolute;
  top: 0;
  left: -50%;
  width: 50%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(217, 86, 114, 0.03), transparent);
  animation: tp-sweep 8s linear infinite;
  pointer-events: none;
}
@keyframes tp-sweep {
  0% {
    left: -50%;
  }
  100% {
    left: 150%;
  }
}
.tp-toolbar-left,
.tp-toolbar-right {
  display: flex;
  align-items: center;
  gap: 0.55rem;
  position: relative;
  z-index: 1;
}
.tp-path {
  color: var(--c-red-s);
  letter-spacing: 0.04em;
  font-weight: 600;
}
.tp-last-run {
  font-size: 0.68rem;
  color: var(--c-tx3);
  white-space: nowrap;
  font-variant-numeric: tabular-nums;
}

/* ── TABS ── */
.tp-tabs {
  display: inline-flex;
}
.tp-tab {
  padding: 0.35rem 0.8rem;
  border: 1px solid var(--c-bdr);
  background: var(--c-bg-deep);
  color: var(--c-tx2);
  font-family: inherit;
  font-size: 0.76rem;
  cursor: pointer;
  transition: all 0.15s ease;
  font-weight: 600;
  letter-spacing: 0.04em;
  position: relative;
  overflow: hidden;
}
.tp-tab + .tp-tab {
  border-left: none;
}
.tp-tab::after {
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
.tp-tab:hover {
  border-color: var(--c-bdr-hi);
  background: rgba(22, 20, 26, 0.98);
  color: var(--c-tx);
}
.tp-tab:hover::after {
  transform: scaleX(1);
}
.tp-tab.active {
  border-color: var(--c-red-s);
  background: rgba(196, 33, 63, 0.14);
  color: #fff;
}
.tp-tab.active::after {
  transform: scaleX(1);
}
.tp-tab.active .tp-icon-tab {
  opacity: 0.8;
}

/* ── GRID ── */
.tp-grid {
  flex: 1 1 auto;
  min-height: 0;
  display: grid;
  grid-template-columns: 1fr;
  grid-template-rows: minmax(0, 1fr);
  gap: 0.85rem;
  align-items: stretch;
}
.tp-grid--logs {
  grid-template-columns: minmax(240px, 1fr) minmax(360px, 440px);
}
.tp-main {
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
  min-width: 0;
  min-height: 0;
  overflow-x: hidden;
  overflow-y: auto;
}

.tp-tab-panel {
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
}

/* ── METRICS ── */
.tp-metrics {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 0.55rem;
  animation: tp-enter 0.5s cubic-bezier(0.25, 0.46, 0.45, 0.94) 0.1s both;
}
@keyframes tp-enter {
  from {
    opacity: 0;
    transform: translateY(8px);
  }
  to {
    opacity: 1;
    transform: none;
  }
}
.tp-metric {
  border: 1px solid var(--c-bdr);
  background: linear-gradient(175deg, var(--c-bg), var(--c-bg2));
  padding: 0.55rem 0.7rem;
  display: flex;
  flex-direction: column;
  gap: 0.1rem;
  position: relative;
  overflow: hidden;
  transition: border-color 0.25s ease;
}
.tp-metric::after {
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
.tp-metric-accent {
  position: absolute;
  top: 0;
  left: 0;
  width: 3px;
  height: 100%;
}
.tp-metric-icon {
  font-size: 0.6rem;
  color: var(--c-tx3);
  opacity: 0.7;
  position: relative;
  z-index: 1;
  margin-bottom: 0.15rem;
}
.tp-metric-icon--pass {
  color: var(--c-ok);
  opacity: 0.75;
}
.tp-metric-icon--fail {
  color: var(--c-alert);
  opacity: 0.75;
}
.tp-metric-icon--skip {
  color: var(--c-warn);
  opacity: 0.75;
}
.tp-metric strong {
  font-size: 1.35rem;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  line-height: 1.15;
  color: var(--c-tx);
  position: relative;
  z-index: 1;
}
.tp-metric span {
  font-size: 0.66rem;
  color: var(--c-tx3);
  letter-spacing: 0.04em;
  text-transform: uppercase;
  position: relative;
  z-index: 1;
}

.tp-metric--pass .tp-metric-accent {
  background: var(--c-ok);
}
.tp-metric--pass strong {
  color: var(--c-ok);
}
.tp-metric--pass {
  border-color: rgba(106, 175, 126, 0.2);
}
.tp-metric--pass:hover {
  border-color: rgba(106, 175, 126, 0.4);
}

.tp-metric--fail .tp-metric-accent {
  background: var(--c-alert);
}
.tp-metric--fail strong {
  color: var(--c-alert);
}
.tp-metric--fail {
  border-color: rgba(217, 122, 138, 0.2);
}
.tp-metric--fail:hover {
  border-color: rgba(217, 122, 138, 0.4);
}

.tp-metric--skip .tp-metric-accent {
  background: var(--c-warn);
}
.tp-metric--skip strong {
  color: var(--c-warn);
}
.tp-metric--skip {
  border-color: rgba(201, 166, 96, 0.2);
}
.tp-metric--skip:hover {
  border-color: rgba(201, 166, 96, 0.4);
}

/* ── SUITES ── */
.tp-suite {
  border: 1px solid var(--c-bdr);
  background: linear-gradient(175deg, var(--c-bg), var(--c-bg2));
  padding: 0.85rem 1rem;
  position: relative;
  animation: tp-enter 0.5s cubic-bezier(0.25, 0.46, 0.45, 0.94) 0.2s both;
}
.tp-suite::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 1px;
  background: linear-gradient(90deg, transparent 10%, var(--c-red) 50%, transparent 90%);
  opacity: 0.2;
}
.tp-suite::after {
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
.tp-suite-hd {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  margin-bottom: 0.7rem;
  flex-wrap: wrap;
  position: relative;
  z-index: 1;
}
.tp-suite-hd h2 {
  margin: 0;
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--c-tx2);
  letter-spacing: 0.04em;
  text-transform: uppercase;
}
.tp-code {
  border: 1px solid rgba(50, 44, 54, 0.4);
  background: var(--c-bg-deep);
  color: var(--c-tx3);
  padding: 0.18rem 0.45rem;
  font-size: 0.7rem;
  letter-spacing: 0.03em;
  font-family: inherit;
}

/* ── TEST BLOCKS ── */
.tp-block + .tp-block {
  margin-top: 0.7rem;
}
.tp-block-hd {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  padding: 0.45rem 0.6rem;
  border: 1px solid var(--c-bdr);
  background: var(--c-bg-deep);
  flex-wrap: wrap;
  position: relative;
  z-index: 1;
}
.tp-block-hd--toggle {
  width: 100%;
  box-sizing: border-box;
  cursor: pointer;
  font: inherit;
  color: inherit;
  text-align: left;
}
.tp-block-hd--toggle:hover {
  border-color: var(--c-bdr-hi);
}
.tp-block-hd-title,
.tp-block-hd h3 {
  margin: 0;
  font-size: 0.78rem;
  font-weight: 600;
  color: var(--c-tx);
  letter-spacing: 0.03em;
}
.tp-block-info {
  font-size: 0.68rem;
  color: var(--c-tx3);
  letter-spacing: 0.03em;
}
.tp-block-desc {
  margin: 0.4rem 0;
  font-size: 0.76rem;
  color: var(--c-tx2);
  position: relative;
  z-index: 1;
}

/* ── TEST ROWS ── */
.tp-tests {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  margin-top: 0.45rem;
  position: relative;
  z-index: 1;
}
.tp-test {
  display: flex;
  overflow: hidden;
  border: 1px solid var(--c-bdr);
  background: var(--c-bg-deep);
  transition: border-color 0.2s ease;
}
.tp-test:hover {
  border-color: var(--c-bdr-hi);
}
.tp-test--success {
  border-color: rgba(106, 175, 126, 0.2);
}
.tp-test--success:hover {
  border-color: rgba(106, 175, 126, 0.4);
}
.tp-test--fail {
  border-color: rgba(217, 122, 138, 0.25);
}
.tp-test--fail:hover {
  border-color: rgba(217, 122, 138, 0.45);
}
.tp-test-accent {
  width: 3px;
  flex-shrink: 0;
}
.tp-test-accent--success {
  background: var(--c-ok);
}
.tp-test-accent--fail {
  background: var(--c-alert);
}
.tp-test-accent--pending {
  background: var(--c-tx3);
  opacity: 0.3;
}
.tp-test-content {
  flex: 1;
  min-width: 0;
  padding: 0.4rem 0.55rem;
}
.tp-test-main {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) 1.8rem;
  gap: 0.45rem;
  align-items: center;
}

.tp-badge {
  font-size: 0.6rem;
  padding: 0.1rem 0.3rem;
  border: 1px solid;
  font-weight: 700;
  letter-spacing: 0.06em;
  line-height: 1.3;
}
.tp-badge--success {
  color: var(--c-ok);
  border-color: rgba(106, 175, 126, 0.4);
}
.tp-badge--fail {
  color: var(--c-alert);
  border-color: rgba(217, 122, 138, 0.4);
}
.tp-badge--pending {
  color: var(--c-tx3);
  border-color: rgba(92, 86, 89, 0.3);
}

.tp-test-name {
  color: var(--c-tx);
  font-size: 0.8rem;
  min-width: 0;
}
.tp-test-run {
  width: 1.8rem;
  height: 1.8rem;
  border: 1px solid var(--c-bdr);
  background: var(--c-bg-deep);
  color: var(--c-tx2);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s ease;
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
.tp-test-run i {
  font-size: 0.55rem;
}
.tp-test-run:hover:not(:disabled) {
  border-color: var(--c-red-s);
  color: #fff;
  background: rgba(196, 33, 63, 0.15);
}
.tp-test-run:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}
.tp-test-id {
  display: block;
  margin-top: 0.2rem;
  font-size: 0.64rem;
  color: var(--c-tx3);
  letter-spacing: 0.03em;
  font-family: inherit;
}
.tp-test-err {
  margin: 0.25rem 0 0;
  font-size: 0.74rem;
  color: var(--c-alert);
}
.tp-test-err i {
  font-size: 0.62rem;
  margin-right: 0.15rem;
}

/* ── BUTTONS ── */
.tp-btn {
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
  white-space: nowrap;
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
.tp-btn::before {
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
.tp-btn::after {
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
.tp-btn i {
  font-size: 0.62rem;
}
.tp-btn:hover:not(:disabled) {
  border-color: var(--c-bdr-hi);
  background: rgba(24, 22, 28, 0.98);
  transform: translateY(-1px);
  box-shadow: 0 3px 8px rgba(0, 0, 0, 0.35);
}
.tp-btn:hover:not(:disabled)::after {
  transform: scaleX(1);
}
.tp-btn:active:not(:disabled) {
  transform: translateY(0);
  box-shadow: none;
}
.tp-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.tp-btn--primary {
  border-color: rgba(217, 86, 114, 0.35);
  background: rgba(196, 33, 63, 0.14);
  color: #fff;
}
.tp-btn--primary::after {
  background: var(--c-red-s);
}
.tp-btn--primary:hover:not(:disabled) {
  background: rgba(196, 33, 63, 0.24);
  border-color: var(--c-red-s);
}

.tp-btn--danger {
  border-color: rgba(217, 122, 138, 0.3);
  color: #ecc8cf;
  background: rgba(45, 14, 22, 0.9);
}
.tp-btn--danger::after {
  background: var(--c-alert);
}
.tp-btn--danger:hover:not(:disabled) {
  border-color: rgba(217, 122, 138, 0.5);
  background: rgba(60, 20, 30, 0.95);
}

.tp-suite-run {
  margin-top: 0.7rem;
  width: 100%;
  justify-content: center;
  position: relative;
  z-index: 1;
}

.tp-err {
  margin: 0.4rem 0 0;
  color: var(--c-alert);
  font-size: 0.76rem;
}
.tp-err i {
  font-size: 0.62rem;
  margin-right: 0.15rem;
}

/* ── LOG SIDEBAR: высота по ячейке сетки; скролл только внутри .tp-log-out ── */
.tp-side {
  min-width: 0;
  min-height: 0;
  width: 100%;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
.tp-card {
  border: 1px solid var(--c-bdr);
  background: linear-gradient(175deg, var(--c-bg), var(--c-bg2));
  padding: 0.85rem 1rem;
  position: relative;
}
.tp-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 1px;
  background: linear-gradient(90deg, transparent 10%, var(--c-red) 50%, transparent 90%);
  opacity: 0.2;
}
.tp-card::after {
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
.tp-log-card {
  position: relative;
  flex: 1 1 auto;
  display: flex;
  flex-direction: column;
  min-height: 0;
  animation: tp-enter 0.5s cubic-bezier(0.25, 0.46, 0.45, 0.94) 0.15s both;
}
.tp-card-hd {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  margin-bottom: 0.55rem;
  position: relative;
  z-index: 1;
}
.tp-card-hd h2 {
  margin: 0;
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--c-tx2);
  letter-spacing: 0.04em;
  text-transform: uppercase;
}
.tp-log-ct {
  font-size: 0.7rem;
  color: var(--c-tx3);
  font-variant-numeric: tabular-nums;
  letter-spacing: 0.04em;
}
.tp-log-filters {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 0.4rem;
  margin-bottom: 0.45rem;
  position: relative;
  z-index: 1;
  flex-shrink: 0;
}
.tp-log-card > .tp-card-hd {
  flex-shrink: 0;
}
.tp-log-toggle-row {
  margin-bottom: 0.55rem;
  position: relative;
  z-index: 1;
  flex-shrink: 0;
}
.tp-btn--toggle-all {
  width: 100%;
  font-size: 0.72rem;
  padding: 0.32rem 0.55rem;
}
.tp-flt {
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
.tp-flt::after {
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
.tp-flt:hover {
  border-color: var(--c-bdr-hi);
}
.tp-flt:hover::after {
  transform: scaleX(1);
}
.tp-flt.active {
  border-color: var(--c-red-s);
  background: rgba(196, 33, 63, 0.12);
  color: #fff;
}
.tp-flt.active::after {
  transform: scaleX(1);
}

.tp-log-out {
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
.tp-log-empty {
  color: var(--c-tx3);
  padding: 2rem;
  text-align: center;
  font-size: 0.8rem;
  letter-spacing: 0.03em;
}
.tp-log-div {
  text-align: center;
  padding: 0.35rem 0;
  margin: 0.3rem 0;
}
.tp-log-div span {
  font-size: 0.64rem;
  color: var(--c-warn);
  letter-spacing: 0.08em;
  text-transform: uppercase;
  opacity: 0.5;
  padding: 0.1rem 0.6rem;
  border-top: 1px solid rgba(201, 166, 96, 0.12);
  border-bottom: 1px solid rgba(201, 166, 96, 0.12);
}
.tp-log-row {
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
.tp-log-row:hover {
  background: rgba(255, 255, 255, 0.02);
}
.tp-log-t {
  flex-shrink: 0;
  color: var(--c-tx3);
  white-space: nowrap;
  font-variant-numeric: tabular-nums;
}
.tp-log-l {
  flex-shrink: 0;
  font-weight: 700;
  white-space: nowrap;
}
.tp-log-m {
  flex: 1 1 0;
  min-width: 0;
  color: var(--c-tx);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.tp-log-row.expanded .tp-log-m {
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

.tp-log-ft {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  position: relative;
  z-index: 1;
  flex-shrink: 0;
}
.tp-log-sync {
  font-size: 0.74rem;
  color: var(--c-tx2);
  display: flex;
  align-items: center;
  gap: 0.35rem;
}
.tp-log-sync i {
  font-size: 0.62rem;
}
.tp-log-btns {
  display: flex;
  gap: 0.4rem;
}
.tp-log-btns .tp-btn:first-child {
  flex: 1;
}

@media (max-width: 1180px) {
  .tp-wrap {
    overflow-y: auto;
  }
  .tp {
    flex: none;
    min-height: auto;
    overflow: visible;
  }
  .tp-grid,
  .tp-grid--logs {
    flex: none;
    grid-template-columns: 1fr;
    grid-template-rows: auto auto;
    min-height: auto;
    align-items: start;
  }
  .tp-main {
    overflow: visible;
  }
  .tp-side {
    overflow: visible;
  }
  .tp-log-card {
    flex: none;
  }
  .tp-log-out {
    flex: none;
    min-height: 240px;
    max-height: 420px;
  }
}
@media (max-width: 720px) {
  .tp {
    padding: 0.5rem 0.625rem 1rem;
  }
  .tp-toolbar {
    flex-direction: column;
    align-items: stretch;
    gap: 0.5rem;
  }
  .tp-toolbar-left,
  .tp-toolbar-right {
    justify-content: space-between;
  }
  .tp-metrics {
    grid-template-columns: repeat(2, 1fr);
  }
  .tp-log-filters {
    grid-template-columns: repeat(2, 1fr);
  }
  .tp-log-row {
    grid-template-columns: 1fr;
    gap: 0.1rem;
  }
  .tp-test-main {
    grid-template-columns: auto minmax(0, 1fr) 1.6rem;
  }
}
</style>
