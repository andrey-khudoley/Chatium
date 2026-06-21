<script setup lang="ts">
import { onMounted, onBeforeUnmount, onUnmounted, ref, computed, watch } from 'vue'
import { getOrCreateBrowserSocketClient } from '@app/socket'
import Header from '../components/Header.vue'
import GlobalGlitch from '../components/GlobalGlitch.vue'
import AppFooter from '../components/AppFooter.vue'
import { getSettingRoute } from '../api/settings/get'
import { saveSettingRoute } from '../api/settings/save'
import { lavaCatalogRoute } from '../api/admin/lava/catalog'
import { getcourseVerifyRoute } from '../api/admin/getcourse/verify'
import { GC_SETTING_KEYS } from '../shared/gcSettingKeys'
import { LAVA_SETTING_KEYS } from '../shared/lavaSettingKeys'
import { normalizeLavaBaseUrlInput } from '../shared/lavaBaseUrl'
import { createComponentLogger, setLogSink, type LogEntry } from '../shared/logger'
import { getRecentLogsRoute } from '../api/admin/logs/recent'
import { getLogsBeforeRoute } from '../api/admin/logs/before'
import { getDashboardCountsRoute } from '../api/admin/dashboard/counts'
import { resetDashboardRoute } from '../api/admin/dashboard/reset'

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

const SAVE_STATUS_DURATION_MS = 1500
const INPUT_DEBOUNCE_MS = 300

const LAVA_DEFAULT_BASE_URL = 'https://gate.lava.top'

type LavaCatalogRow = {
  productId: string
  productTitle: string
  offerId: string
  offerName: string
}

const lavaApiKey = ref('')
const lavaBaseUrl = ref(LAVA_DEFAULT_BASE_URL)
const lavaCatalog = ref<LavaCatalogRow[]>([])
const lavaCatalogFetched = ref(false)
const lavaSelectedKey = ref('')
const lavaLoadError = ref('')
const lavaLoading = ref(false)
const lavaSaveError = ref('')
const lavaSaveStatus = ref<'saved' | 'error' | null>(null)
const lavaSaveStatusTimeout = { id: null as ReturnType<typeof setTimeout> | null }
const savedLavaProductId = ref('')
const savedLavaOfferId = ref('')
/** После успешного сохранения — скрываем шаг 2; сбрасывается при «Обновить каталог». */
const lavaProductOfferSaved = ref(false)
const savedLavaProductTitle = ref('')
const savedLavaOfferTitle = ref('')

/** Секрет входящего webhook Lava (`X-Api-Key`); только автогенерация + показ, поле только для чтения. */
const lavaWebhookSecret = ref('')
const lavaWebhookSecretVisible = ref(false)
const lavaWebhookSecretLoading = ref(false)
const lavaWebhookSecretError = ref('')
const lavaWebhookSecretSaveStatus = ref<'saved' | 'error' | null>(null)
const lavaWebhookSecretStatusTimeout = { id: null as ReturnType<typeof setTimeout> | null }

const lavaWebhookGenerateButtonLabel = computed(() =>
  lavaWebhookSecret.value.trim() ? 'Обновить' : 'Сгенерировать'
)

const lavaWebhookToggleVisibilityLabel = computed(() =>
  lavaWebhookSecretVisible.value ? 'Скрыть' : 'Показать'
)

function randomLavaWebhookSecretHex(): string {
  const bytes = new Uint8Array(32)
  crypto.getRandomValues(bytes)
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
}

function toggleLavaWebhookSecretVisible() {
  if (!lavaWebhookSecret.value.trim()) return
  lavaWebhookSecretVisible.value = !lavaWebhookSecretVisible.value
}

const generateOrUpdateLavaWebhookSecret = async () => {
  lavaWebhookSecretError.value = ''
  lavaWebhookSecretLoading.value = true
  try {
    const next = randomLavaWebhookSecretHex()
    const res = await saveSettingRoute.run(ctx, {
      key: LAVA_SETTING_KEYS.LAVA_WEBHOOK_SECRET,
      value: next
    })
    if (res && (res as { success?: boolean }).success === false) {
      const err = (res as { error?: string }).error || 'Ошибка сохранения'
      lavaWebhookSecretError.value = err
      showSaveStatus(lavaWebhookSecretSaveStatus, lavaWebhookSecretStatusTimeout, 'error')
      log.error('lava_webhook_secret save', err)
      return
    }
    lavaWebhookSecret.value = next
    lavaWebhookSecretVisible.value = false
    showSaveStatus(lavaWebhookSecretSaveStatus, lavaWebhookSecretStatusTimeout, 'saved')
    log.info('lava_webhook_secret сгенерирован и сохранён')
  } catch (e) {
    lavaWebhookSecretError.value = (e as Error)?.message || 'Ошибка сохранения'
    showSaveStatus(lavaWebhookSecretSaveStatus, lavaWebhookSecretStatusTimeout, 'error')
    log.error('lava_webhook_secret', e)
  } finally {
    lavaWebhookSecretLoading.value = false
  }
}

const gcApiKey = ref('')
const gcDevKey = ref('')
const gcAccountDomain = ref('')
const gcOrderFlagAddfieldId = ref('')
const gcVerifyLoading = ref(false)
const gcSaveLoading = ref(false)
const gcVerifyHint = ref('')
const gcSaveError = ref('')
const gcSaveStatus = ref<'saved' | 'error' | null>(null)
const gcSaveStatusTimeout = { id: null as ReturnType<typeof setTimeout> | null }

function lavaRowKey(row: LavaCatalogRow): string {
  return `${row.productId}::${row.offerId}`
}

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

const MAX_LOG_ENTRIES = 5000
const logEntries = ref<LogEntry[]>([])
let logsSocketSubscription: any = null
const logsOutputRef = ref<HTMLElement | null>(null)

const logsLoading = ref(false)
const logsError = ref('')
const logsHasMore = ref(false)
const oldestLogTimestamp = ref<number | null>(null)
let logsReloadRequestId = 0

const logFilters = ref({
  info: true,
  warn: true,
  error: true
})

const SERVER_LOG_BATCH_LIMIT = 200
const MAX_LOG_FETCH_ITERATIONS = 200

function activeSeveritiesFromFilters(): number[] {
  const values: number[] = []
  if (logFilters.value.error) values.push(0, 1, 2, 3)
  if (logFilters.value.warn) values.push(4)
  if (logFilters.value.info) values.push(5, 6, 7)
  return Array.from(new Set(values))
}

function severitiesQueryValue(severities: number[]): string | undefined {
  return severities.length > 0 ? severities.join(',') : undefined
}

const toggleLogFilter = async (level: 'info' | 'warn' | 'error') => {
  logFilters.value[level] = !logFilters.value[level]
  log.debug('Фильтр логов переключён', level, logFilters.value[level])
  await reloadAllLogsByCurrentFilters()
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
  }
}

function updateOldestLogTimestampFromEntries(entries: Array<LogEntry & { id?: string }>) {
  if (!entries.length) return
  const oldest = entries.reduce(
    (min, entry) => (entry.timestamp < min ? entry.timestamp : min),
    entries[0].timestamp
  )
  oldestLogTimestamp.value = oldest
}

function mergeLogEntriesUnique(nextEntries: Array<LogEntry & { id: string }>) {
  if (!nextEntries.length) return
  const existingIds = new Set(
    logEntries.value.map((entry) => (entry as LogEntry & { id?: string }).id).filter(Boolean)
  )
  const uniqueToAdd = nextEntries.filter((entry) => !existingIds.has(entry.id))
  if (!uniqueToAdd.length) return
  logEntries.value = [...logEntries.value, ...uniqueToAdd]
}

async function reloadAllLogsByCurrentFilters() {
  const requestId = ++logsReloadRequestId
  const severities = activeSeveritiesFromFilters()
  const severitiesQuery = severitiesQueryValue(severities)
  if (!severities.length) {
    logEntries.value = []
    oldestLogTimestamp.value = null
    logsHasMore.value = false
    logsError.value = ''
    return
  }

  logsLoading.value = true
  logsError.value = ''
  try {
    const entriesById = new Map<string, LogEntry & { id: string }>()
    let beforeTimestamp: number | null = null
    let iteration = 0
    let hasMore = true

    while (hasMore && iteration < MAX_LOG_FETCH_ITERATIONS) {
      if (requestId !== logsReloadRequestId) return

      const response =
        beforeTimestamp == null
          ? await getRecentLogsRoute
              .query({ limit: SERVER_LOG_BATCH_LIMIT, severities: severitiesQuery })
              .run(ctx)
          : await getLogsBeforeRoute
              .query({
                beforeTimestamp: String(beforeTimestamp),
                limit: SERVER_LOG_BATCH_LIMIT,
                severities: severitiesQuery
              })
              .run(ctx)

      const data = response as {
        success?: boolean
        entries?: Array<LogEntry & { id: string }>
        hasMore?: boolean
        error?: string
      }

      if (!data?.success || !Array.isArray(data.entries)) {
        logsError.value = data?.error || 'Ошибка загрузки логов'
        return
      }

      for (const entry of data.entries) entriesById.set(entry.id, entry)

      if (!data.entries.length) {
        hasMore = false
      } else {
        const oldestBatchTimestamp = data.entries.reduce(
          (min, entry) => (entry.timestamp < min ? entry.timestamp : min),
          data.entries[0].timestamp
        )
        beforeTimestamp = oldestBatchTimestamp
        hasMore =
          beforeTimestamp != null &&
          (data.hasMore ?? data.entries.length === SERVER_LOG_BATCH_LIMIT)
      }

      iteration += 1
    }

    if (requestId !== logsReloadRequestId) return
    logEntries.value = Array.from(entriesById.values())
    updateOldestLogTimestampFromEntries(logEntries.value as Array<LogEntry & { id?: string }>)
    trimOldLogs()
    logsHasMore.value = false
    if (iteration >= MAX_LOG_FETCH_ITERATIONS && hasMore) {
      logsError.value =
        'Достигнут лимит подгрузки истории. Уточните фильтр для более точного поиска.'
    } else {
      logsError.value = ''
    }
  } catch (e) {
    if (requestId !== logsReloadRequestId) return
    logsError.value = (e as Error)?.message || 'Ошибка сети'
    log.error('Ошибка полной загрузки логов по фильтрам', e)
  } finally {
    if (requestId === logsReloadRequestId) {
      logsLoading.value = false
    }
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

    // Показываем разделитель только если это не первый лог и дата изменилась
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

const loadLavaSettings = async () => {
  try {
    const keys: Array<{ key: string; ref: typeof lavaApiKey }> = [
      { key: LAVA_SETTING_KEYS.LAVA_API_KEY, ref: lavaApiKey },
      { key: LAVA_SETTING_KEYS.LAVA_BASE_URL, ref: lavaBaseUrl }
    ]
    for (const { key, ref } of keys) {
      const res = await getSettingRoute.query({ key }).run(ctx)
      const data = res as { success?: boolean; value?: unknown }
      if (data?.success && typeof data.value === 'string' && data.value.length > 0) {
        ref.value = data.value
      }
    }
    if (!lavaBaseUrl.value.trim()) {
      lavaBaseUrl.value = LAVA_DEFAULT_BASE_URL
    } else {
      lavaBaseUrl.value = normalizeLavaBaseUrlInput(lavaBaseUrl.value)
    }
    const whRes = await getSettingRoute
      .query({ key: LAVA_SETTING_KEYS.LAVA_WEBHOOK_SECRET })
      .run(ctx)
    const whData = whRes as { success?: boolean; value?: unknown }
    if (whData?.success && typeof whData.value === 'string' && whData.value.length > 0) {
      lavaWebhookSecret.value = whData.value
    } else {
      lavaWebhookSecret.value = ''
    }
    lavaWebhookSecretVisible.value = false
    const pidRes = await getSettingRoute.query({ key: LAVA_SETTING_KEYS.LAVA_PRODUCT_ID }).run(ctx)
    const pidData = pidRes as { success?: boolean; value?: unknown }
    if (pidData?.success && typeof pidData.value === 'string') {
      savedLavaProductId.value = pidData.value
    }
    const oidRes = await getSettingRoute.query({ key: LAVA_SETTING_KEYS.LAVA_OFFER_ID }).run(ctx)
    const oidData = oidRes as { success?: boolean; value?: unknown }
    if (oidData?.success && typeof oidData.value === 'string') {
      savedLavaOfferId.value = oidData.value
    }
    if (savedLavaProductId.value.trim() && savedLavaOfferId.value.trim()) {
      lavaProductOfferSaved.value = true
    }
  } catch (e) {
    log.warning('Не удалось загрузить настройки Lava', e)
  }
}

const loadGcSettings = async () => {
  try {
    const keyRes = await getSettingRoute.query({ key: GC_SETTING_KEYS.GC_API_KEY }).run(ctx)
    const keyData = keyRes as { success?: boolean; value?: unknown }
    if (keyData?.success && typeof keyData.value === 'string') {
      gcApiKey.value = keyData.value
    }
    const devKeyRes = await getSettingRoute.query({ key: GC_SETTING_KEYS.GC_DEV_KEY }).run(ctx)
    const devKeyData = devKeyRes as { success?: boolean; value?: unknown }
    if (devKeyData?.success && typeof devKeyData.value === 'string') {
      gcDevKey.value = devKeyData.value
    }
    const domRes = await getSettingRoute.query({ key: GC_SETTING_KEYS.GC_ACCOUNT_DOMAIN }).run(ctx)
    const domData = domRes as { success?: boolean; value?: unknown }
    if (domData?.success && typeof domData.value === 'string') {
      gcAccountDomain.value = domData.value
    }
    const addfieldRes = await getSettingRoute
      .query({ key: GC_SETTING_KEYS.GC_ORDER_FLAG_ADDFIELD_ID })
      .run(ctx)
    const addfieldData = addfieldRes as { success?: boolean; value?: unknown }
    if (addfieldData?.success && typeof addfieldData.value === 'string') {
      gcOrderFlagAddfieldId.value = addfieldData.value
    }
  } catch (e) {
    log.warning('Не удалось загрузить настройки GetCourse', e)
  }
}

const verifyGcOnly = async () => {
  gcSaveError.value = ''
  gcVerifyHint.value = ''
  gcVerifyLoading.value = true
  try {
    const res = await getcourseVerifyRoute.run(ctx, {
      gcApiKey: gcApiKey.value,
      gcAccountDomain: gcAccountDomain.value
    })
    const data = res as { success?: boolean; message?: string }
    if (data?.success) {
      gcVerifyHint.value = data.message || 'Подключение успешно.'
      log.info('GetCourse: проверка ключа', data.message)
    } else {
      gcSaveError.value = (data as { message?: string }).message || 'Проверка не пройдена'
      log.error('GetCourse: проверка ключа', gcSaveError.value)
    }
  } catch (e) {
    gcSaveError.value = (e as Error)?.message || 'Ошибка сети'
    log.error('GetCourse: проверка', e)
  } finally {
    gcVerifyLoading.value = false
  }
}

const saveGcIntegration = async () => {
  gcSaveError.value = ''
  gcVerifyHint.value = ''
  gcSaveLoading.value = true
  try {
    for (const pair of [
      { key: GC_SETTING_KEYS.GC_API_KEY, value: gcApiKey.value.trim() },
      { key: GC_SETTING_KEYS.GC_DEV_KEY, value: gcDevKey.value.trim() },
      { key: GC_SETTING_KEYS.GC_ACCOUNT_DOMAIN, value: gcAccountDomain.value.trim() },
      { key: GC_SETTING_KEYS.GC_ORDER_FLAG_ADDFIELD_ID, value: gcOrderFlagAddfieldId.value.trim() }
    ] as const) {
      const res = await saveSettingRoute.run(ctx, { key: pair.key, value: pair.value })
      if (res && (res as { success?: boolean }).success === false) {
        gcSaveError.value = (res as { error?: string }).error || 'Ошибка сохранения'
        showSaveStatus(gcSaveStatus, gcSaveStatusTimeout, 'error')
        return
      }
    }

    gcVerifyHint.value =
      'Сохранено. Ключ и домен проверены запросом к GetCourse PL API; ID доп.поля заказа сохранён в Heap.'
    showSaveStatus(gcSaveStatus, gcSaveStatusTimeout, 'saved')
    log.info('Настройки GetCourse сохранены')
  } catch (e) {
    gcSaveError.value = (e as Error)?.message || 'Ошибка сохранения'
    showSaveStatus(gcSaveStatus, gcSaveStatusTimeout, 'error')
  } finally {
    gcSaveLoading.value = false
  }
}

const loadLavaCatalog = async () => {
  lavaLoadError.value = ''
  lavaProductOfferSaved.value = false
  lavaCatalog.value = []
  lavaCatalogFetched.value = false
  lavaSelectedKey.value = ''
  lavaLoading.value = true
  try {
    const res = await lavaCatalogRoute.run(ctx, {
      lavaApiKey: lavaApiKey.value,
      lavaBaseUrl: lavaBaseUrl.value
    })
    const data = res as {
      success?: boolean
      catalog?: LavaCatalogRow[]
      message?: string
    }
    if (data?.success && Array.isArray(data.catalog)) {
      lavaCatalog.value = data.catalog
      lavaCatalogFetched.value = true
      if (savedLavaProductId.value && savedLavaOfferId.value) {
        const k = `${savedLavaProductId.value}::${savedLavaOfferId.value}`
        if (data.catalog.some((r) => lavaRowKey(r) === k)) {
          lavaSelectedKey.value = k
        }
      }
      log.info('Каталог Lava загружен', { rows: data.catalog.length })
    } else {
      lavaLoadError.value = data?.message || 'Не удалось загрузить каталог'
      log.error('Каталог Lava', lavaLoadError.value)
    }
  } catch (e) {
    lavaLoadError.value = (e as Error)?.message || 'Ошибка сети'
    log.error('Каталог Lava', e)
  } finally {
    lavaLoading.value = false
  }
}

const saveLavaIntegration = async () => {
  lavaSaveError.value = ''
  if (!lavaSelectedKey.value) {
    lavaSaveError.value = 'Выберите продукт и оффер в списке (шаг 2).'
    return
  }
  const row = lavaCatalog.value.find((r) => lavaRowKey(r) === lavaSelectedKey.value)
  if (!row) {
    lavaSaveError.value = 'Выбранная строка недоступна. Загрузите каталог снова.'
    return
  }
  const baseNorm = normalizeLavaBaseUrlInput(lavaBaseUrl.value)
  try {
    for (const pair of [
      { key: LAVA_SETTING_KEYS.LAVA_API_KEY, value: lavaApiKey.value.trim() },
      { key: LAVA_SETTING_KEYS.LAVA_BASE_URL, value: baseNorm },
      { key: LAVA_SETTING_KEYS.LAVA_PRODUCT_ID, value: row.productId },
      { key: LAVA_SETTING_KEYS.LAVA_OFFER_ID, value: row.offerId }
    ] as const) {
      const res = await saveSettingRoute.run(ctx, { key: pair.key, value: pair.value })
      if (res && (res as { success?: boolean }).success === false) {
        const err = (res as { error?: string }).error || 'Ошибка сохранения'
        lavaSaveError.value = err
        showSaveStatus(lavaSaveStatus, lavaSaveStatusTimeout, 'error')
        return
      }
    }

    const pidVerify = await getSettingRoute
      .query({ key: LAVA_SETTING_KEYS.LAVA_PRODUCT_ID })
      .run(ctx)
    const oidVerify = await getSettingRoute.query({ key: LAVA_SETTING_KEYS.LAVA_OFFER_ID }).run(ctx)
    const pidV = (pidVerify as { success?: boolean; value?: unknown })?.value
    const oidV = (oidVerify as { success?: boolean; value?: unknown })?.value
    if (pidV !== row.productId || oidV !== row.offerId) {
      lavaSaveError.value =
        'Запись в настройки не подтвердилась при чтении. Обновите страницу или повторите сохранение.'
      showSaveStatus(lavaSaveStatus, lavaSaveStatusTimeout, 'error')
      log.error('Lava save verify mismatch', { pidV, oidV, expected: [row.productId, row.offerId] })
      return
    }

    savedLavaProductId.value = row.productId
    savedLavaOfferId.value = row.offerId
    savedLavaProductTitle.value = row.productTitle
    savedLavaOfferTitle.value = row.offerName
    lavaBaseUrl.value = baseNorm
    lavaProductOfferSaved.value = true
    lavaSelectedKey.value = ''
    showSaveStatus(lavaSaveStatus, lavaSaveStatusTimeout, 'saved')
    log.info('Настройки Lava сохранены и проверены', {
      productId: row.productId,
      offerId: row.offerId
    })
  } catch (e) {
    lavaSaveError.value = (e as Error)?.message || 'Ошибка сохранения'
    showSaveStatus(lavaSaveStatus, lavaSaveStatusTimeout, 'error')
  }
}

const loadProjectName = async () => {
  try {
    const res = await getSettingRoute.query({ key: 'project_name' }).run(ctx)
    const data = res as { success?: boolean; value?: unknown }
    if (data?.success && typeof data.value === 'string') {
      const loaded = data.value
      projectName.value = loaded
      lastSavedProjectName.value = loaded
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

const saveProjectName = async () => {
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
  }
}

onMounted(() => {
  log.info('Компонент смонтирован')
  loadProjectName()
  loadLavaSettings()
  loadGcSettings()
  loadDashboardCounts()
  if (window.hideAppLoader) window.hideAppLoader()
  if (window.bootLoaderComplete) {
    startAnimations()
  } else {
    window.addEventListener('bootloader-complete', startAnimations)
  }
  const bootLevel = (window as Window & { __BOOT__?: { logLevel?: string } }).__BOOT__?.logLevel
  if (typeof bootLevel === 'string') {
    const normalized = bootLevel.toLowerCase()
    if (LOG_LEVEL_VALUES.includes(normalized as (typeof LOG_LEVEL_VALUES)[number])) {
      logLevel.value = normalized as (typeof LOG_LEVEL_VALUES)[number]
    }
  }
  setLogSink((entry: LogEntry) => {
    logEntries.value.push(entry)
    trimOldLogs()
    if (entry.timestamp >= dashboardResetAt.value) {
      if (entry.severity <= 3) errorCount.value += 1
      else if (entry.severity === 4) warnCount.value += 1
    }
  })
  if (props.encodedLogsSocketId) {
    getOrCreateBrowserSocketClient()
      .then((socketClient) => {
        logsSocketSubscription = socketClient.subscribeToData(props.encodedLogsSocketId!)
        logsSocketSubscription.listen((data: { type?: string; data?: LogEntry }) => {
          if (data?.type === 'new-log' && data.data) {
            const entry = data.data as LogEntry
            logEntries.value.push(entry)
            trimOldLogs()
            if (entry.timestamp >= dashboardResetAt.value) {
              if (entry.severity <= 3) errorCount.value += 1
              else if (entry.severity === 4) warnCount.value += 1
            }
          }
        })
      })
      .catch((err) => log.error('Не удалось подписаться на логи по WebSocket', err))
  }

  loadRecentLogs()
})

onBeforeUnmount(() => {
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
  if (lavaSaveStatusTimeout.id) {
    clearTimeout(lavaSaveStatusTimeout.id)
    lavaSaveStatusTimeout.id = null
  }
  if (gcSaveStatusTimeout.id) {
    clearTimeout(gcSaveStatusTimeout.id)
    gcSaveStatusTimeout.id = null
  }
  if (projectNameDebounceTimer.id) {
    clearTimeout(projectNameDebounceTimer.id)
    projectNameDebounceTimer.id = null
  }
})

onUnmounted(() => {
  log.info('Компонент размонтирован')
  setLogSink(null)
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
      mergeLogEntriesUnique(data.entries)
      updateOldestLogTimestampFromEntries(logEntries.value as Array<LogEntry & { id?: string }>)
      logsHasMore.value = data.entries.length === 50
      log.info('Последние логи загружены', { count: data.entries.length })
    } else {
      logsError.value = data?.error || 'Ошибка загрузки логов'
      log.error('Ошибка загрузки логов', logsError.value)
    }
  } catch (e) {
    logsError.value = (e as Error)?.message || 'Ошибка сети'
    log.error('Ошибка загрузки логов', e)
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
  const severities = activeSeveritiesFromFilters()
  const severitiesQuery = severitiesQueryValue(severities)
  try {
    const res = await getLogsBeforeRoute
      .query({
        beforeTimestamp: String(oldestLogTimestamp.value),
        limit: 50,
        severities: severitiesQuery
      })
      .run(ctx)
    const data = res as {
      success?: boolean
      entries?: Array<LogEntry & { id: string }>
      hasMore?: boolean
      error?: string
    }
    if (data?.success && Array.isArray(data.entries)) {
      mergeLogEntriesUnique(data.entries)
      updateOldestLogTimestampFromEntries(logEntries.value as Array<LogEntry & { id?: string }>)
      logsHasMore.value = data.hasMore ?? data.entries.length === 50
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
  log.debug('Логи очищены, таймштамп сдвинут на текущий — «Загрузить ещё 50» восстановит последние')
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
        <section class="admin-section" :class="{ 'admin-visible': bootLoaderDone }">
          <div class="admin-header">
            <div class="admin-icon-wrapper">
              <i class="fas fa-cog admin-icon"></i>
            </div>
            <h1 class="admin-heading">Панель администратора</h1>
            <p class="admin-description">Управление логированием и мониторинг системы</p>
          </div>

          <!-- Dashboard -->
          <div class="admin-card">
            <div class="admin-card-header">
              <i class="fas fa-bars admin-card-icon dashboard-card-icon"></i>
              <h2 class="admin-card-title">Дашборд</h2>
              <button
                type="button"
                class="dashboard-reset"
                title="Сбросить счётчики"
                @click="resetDashboard"
              >
                <i class="fas fa-sync-alt dashboard-reset-icon"></i>
                Сбросить
              </button>
            </div>
            <div class="dashboard-stats">
              <div class="dashboard-stat stat-errors">
                <i class="fas fa-exclamation-circle stat-icon"></i>
                <div class="stat-content">
                  <span class="stat-value">{{ errorCount }}</span>
                  <span class="stat-label">Ошибок</span>
                </div>
              </div>
              <div class="dashboard-stat stat-warnings">
                <i class="fas fa-exclamation-triangle stat-icon"></i>
                <div class="stat-content">
                  <span class="stat-value">{{ warnCount }}</span>
                  <span class="stat-label">Предупреждений</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Project Settings -->
          <div class="admin-card">
            <span
              v-if="projectNameSaveStatus"
              class="admin-card-status"
              :class="projectNameSaveStatus === 'saved' ? 'status-saved' : 'status-error'"
            >
              {{ projectNameSaveStatus === 'saved' ? 'Сохранено' : 'Ошибка' }}
            </span>
            <div class="admin-card-header">
              <i class="fas fa-wrench admin-card-icon"></i>
              <h2 class="admin-card-title">Настройки проекта</h2>
            </div>
            <div class="settings-form">
              <div class="settings-field">
                <label class="settings-label" for="project-name">Название проекта</label>
                <input id="project-name" v-model="projectName" type="text" class="settings-input" />
              </div>
            </div>
            <p v-if="projectNameError" class="admin-card-error">{{ projectNameError }}</p>
          </div>

          <!-- Lava.top: ключ, URL, каталог продуктов -->
          <div class="admin-card lava-settings-card">
            <span
              v-if="lavaSaveStatus"
              class="admin-card-status"
              :class="lavaSaveStatus === 'saved' ? 'status-saved' : 'status-error'"
            >
              {{ lavaSaveStatus === 'saved' ? 'Сохранено' : 'Ошибка' }}
            </span>
            <div class="admin-card-header">
              <i class="fas fa-plug admin-card-icon"></i>
              <h2 class="admin-card-title">Интеграция Lava.top</h2>
            </div>
            <p class="lava-settings-hint">
              Шаг 1: укажите API-ключ и базовый URL (по умолчанию gate.lava.top). Затем обновите
              каталог, выберите продукт и оффер и сохраните. После сохранения список скрывается —
              для смены выбора снова нажмите «Обновить продукты и офферы».
            </p>
            <div class="settings-form">
              <div class="settings-field">
                <label class="settings-label" for="lava-api-key">LAVA_API_KEY</label>
                <input
                  id="lava-api-key"
                  v-model="lavaApiKey"
                  type="password"
                  autocomplete="off"
                  class="settings-input"
                  placeholder="Секретный ключ из кабинета Lava"
                />
              </div>
              <div class="settings-field">
                <label class="settings-label" for="lava-base-url">LAVA_BASE_URL</label>
                <input
                  id="lava-base-url"
                  v-model="lavaBaseUrl"
                  type="text"
                  class="settings-input"
                  placeholder="https://gate.lava.top"
                />
              </div>
              <div class="settings-field lava-webhook-secret-field">
                <label class="settings-label" for="lava-webhook-secret">{{
                  LAVA_SETTING_KEYS.LAVA_WEBHOOK_SECRET
                }}</label>
                <p class="lava-webhook-secret-hint">
                  Заголовок <code class="lava-inline-code">X-Api-Key</code> при POST на URL webhook
                  в Chatium. Укажите тот же секрет в кабинете Lava. Генерация — 64 hex-символа (256
                  бит энтропии).
                </p>
                <div class="lava-webhook-secret-controls">
                  <input
                    id="lava-webhook-secret"
                    v-model="lavaWebhookSecret"
                    readonly
                    tabindex="-1"
                    :type="lavaWebhookSecretVisible ? 'text' : 'password'"
                    class="settings-input lava-webhook-secret-input"
                    placeholder="Ещё не сгенерирован"
                    autocomplete="off"
                    spellcheck="false"
                  />
                  <div class="lava-webhook-secret-buttons">
                    <button
                      type="button"
                      class="lava-secondary-btn"
                      :disabled="!lavaWebhookSecret.trim()"
                      @click="toggleLavaWebhookSecretVisible"
                    >
                      {{ lavaWebhookToggleVisibilityLabel }}
                    </button>
                    <button
                      type="button"
                      class="lava-primary-btn lava-webhook-gen-btn"
                      :disabled="lavaWebhookSecretLoading"
                      @click="generateOrUpdateLavaWebhookSecret"
                    >
                      <i v-if="lavaWebhookSecretLoading" class="fas fa-spinner fa-spin" />
                      <i v-else class="fas fa-key" />
                      {{ lavaWebhookGenerateButtonLabel }}
                    </button>
                  </div>
                </div>
                <span
                  v-if="lavaWebhookSecretSaveStatus === 'saved'"
                  class="lava-webhook-secret-status lava-webhook-secret-status--ok"
                  >Сохранено в Heap</span
                >
                <span
                  v-else-if="lavaWebhookSecretSaveStatus === 'error'"
                  class="lava-webhook-secret-status lava-webhook-secret-status--err"
                  >Ошибка</span
                >
                <p v-if="lavaWebhookSecretError" class="admin-card-error">
                  {{ lavaWebhookSecretError }}
                </p>
              </div>
              <div class="lava-step-actions">
                <button
                  type="button"
                  class="lava-primary-btn"
                  :disabled="lavaLoading || !lavaApiKey.trim()"
                  @click="loadLavaCatalog"
                >
                  <i v-if="lavaLoading" class="fas fa-spinner fa-spin"></i>
                  <i v-else class="fas fa-sync-alt"></i>
                  Обновить продукты и офферы
                </button>
              </div>
            </div>
            <p v-if="lavaLoadError" class="admin-card-error">{{ lavaLoadError }}</p>

            <div v-if="lavaProductOfferSaved" class="lava-saved-summary">
              <i class="fas fa-check-circle lava-saved-icon"></i>
              <div class="lava-saved-summary-text">
                <span class="lava-saved-label">В настройках сохранены продукт и оффер.</span>
                <span v-if="savedLavaProductTitle || savedLavaOfferTitle" class="lava-saved-titles">
                  {{ savedLavaProductTitle || '—' }} — {{ savedLavaOfferTitle || '—' }}
                </span>
                <code class="lava-saved-code"
                  >{{ savedLavaProductId }} / {{ savedLavaOfferId }}</code
                >
              </div>
            </div>

            <div v-if="lavaCatalog.length > 0 && !lavaProductOfferSaved" class="lava-catalog-block">
              <h3 class="lava-catalog-title">Шаг 2 — выбор продукта и оффера</h3>
              <div class="lava-catalog-list custom-scrollbar">
                <label
                  v-for="row in lavaCatalog"
                  :key="lavaRowKey(row)"
                  class="lava-catalog-row"
                  :class="{ 'lava-catalog-row--selected': lavaSelectedKey === lavaRowKey(row) }"
                >
                  <input
                    v-model="lavaSelectedKey"
                    type="radio"
                    class="lava-catalog-input"
                    :value="lavaRowKey(row)"
                  />
                  <span class="lava-catalog-indicator" aria-hidden="true" />
                  <span class="lava-catalog-text">
                    <span class="lava-catalog-line">
                      <span class="lava-catalog-product">{{
                        row.productTitle || row.productId
                      }}</span>
                      <span class="lava-catalog-sep"> — </span>
                      <span class="lava-catalog-offer">{{ row.offerName || row.offerId }}</span>
                    </span>
                    <span class="lava-catalog-ids">{{ row.productId }} / {{ row.offerId }}</span>
                  </span>
                </label>
              </div>
              <div class="lava-step-actions">
                <button
                  type="button"
                  class="lava-primary-btn"
                  :disabled="!lavaSelectedKey"
                  @click="saveLavaIntegration"
                >
                  <i class="fas fa-save"></i>
                  Сохранить продукт и оффер в настройки
                </button>
              </div>
            </div>
            <p
              v-else-if="lavaCatalogFetched && lavaCatalog.length === 0 && !lavaLoadError"
              class="lava-catalog-empty"
            >
              В ответе Lava нет продуктов с офферами. Проверьте ключ и кабинет Lava.
            </p>
            <p v-if="lavaSaveError" class="admin-card-error">{{ lavaSaveError }}</p>
          </div>

          <!-- GetCourse PL API -->
          <div class="admin-card gc-settings-card">
            <span
              v-if="gcSaveStatus"
              class="admin-card-status"
              :class="gcSaveStatus === 'saved' ? 'status-saved' : 'status-error'"
            >
              {{ gcSaveStatus === 'saved' ? 'Сохранено' : 'Ошибка' }}
            </span>
            <div class="admin-card-header">
              <i class="fas fa-graduation-cap admin-card-icon"></i>
              <h2 class="admin-card-title">Интеграция GetCourse (PL API)</h2>
            </div>
            <p class="lava-settings-hint">
              Ключ школы (Import API) и ключ разработчика (REST API v1) из настроек GetCourse, а
              также домен аккаунта (формат:
              <code class="lava-saved-code">school.getcourse.ru</code> или кастомный хост без
              <code class="lava-saved-code">https://</code>). Ключ разработчика нужен для получения
              данных заказа и пользователя через API v1. Перед сохранением выполняется проверка
              подключения.
            </p>
            <div class="settings-form">
              <div class="settings-field">
                <label class="settings-label" for="gc-api-key">{{
                  GC_SETTING_KEYS.GC_API_KEY
                }}</label>
                <input
                  id="gc-api-key"
                  v-model="gcApiKey"
                  type="password"
                  autocomplete="off"
                  class="settings-input"
                  placeholder="Секретный ключ Import API (ключ школы)"
                />
              </div>
              <div class="settings-field">
                <label class="settings-label" for="gc-dev-key">{{
                  GC_SETTING_KEYS.GC_DEV_KEY
                }}</label>
                <input
                  id="gc-dev-key"
                  v-model="gcDevKey"
                  type="password"
                  autocomplete="off"
                  class="settings-input"
                  placeholder="Ключ разработчика (REST API v1)"
                />
              </div>
              <div class="settings-field">
                <label class="settings-label" for="gc-account-domain">{{
                  GC_SETTING_KEYS.GC_ACCOUNT_DOMAIN
                }}</label>
                <input
                  id="gc-account-domain"
                  v-model="gcAccountDomain"
                  type="text"
                  class="settings-input"
                  placeholder="school.getcourse.ru"
                />
              </div>
              <div class="settings-field">
                <label class="settings-label" for="gc-order-flag-addfield-id">{{
                  GC_SETTING_KEYS.GC_ORDER_FLAG_ADDFIELD_ID
                }}</label>
                <input
                  id="gc-order-flag-addfield-id"
                  v-model="gcOrderFlagAddfieldId"
                  type="text"
                  class="settings-input"
                  placeholder="ID доп. поля заказа в GetCourse (boolean=true)"
                />
              </div>
              <div class="lava-step-actions gc-actions">
                <button
                  type="button"
                  class="lava-primary-btn gc-secondary-btn"
                  :disabled="gcVerifyLoading || !gcApiKey.trim() || !gcAccountDomain.trim()"
                  @click="verifyGcOnly"
                >
                  <i v-if="gcVerifyLoading" class="fas fa-spinner fa-spin"></i>
                  <i v-else class="fas fa-plug"></i>
                  Проверить подключение
                </button>
                <button
                  type="button"
                  class="lava-primary-btn"
                  :disabled="
                    gcSaveLoading ||
                    !gcApiKey.trim() ||
                    !gcAccountDomain.trim() ||
                    !gcOrderFlagAddfieldId.trim()
                  "
                  @click="saveGcIntegration"
                >
                  <i v-if="gcSaveLoading" class="fas fa-spinner fa-spin"></i>
                  <i v-else class="fas fa-save"></i>
                  Сохранить в настройки
                </button>
              </div>
            </div>
            <p v-if="gcVerifyHint && !gcSaveError" class="gc-verify-ok">{{ gcVerifyHint }}</p>
            <p v-if="gcSaveError" class="admin-card-error">{{ gcSaveError }}</p>
          </div>

          <!-- Logging Level -->
          <div class="admin-card">
            <span
              v-if="logLevelSaveStatus"
              class="admin-card-status"
              :class="logLevelSaveStatus === 'saved' ? 'status-saved' : 'status-error'"
            >
              {{ logLevelSaveStatus === 'saved' ? 'Сохранено' : 'Ошибка' }}
            </span>
            <div class="admin-card-header">
              <i class="fas fa-sliders-h admin-card-icon"></i>
              <h2 class="admin-card-title">Уровень логирования</h2>
            </div>
            <div class="log-level-buttons">
              <button
                type="button"
                class="log-level-btn"
                :class="{ active: logLevel === 'debug' }"
                @click="setLogLevel('debug')"
              >
                Debug
              </button>
              <button
                type="button"
                class="log-level-btn"
                :class="{ active: logLevel === 'info' }"
                @click="setLogLevel('info')"
              >
                Info
              </button>
              <button
                type="button"
                class="log-level-btn"
                :class="{ active: logLevel === 'warn' }"
                @click="setLogLevel('warn')"
              >
                Warn
              </button>
              <button
                type="button"
                class="log-level-btn"
                :class="{ active: logLevel === 'error' }"
                @click="setLogLevel('error')"
              >
                Error
              </button>
              <button
                type="button"
                class="log-level-btn"
                :class="{ active: logLevel === 'disable' }"
                @click="setLogLevel('disable')"
              >
                Disable
              </button>
            </div>
            <p v-if="logLevelError" class="admin-card-error">{{ logLevelError }}</p>
          </div>

          <!-- Logs Output -->
          <div class="admin-card logs-card">
            <div class="admin-card-header">
              <i class="fas fa-terminal admin-card-icon"></i>
              <h2 class="admin-card-title">Логи</h2>
            </div>
            <div class="logs-filters">
              <button
                type="button"
                class="log-filter-chip chip-info"
                :class="{ active: logFilters.info }"
                @click="toggleLogFilter('info')"
              >
                <i class="fas fa-info-circle"></i>
                Info
              </button>
              <button
                type="button"
                class="log-filter-chip chip-warn"
                :class="{ active: logFilters.warn }"
                @click="toggleLogFilter('warn')"
              >
                <i class="fas fa-exclamation-triangle"></i>
                Warn
              </button>
              <button
                type="button"
                class="log-filter-chip chip-error"
                :class="{ active: logFilters.error }"
                @click="toggleLogFilter('error')"
              >
                <i class="fas fa-exclamation-circle"></i>
                Error
              </button>
            </div>
            <div class="logs-output custom-scrollbar" ref="logsOutputRef">
              <div v-if="displayedLogs.length === 0" class="logs-empty">Логи появятся здесь...</div>
              <div v-for="(item, index) in displayedLogs" :key="index" class="log-item">
                <div v-if="item.type === 'divider'" class="log-date-divider">
                  --- {{ item.date }} ---
                </div>
                <div v-else class="log-entry">
                  <span class="log-time">{{ item.formattedTime }}</span>
                  <span class="log-level" :class="`log-level-${item.entry.level}`">
                    [{{ item.entry.level.toUpperCase() }}]
                  </span>
                  <span class="log-message">{{ item.formattedMessage }}</span>
                </div>
              </div>
            </div>
            <div class="logs-actions">
              <div v-if="logsLoading" class="logs-loading">
                <i class="fas fa-spinner fa-spin"></i>
                Загрузка логов...
              </div>
              <p v-if="logsError" class="logs-error">{{ logsError }}</p>
              <div class="logs-action-row">
                <button
                  v-if="logsHasMore && !logsLoading"
                  type="button"
                  class="load-more-btn"
                  @click="loadMoreLogs"
                >
                  <i class="fas fa-arrow-down"></i>
                  Загрузить ещё 50
                </button>
                <button
                  type="button"
                  class="logs-clear-btn"
                  title="Очистить логи"
                  @click="clearLogs"
                >
                  <i class="fas fa-trash-alt"></i>
                </button>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>

    <AppFooter v-if="bootLoaderDone" />
  </div>
</template>

<style>
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
</style>

<style scoped>
.admin-section {
  opacity: 0;
  transform: translateY(20px);
  transition:
    opacity 0.6s ease,
    transform 0.6s ease;
}

.admin-section.admin-visible {
  opacity: 1;
  transform: translateY(0);
}

.admin-header {
  text-align: center;
  margin-bottom: 2.5rem;
}

.admin-icon-wrapper {
  width: 4rem;
  height: 4rem;
  margin: 0 auto 1.25rem;
  background: linear-gradient(135deg, var(--color-accent) 0%, var(--color-accent-hover) 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow:
    0 6px 20px rgba(211, 35, 75, 0.35),
    0 0 24px rgba(211, 35, 75, 0.15);
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
  position: relative;
  overflow: hidden;
}

.admin-icon-wrapper::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: repeating-linear-gradient(
    0deg,
    rgba(0, 0, 0, 0.15) 0px,
    rgba(0, 0, 0, 0.15) 1px,
    transparent 1px,
    transparent 3px
  );
  pointer-events: none;
  z-index: 2;
  animation: admin-scanline-flicker 8s linear infinite;
}

@keyframes admin-scanline-flicker {
  0%,
  100% {
    opacity: 0.7;
  }
  50% {
    opacity: 0.5;
  }
}

.admin-icon {
  font-size: 1.5rem;
  color: #fff;
}

.admin-heading {
  font-size: 2rem;
  font-weight: 600;
  color: var(--color-text);
  margin: 0 0 0.5rem 0;
  letter-spacing: 0.05em;
}

.admin-description {
  color: var(--color-text-secondary);
  font-size: 0.95rem;
  margin: 0;
}

/* Admin Cards */
.admin-card {
  background: linear-gradient(135deg, var(--color-bg-secondary) 0%, var(--color-bg-tertiary) 100%);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  padding: 1.5rem;
  margin-bottom: 1.5rem;
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.35);
  position: relative;
  overflow: hidden;
}

.admin-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 1px;
  background: linear-gradient(90deg, transparent, var(--color-accent), transparent);
}

.admin-card-header {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 1.25rem;
  flex-wrap: wrap;
}

.admin-card-icon {
  color: var(--color-accent);
  font-size: 1rem;
}

.admin-card-title {
  font-size: 1.1rem;
  font-weight: 600;
  color: var(--color-text);
  margin: 0;
  flex: 1;
}

/* Log Level Buttons */
.log-level-buttons {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.log-level-btn {
  padding: 0.5rem 1rem;
  font-family: inherit;
  font-size: 0.9rem;
  color: var(--color-text-secondary);
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid var(--color-border);
  cursor: pointer;
  transition: all 0.2s ease;
  letter-spacing: 0.05em;
}

.log-level-btn:hover {
  color: var(--color-text);
  border-color: var(--color-border-light);
  background: rgba(255, 255, 255, 0.05);
}

.log-level-btn.active {
  color: #fff;
  background: var(--color-accent);
  border-color: var(--color-accent);
  box-shadow: 0 0 12px rgba(211, 35, 75, 0.3);
}

.admin-card-error {
  margin: 0.75rem 0 0;
  font-size: 0.85rem;
  color: #e74c3c;
}

.admin-card-status {
  position: absolute;
  top: 1rem;
  right: 1rem;
  font-size: 0.85rem;
  font-weight: 500;
  letter-spacing: 0.04em;
  animation: statusFadeIn 0.2s ease;
}

.admin-card-status.status-saved {
  color: #27ae60;
}

.admin-card-status.status-error {
  color: #e74c3c;
}

@keyframes statusFadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

/* Project Settings */
.settings-form {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.settings-field {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.settings-label {
  font-size: 0.85rem;
  color: var(--color-text-secondary);
  letter-spacing: 0.04em;
}

.settings-input {
  padding: 0.6rem 0.9rem;
  font-family: inherit;
  font-size: 0.95rem;
  color: var(--color-text);
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid var(--color-border);
  border-radius: 4px;
  transition: border-color 0.2s ease;
}

.settings-input:focus {
  outline: none;
  border-color: var(--color-accent);
}

.settings-input:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

/* Dashboard */
.dashboard-card-icon {
  color: var(--color-accent);
}

.dashboard-reset {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0.9rem;
  font-family: inherit;
  font-size: 0.85rem;
  color: var(--color-text-secondary);
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid var(--color-border-light);
  border-radius: 6px;
  cursor: pointer;
  transition:
    color 0.2s ease,
    background 0.2s ease,
    border-color 0.2s ease;
  letter-spacing: 0.04em;
}

.dashboard-reset:hover {
  color: var(--color-text);
  background: rgba(255, 255, 255, 0.08);
  border-color: var(--color-border);
}

.dashboard-reset-icon {
  font-size: 0.8rem;
  opacity: 0.9;
}

.dashboard-stats {
  display: flex;
  gap: 1rem;
}

.dashboard-stat {
  flex: 1 1 0;
  min-width: 0;
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  padding: 1rem 1.25rem;
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid var(--color-border-light);
  border-radius: 6px;
}

.dashboard-stat .stat-icon {
  flex-shrink: 0;
  margin-top: 0.15rem;
}

.dashboard-stat .stat-content {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.dashboard-stat .stat-value {
  font-size: 1.5rem;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  line-height: 1.2;
}

.dashboard-stat .stat-label {
  font-size: 0.85rem;
  color: var(--color-text-secondary);
  line-height: 1.2;
}

.stat-icon {
  font-size: 1.25rem;
  opacity: 0.6;
}

.stat-errors .stat-value,
.stat-errors .stat-icon {
  color: #e74c3c;
}

.stat-warnings .stat-value,
.stat-warnings .stat-icon {
  color: #f39c12;
}

/* Logs Output */
.logs-card {
  margin-bottom: 0;
}

.logs-filters {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-bottom: 1rem;
}

.log-filter-chip {
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

.log-filter-chip:hover {
  color: var(--color-text-secondary);
  border-color: var(--color-border-light);
  background: rgba(255, 255, 255, 0.05);
}

.log-filter-chip.active {
  color: var(--color-text);
}

.log-filter-chip i {
  font-size: 0.75rem;
  opacity: 0.9;
}

.log-filter-chip.chip-info.active {
  border-color: #3498db;
  background: rgba(52, 152, 219, 0.12);
}

.log-filter-chip.chip-info.active i {
  color: #3498db;
}

.log-filter-chip.chip-warn.active {
  border-color: #f39c12;
  background: rgba(243, 156, 18, 0.12);
}

.log-filter-chip.chip-warn.active i {
  color: #f39c12;
}

.log-filter-chip.chip-error.active {
  border-color: #e74c3c;
  background: rgba(231, 76, 60, 0.12);
}

.log-filter-chip.chip-error.active i {
  color: #e74c3c;
}

.logs-output {
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

.logs-empty {
  color: var(--color-text-secondary);
  text-align: center;
  padding: 2rem;
}

.log-item {
  margin-bottom: 0;
}

.log-date-divider {
  text-align: center;
  color: #555;
  font-size: 0.75rem;
  padding: 0.5rem 0;
  margin: 0.5rem 0;
  opacity: 0.7;
  letter-spacing: 0.1em;
}

.log-entry {
  display: flex;
  gap: 0.5rem;
  padding: 0.15rem 0;
  line-height: 1.4;
}

.log-time {
  color: var(--color-text-tertiary);
  flex-shrink: 0;
}

.log-level {
  flex-shrink: 0;
  font-weight: 600;
}

.log-level-debug {
  color: #9b59b6;
}

.log-level-info {
  color: #3498db;
}

.log-level-notice {
  color: #1abc9c;
}

.log-level-warning {
  color: #f39c12;
}

.log-level-error {
  color: #e74c3c;
}

.log-level-critical {
  color: #c0392b;
}

.log-level-alert {
  color: #e67e22;
}

.log-level-emergency {
  color: #d35400;
}

.log-message {
  color: var(--color-text-secondary);
  word-break: break-word;
  flex: 1;
  min-width: 0;
}

.logs-actions {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  margin-top: 1rem;
}

.logs-action-row {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 0.5rem;
  width: 100%;
}

.logs-action-row .load-more-btn {
  flex: 1;
  min-width: 0;
  margin-right: auto;
}

.logs-clear-btn {
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

.logs-clear-btn:hover {
  color: #fff;
  background: #e74c3c;
  border-color: #e74c3c;
  box-shadow: 0 0 12px rgba(231, 76, 60, 0.3);
}

.logs-loading {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.85rem;
  color: var(--color-text-secondary);
  padding: 0.5rem 0;
}

.logs-loading i {
  color: var(--color-accent);
}

.logs-error {
  font-size: 0.85rem;
  color: #e74c3c;
  margin: 0;
  padding: 0.5rem 0.75rem;
  background: rgba(231, 76, 60, 0.1);
  border: 1px solid rgba(231, 76, 60, 0.3);
  border-radius: 4px;
}

.load-more-btn {
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

.load-more-btn:hover {
  color: #fff;
  background: var(--color-accent);
  border-color: var(--color-accent);
  box-shadow: 0 0 12px rgba(211, 35, 75, 0.3);
}

.load-more-btn i {
  font-size: 0.85rem;
}

.lava-settings-hint {
  margin: 0 0 1rem;
  font-size: 0.85rem;
  color: var(--color-text-secondary);
  line-height: 1.45;
}

.lava-step-actions {
  margin-top: 0.5rem;
}

.lava-webhook-secret-field {
  margin-top: 0.75rem;
  padding-top: 0.75rem;
  border-top: 1px solid var(--color-border-light);
}

.lava-webhook-secret-hint {
  margin: 0 0 0.5rem;
  font-size: 0.8rem;
  color: var(--color-text-secondary);
  line-height: 1.45;
}

.lava-inline-code {
  font-family: 'Share Tech Mono', ui-monospace, monospace;
  font-size: 0.82em;
  padding: 0.1em 0.35em;
  background: rgba(0, 0, 0, 0.25);
  border-radius: 3px;
}

.lava-webhook-secret-controls {
  display: flex;
  flex-direction: column;
  gap: 0.55rem;
}

.lava-webhook-secret-input {
  font-family: 'Share Tech Mono', ui-monospace, monospace;
  font-size: 0.8rem;
}

.lava-webhook-secret-buttons {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.5rem;
}

.lava-secondary-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  padding: 0.5rem 0.85rem;
  font-family: inherit;
  font-size: 0.85rem;
  color: var(--color-text);
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid var(--color-border);
  border-radius: 4px;
  cursor: pointer;
  letter-spacing: 0.03em;
  transition:
    background 0.18s ease,
    border-color 0.18s ease;
}

.lava-secondary-btn:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.1);
  border-color: var(--color-text-secondary);
}

.lava-secondary-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.lava-webhook-gen-btn {
  min-height: 2.35rem;
}

.lava-webhook-secret-status {
  display: inline-block;
  margin-top: 0.35rem;
  font-size: 0.78rem;
}

.lava-webhook-secret-status--ok {
  color: #4ade80;
}

.lava-webhook-secret-status--err {
  color: #f87171;
}

.lava-primary-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.55rem 1rem;
  font-family: inherit;
  font-size: 0.9rem;
  color: #fff;
  background: var(--color-accent);
  border: 1px solid var(--color-accent);
  border-radius: 4px;
  cursor: pointer;
  letter-spacing: 0.04em;
  transition:
    opacity 0.2s ease,
    box-shadow 0.2s ease;
}

.lava-primary-btn:hover:not(:disabled) {
  box-shadow: 0 0 14px rgba(211, 35, 75, 0.35);
}

.lava-primary-btn:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.lava-catalog-block {
  margin-top: 1.25rem;
  padding-top: 1rem;
  border-top: 1px solid var(--color-border-light);
}

.lava-catalog-title {
  margin: 0 0 0.75rem;
  font-size: 0.95rem;
  font-weight: 600;
  color: var(--color-text);
}

.lava-catalog-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  max-height: 280px;
  overflow: auto;
  margin-bottom: 1rem;
  padding: 0.6rem;
  background: rgba(0, 0, 0, 0.22);
  border: 1px solid var(--color-border);
  border-radius: 8px;
}

.lava-catalog-row {
  position: relative;
  display: grid;
  grid-template-columns: auto 1fr;
  grid-template-rows: auto;
  column-gap: 0.85rem;
  align-items: flex-start;
  margin: 0;
  padding: 0.85rem 1rem;
  cursor: pointer;
  border-radius: 8px;
  border: 1px solid var(--color-border);
  background: rgba(255, 255, 255, 0.02);
  transition:
    border-color 0.18s ease,
    background 0.18s ease,
    box-shadow 0.18s ease;
}

.lava-catalog-row:hover {
  border-color: var(--color-border-light);
  background: rgba(255, 255, 255, 0.05);
}

.lava-catalog-row--selected {
  border-color: var(--color-accent);
  background: rgba(211, 35, 75, 0.09);
  box-shadow: 0 0 0 1px rgba(211, 35, 75, 0.35);
}

.lava-catalog-row:focus-within {
  outline: none;
  box-shadow: 0 0 0 2px rgba(211, 35, 75, 0.45);
}

.lava-catalog-row--selected:focus-within {
  box-shadow:
    0 0 0 1px rgba(211, 35, 75, 0.45),
    0 0 0 3px rgba(211, 35, 75, 0.2);
}

/* скрытый нативный radio — клик по карточке переключает */
.lava-catalog-input {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
  opacity: 0;
}

.lava-catalog-indicator {
  grid-column: 1;
  grid-row: 1;
  width: 1.25rem;
  height: 1.25rem;
  margin-top: 0.12rem;
  flex-shrink: 0;
  border-radius: 50%;
  border: 2px solid var(--color-border-light);
  background: transparent;
  transition:
    border-color 0.18s ease,
    background 0.18s ease,
    box-shadow 0.18s ease;
  position: relative;
}

.lava-catalog-row:hover .lava-catalog-indicator {
  border-color: rgba(211, 35, 75, 0.55);
}

.lava-catalog-row--selected .lava-catalog-indicator {
  border-color: var(--color-accent);
  background: var(--color-accent);
  box-shadow: inset 0 0 0 3px rgba(10, 10, 10, 0.85);
}

.lava-catalog-text {
  grid-column: 2;
  grid-row: 1;
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  font-size: 0.88rem;
  line-height: 1.4;
  min-width: 0;
}

.lava-catalog-product {
  color: var(--color-text);
  font-weight: 500;
}

.lava-catalog-line {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 0.15rem;
}

.lava-catalog-offer {
  color: var(--color-text-secondary);
}

.lava-catalog-ids {
  font-size: 0.75rem;
  color: var(--color-text-tertiary);
  word-break: break-all;
}

.lava-catalog-empty {
  margin: 0.75rem 0 0;
  font-size: 0.85rem;
  color: var(--color-text-secondary);
}

.lava-saved-summary {
  display: flex;
  align-items: flex-start;
  gap: 0.65rem;
  margin-top: 1rem;
  padding: 0.85rem 1rem;
  background: rgba(39, 174, 96, 0.1);
  border: 1px solid rgba(39, 174, 96, 0.35);
  border-radius: 6px;
  font-size: 0.88rem;
  line-height: 1.45;
}

.lava-saved-icon {
  color: #27ae60;
  margin-top: 0.1rem;
  flex-shrink: 0;
}

.lava-saved-summary-text {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  min-width: 0;
}

.lava-saved-label {
  color: var(--color-text);
  font-weight: 500;
}

.lava-saved-titles {
  color: var(--color-text-secondary);
}

.lava-saved-code {
  font-size: 0.78rem;
  color: var(--color-text-tertiary);
  word-break: break-all;
}

.gc-settings-card .lava-saved-code {
  font-size: 0.8rem;
}

.gc-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  align-items: center;
}

.gc-secondary-btn {
  background: rgba(255, 255, 255, 0.06);
  border-color: var(--color-border-light);
  color: var(--color-text);
}

.gc-secondary-btn:hover:not(:disabled) {
  border-color: var(--color-accent);
  box-shadow: none;
}

.gc-verify-ok {
  margin: 0.75rem 0 0;
  font-size: 0.85rem;
  color: #27ae60;
  line-height: 1.45;
}

@media (max-width: 768px) {
  .admin-heading {
    font-size: 1.6rem;
  }

  .admin-card {
    padding: 1.25rem;
  }

  .dashboard-stat {
    min-width: 100%;
  }
}
</style>
