<script setup lang="ts">
import { onMounted, onUnmounted, ref, computed } from 'vue'
import Header from '../components/Header.vue'
import GlobalGlitch from '../components/GlobalGlitch.vue'
import AppFooter from '../components/AppFooter.vue'
import LogStreamPanel from '../components/LogStreamPanel.vue'
import AdminCounters from '../components/admin/AdminCounters.vue'
import AdminProjectSettings from '../components/admin/AdminProjectSettings.vue'
import AdminLogLevel from '../components/admin/AdminLogLevel.vue'
import { createComponentLogger, setLogSink, type LogEntry } from '../shared/logger'
import { createBrowserRemoteLogger } from '../shared/browserRemoteLogger'
import { postBrowserLogsRoute } from '../api/logger/browser'
import { getDashboardCountsRoute } from '../api/admin/dashboard/counts'
import { resetDashboardRoute } from '../api/admin/dashboard/reset'
import { useLogsSocket } from '../shared/useLogsSocket'

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
  panelUrl?: string
  encodedLogsSocketId?: string
}>()

const bootLoaderDone = ref(false)
const initialProjectName = props.projectTitle.split(' / ')[0] || props.projectTitle
// Зеркало значений из дочерних карточек — нужно только для status-bar страницы.
const statusProjectName = ref(initialProjectName)
const statusLogLevel = ref<'debug' | 'info' | 'warn' | 'error' | 'disable'>('info')

const errorCount = ref(0)
const warnCount = ref(0)
const dashboardResetAt = ref(0)

let browserRemoteLogger: ReturnType<typeof createBrowserRemoteLogger> | null = null

// Визуальная лог-панель (список/фильтры/загрузка/разворачивание) вынесена в отдельный компонент.
const logPanel = ref<InstanceType<typeof LogStreamPanel> | null>(null)
// Состояние загрузки истории логов внутри панели — для индикатора в стрим-пилле.
const logsLoading = computed(() => logPanel.value?.logsLoading ?? false)

function countEntry(entry: LogEntry) {
  if (entry.timestamp >= dashboardResetAt.value) {
    if (entry.severity <= 3) errorCount.value += 1
    else if (entry.severity === 4) warnCount.value += 1
  }
}

const { connected: logsWsConnected, initialized: logsWsInitialized } = useLogsSocket({
  encodedLogsSocketId: props.encodedLogsSocketId,
  onEntry: (entry) => {
    countEntry(entry)
    logPanel.value?.pushEntry(entry)
  }
})

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

const startAnimations = () => {
  bootLoaderDone.value = true
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

onMounted(() => {
  log.info('Компонент смонтирован', {
    projectTitle: props.projectTitle,
    isAuthenticated: props.isAuthenticated,
    isAdmin: props.isAdmin,
    indexUrl: props.indexUrl,
    profileUrl: props.profileUrl,
    loginUrl: props.loginUrl,
    adminUrl: props.adminUrl,
    panelUrl: props.panelUrl,
    hasEncodedLogsSocketId: !!props.encodedLogsSocketId
  })

  browserRemoteLogger = createBrowserRemoteLogger({
    post: (payload) => postBrowserLogsRoute.run(ctx, payload)
  })
  browserRemoteLogger.installConsoleAndGlobalHandlers()
  log.debug('Browser remote logger initialized')

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
  setLogSink((entry: LogEntry) => {
    countEntry(entry)
    logPanel.value?.pushEntry(entry)
    browserRemoteLogger!.pushSinkEntry(entry)
  })

  logPanel.value?.loadRecent()
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
      :panelUrl="props.panelUrl"
    />

    <main class="ap-wrap flex flex-col flex-1 relative z-10 min-h-0 w-full min-w-0 overflow-hidden">
      <div class="ap" :class="{ ready: bootLoaderDone }">
        <div class="ap-status">
          <div class="ap-status-left">
            <i class="fas fa-terminal ap-icon-muted"></i>
            <span class="ap-path">/web/admin</span>
            <span class="ap-separator">&#xB7;</span>
            <span class="ap-project-label">{{ statusProjectName || '—' }}</span>
          </div>
          <div class="ap-status-right">
            <span class="ap-status-tag"
              ><i class="fas fa-layer-group ap-icon-muted"></i> LOG:
              {{ statusLogLevel.toUpperCase() }}</span
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
            <AdminCounters
              :error-count="errorCount"
              :warn-count="warnCount"
              @reset="resetDashboard"
            />

            <div class="ap-cfg-row">
              <AdminProjectSettings
                :initial-project-name="initialProjectName"
                @update:project-name="statusProjectName = $event"
              />
              <AdminLogLevel @update:log-level="statusLogLevel = $event" />
            </div>
          </div>

          <aside class="ap-side">
            <LogStreamPanel ref="logPanel" :enable-expand-all="false" />
          </aside>
        </div>
      </div>
    </main>

    <AppFooter v-if="bootLoaderDone" @chatium-click="openChatiumLink" />
  </div>
</template>
