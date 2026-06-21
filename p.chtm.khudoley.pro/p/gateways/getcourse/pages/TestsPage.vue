<script setup lang="ts">
import { onMounted, onUnmounted, ref, computed } from 'vue'
import Header from '../components/Header.vue'
import GlobalGlitch from '../components/GlobalGlitch.vue'
import AppFooter from '../components/AppFooter.vue'
import TestSuiteTab from '../components/tests/TestSuiteTab.vue'
import TestsLogMonitor from '../components/tests/TestsLogMonitor.vue'
import TestsV1OpsTab from '../components/tests/TestsV1OpsTab.vue'
import TestsToolbar from '../components/tests/TestsToolbar.vue'
import { createComponentLogger } from '../shared/logger'
import { useLogStream } from '../shared/useLogStream'
import { useRemoteLogging } from '../shared/useRemoteLogging'
import { useTestSuites } from '../shared/useTestSuites'
import { useV1Ops } from '../shared/useV1Ops'
import type { OperationSummary } from '../shared/operationsCatalogShared'

const log = createComponentLogger('TestsPage')

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
  operationsList?: OperationSummary[]
}>()

/** Каталог операций /v1/{op} (SSR-проп; источник — lib/gateway/operationsCatalog на сервере). */
const operationsList = computed<OperationSummary[]>(() => props.operationsList ?? [])

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

/** Базовый URL API проекта — общий для сьютов и сьюита /v1/{op}. */
function getApiBaseUrl(): string {
  const indexPath = (
    props.indexUrl.startsWith('http') ? new URL(props.indexUrl).pathname : props.indexUrl
  ).replace(/\/$/, '')
  const testsPath = (
    props.testsUrl.startsWith('http') ? new URL(props.testsUrl).pathname : props.testsUrl
  ).replace(/\/$/, '')
  const basePath = indexPath || testsPath.replace(/\/web\/tests$/i, '') || '/'
  const origin = props.indexUrl.startsWith('http')
    ? new URL(props.indexUrl).origin
    : window.location.origin
  const normalized = basePath.startsWith('/') ? basePath : `/${basePath}`
  return `${origin}${normalized}`
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
  hasAnyExpandedLogRow,
  LOG_STREAM_KEYS,
  LOG_STREAM_LABELS,
  loadMoreLogs,
  clearLogs,
  toggleLogFilter,
  toggleLogRow,
  toggleExpandCollapseAllLogs,
  ingestLocalEntry,
  start: startLogStream
} = useLogStream({
  encodedLogsSocketId: props.encodedLogsSocketId,
  dedupSocketEcho: true,
  loggerName: 'TestsPage'
})

useRemoteLogging({
  enabled: !!props.encodedLogsSocketId,
  onLocalEntry: ingestLocalEntry
})

const {
  testsSuiteTab,
  lastSuiteRunAt,
  runAllTestsLoading,
  runTabTestsLoading,
  unitLoading,
  integrationLoading,
  httpPagesLoading,
  tabTestMetrics,
  tabRunButtonIdleLabel,
  unitBlocksView,
  integrationServerBlocksView,
  integrationHttpBlocksView,
  isSingleRunning,
  isGroupBlockedBySingle,
  isSuiteSectionExpanded,
  toggleSuiteSection,
  runUnitSuite,
  runSingleUnitTest,
  runIntegrationSuite,
  runSingleIntegrationTest,
  runHttpPageChecks,
  runSingleHttpPageCheck,
  runAllTestsOnCurrentTab,
  runAllTests
} = useTestSuites({ indexUrl: props.indexUrl, testsUrl: props.testsUrl })

const {
  v1OpsExpanded,
  v1OpsRunningAll,
  v1OpsSingleRunning,
  v1OpsFatalError,
  v1OpsLastRunAt,
  v1OpsPreflight,
  v1OpsPreflightLoading,
  v1OpsPreflightError,
  v1OpsMetrics,
  v1OpsRowsByPhase,
  v1OpsAnyRunnable,
  v1OpsAdminUrl,
  loadV1OpsPreflight,
  runV1OpsSuite,
  runSingleV1Op,
  toggleV1OpRow
} = useV1Ops({
  operationsList,
  getApiBaseUrl,
  adminUrl: () => props.adminUrl ?? ''
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

  void loadV1OpsPreflight()
  startLogStream()
})

onUnmounted(() => {
  log.info('Component unmounted')
  window.removeEventListener('bootloader-complete', startAnimations)
  if (intervalIds.title) clearInterval(intervalIds.title)
  if (intervalIds.desc) clearInterval(intervalIds.desc)
})

const openChatiumLink = () => {
  log.notice('Opening Chatium link')
  window.open('https://chatium.ru/?start=pl-LGBT1Oge7c61RkKTU4t0start', '_blank')
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
        <TestsToolbar
          :testsSuiteTab="testsSuiteTab"
          :lastSuiteRunAt="lastSuiteRunAt"
          :runTabTestsLoading="runTabTestsLoading"
          :runAllTestsLoading="runAllTestsLoading"
          :unitLoading="unitLoading"
          :integrationLoading="integrationLoading"
          :httpPagesLoading="httpPagesLoading"
          :tabRunButtonIdleLabel="tabRunButtonIdleLabel"
          @set-tab="(t: 'unit' | 'integration' | 'http') => (testsSuiteTab = t)"
          @run-tab="runAllTestsOnCurrentTab"
          @run-all="runAllTests"
        />

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

            <TestSuiteTab
              v-show="testsSuiteTab === 'unit'"
              tab="unit"
              heading="Юнит-тесты"
              heading-icon="fas fa-vial"
              code-label="GET /api/tests/unit"
              :blocks-view="unitBlocksView"
              :loading="unitLoading"
              run-label="Запустить юнит-набор"
              :group-blocked="isGroupBlockedBySingle('unit')"
              :is-suite-section-expanded="isSuiteSectionExpanded"
              :is-single-running="isSingleRunning"
              @run-suite="runUnitSuite"
              @run-single="runSingleUnitTest"
              @toggle-section="(id: string, i: number) => toggleSuiteSection('unit', id, i)"
            />

            <TestSuiteTab
              v-show="testsSuiteTab === 'integration'"
              tab="integration"
              heading="Серверная интеграция"
              heading-icon="fas fa-server"
              code-label="GET /api/tests/integration"
              :blocks-view="integrationServerBlocksView"
              :loading="integrationLoading"
              run-label="Запустить серверную интеграцию"
              :group-blocked="isGroupBlockedBySingle('integration')"
              :is-suite-section-expanded="isSuiteSectionExpanded"
              :is-single-running="isSingleRunning"
              @run-suite="runIntegrationSuite"
              @run-single="runSingleIntegrationTest"
              @toggle-section="(id: string, i: number) => toggleSuiteSection('integration', id, i)"
            />

            <div v-show="testsSuiteTab === 'http'" class="tp-tab-panel">
              <TestSuiteTab
                tab="http"
                heading="HTTP-проверки страниц"
                heading-icon="fas fa-globe"
                code-label="GET /, /web/*"
                :blocks-view="integrationHttpBlocksView"
                :loading="httpPagesLoading"
                run-label="Проверить HTTP-страницы"
                :group-blocked="isGroupBlockedBySingle('http')"
                :is-suite-section-expanded="isSuiteSectionExpanded"
                :is-single-running="isSingleRunning"
                @run-suite="runHttpPageChecks"
                @run-single="runSingleHttpPageCheck"
                @toggle-section="(id: string, i: number) => toggleSuiteSection('http', id, i)"
              />

              <TestsV1OpsTab
                :operationsList="operationsList"
                :v1OpsFatalError="v1OpsFatalError"
                :v1OpsPreflight="v1OpsPreflight"
                :v1OpsPreflightLoading="v1OpsPreflightLoading"
                :v1OpsPreflightError="v1OpsPreflightError"
                :v1OpsMetrics="v1OpsMetrics"
                :v1OpsRowsByPhase="v1OpsRowsByPhase"
                :v1OpsLastRunAt="v1OpsLastRunAt"
                :v1OpsExpanded="v1OpsExpanded"
                :v1OpsRunningAll="v1OpsRunningAll"
                :v1OpsSingleRunning="v1OpsSingleRunning"
                :v1OpsAnyRunnable="v1OpsAnyRunnable"
                :v1OpsAdminUrl="v1OpsAdminUrl"
                @run-suite="runV1OpsSuite"
                @run-single="runSingleV1Op"
                @toggle-row="toggleV1OpRow"
              />
            </div>
          </div>

          <aside v-if="props.encodedLogsSocketId" class="tp-side">
            <TestsLogMonitor
              :displayed-logs="displayedLogs"
              :logs-loading="logsLoading"
              :logs-error="logsError"
              :logs-has-more="logsHasMore"
              :selected-log-stream="selectedLogStream"
              :selected-log-stream-label="selectedLogStreamLabel"
              :current-log-count="currentLogCount"
              :expanded-log-rows="expandedLogRows"
              :has-any-expanded-log-row="hasAnyExpandedLogRow"
              :log-stream-keys="LOG_STREAM_KEYS"
              :log-stream-labels="LOG_STREAM_LABELS"
              @load-more="loadMoreLogs"
              @clear="clearLogs"
              @toggle-filter="toggleLogFilter"
              @toggle-row="toggleLogRow"
              @toggle-all="toggleExpandCollapseAllLogs"
            />
          </aside>
        </div>
      </div>
    </main>

    <AppFooter v-if="bootLoaderDone" @chatium-click="openChatiumLink" />
  </div>
</template>
