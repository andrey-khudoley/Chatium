<script setup lang="ts">
import { onMounted, onUnmounted, ref, computed } from 'vue'
import Header from '../components/Header.vue'
import GlobalGlitch from '../components/GlobalGlitch.vue'
import AppFooter from '../components/AppFooter.vue'
import AdminCounters from '../components/admin/AdminCounters.vue'
import AdminSettings from '../components/admin/AdminSettings.vue'
import AdminGetcourseSettings from '../components/admin/AdminGetcourseSettings.vue'
import AdminWheelSettings from '../components/admin/AdminWheelSettings.vue'
import AdminSegments from '../components/admin/AdminSegments.vue'
import AdminBackup from '../components/admin/AdminBackup.vue'
import AdminLogMonitor from '../components/admin/AdminLogMonitor.vue'
import { createComponentLogger, type LogEntry } from '../shared/logger'
import { useLogStream } from '../shared/useLogStream'
import { useRemoteLogging } from '../shared/useRemoteLogging'
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
  themeOptions?: { id: string; name: string }[]
  winnersUrl?: string
}>()

const bootLoaderDone = ref(false)
const startAnimations = () => {
  bootLoaderDone.value = true
}

// Значения для статус-бара (зеркалят настройки из AdminSettings).
const initialProjectName = props.projectTitle.split(' / ')[0] || props.projectTitle
const statusProjectName = ref(initialProjectName)
const statusLogLevel = ref<'debug' | 'info' | 'warn' | 'error' | 'disable'>('info')

// Счётчики дашборда: обновляются по каждой входящей записи лога.
const errorCount = ref(0)
const warnCount = ref(0)
const dashboardResetAt = ref(0)

function countEntry(entry: LogEntry) {
  if (entry.timestamp >= dashboardResetAt.value) {
    if (entry.severity <= 3) errorCount.value += 1
    else if (entry.severity === 4) warnCount.value += 1
  }
}

const {
  displayedLogs,
  logsLoading,
  logsError,
  logsHasMore,
  selectedLogStream,
  selectedLogStreamLabel,
  currentLogCount,
  expandedLogRows,
  wsConnected,
  wsInitialized,
  LOG_STREAM_KEYS,
  LOG_STREAM_LABELS,
  loadMoreLogs,
  clearLogs,
  toggleLogFilter,
  toggleLogRow,
  ingestLocalEntry,
  start: startLogStream
} = useLogStream({
  encodedLogsSocketId: props.encodedLogsSocketId,
  onEntry: countEntry,
  trackConnection: true,
  loggerName: 'AdminPage'
})

useRemoteLogging({ enabled: true, onLocalEntry: ingestLocalEntry })

const encodedLogsSocketOk = computed(() => Boolean(props.encodedLogsSocketId))

const streamPillLabel = computed(() => {
  if (!encodedLogsSocketOk.value) return 'LOGS'
  if (!wsInitialized.value) return '···'
  return wsConnected.value ? 'LIVE' : 'OFFLINE'
})

const streamPillAriaLabel = computed(() => {
  if (!encodedLogsSocketOk.value) return 'Поток логов без канала WebSocket'
  if (!wsInitialized.value) return 'Подключение WebSocket для логов'
  return wsConnected.value
    ? 'Поток логов в реальном времени, WebSocket подключён'
    : 'WebSocket для логов недоступен'
})

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
    hasEncodedLogsSocketId: !!props.encodedLogsSocketId
  })

  loadDashboardCounts()
  if (window.hideAppLoader) window.hideAppLoader()

  if (window.bootLoaderComplete) {
    startAnimations()
  } else {
    window.addEventListener('bootloader-complete', startAnimations)
  }

  startLogStream()
})

onUnmounted(() => {
  log.info('Компонент размонтирован')
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
                'ap-stream-pill--live': encodedLogsSocketOk && wsInitialized && wsConnected,
                'ap-stream-pill--offline': encodedLogsSocketOk && wsInitialized && !wsConnected,
                'ap-stream-pill--pending': encodedLogsSocketOk && !wsInitialized,
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
            <AdminSettings
              :initial-project-name="initialProjectName"
              @update:project-name="statusProjectName = $event"
              @update:log-level="statusLogLevel = $event"
            />
            <AdminWheelSettings
              :theme-options="props.themeOptions || []"
              :winners-url="props.winnersUrl"
            />
            <AdminSegments />
            <AdminGetcourseSettings />
            <AdminBackup />
          </div>

          <aside class="ap-side">
            <AdminLogMonitor
              :displayed-logs="displayedLogs"
              :logs-loading="logsLoading"
              :logs-error="logsError"
              :logs-has-more="logsHasMore"
              :selected-log-stream="selectedLogStream"
              :selected-log-stream-label="selectedLogStreamLabel"
              :current-log-count="currentLogCount"
              :expanded-log-rows="expandedLogRows"
              :log-stream-keys="LOG_STREAM_KEYS"
              :log-stream-labels="LOG_STREAM_LABELS"
              @load-more="loadMoreLogs"
              @clear="clearLogs"
              @toggle-filter="toggleLogFilter"
              @toggle-row="toggleLogRow"
            />
          </aside>
        </div>
      </div>
    </main>

    <AppFooter v-if="bootLoaderDone" @chatium-click="openChatiumLink" />
  </div>
</template>
