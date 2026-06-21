<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'
import Header from '../components/Header.vue'
import GlobalGlitch from '../components/GlobalGlitch.vue'
import AppFooter from '../components/AppFooter.vue'
import TestSuiteTab from '../components/tests/TestSuiteTab.vue'
import TestsLogMonitor from '../components/tests/TestsLogMonitor.vue'
import { createComponentLogger } from '../shared/logger'
import { useLogStream } from '../shared/useLogStream'
import { useRemoteLogging } from '../shared/useRemoteLogging'
import { useTestSuites } from '../shared/useTestSuites'

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
}>()

const bootLoaderDone = ref(false)
const startAnimations = () => {
  bootLoaderDone.value = true
}

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

const openChatiumLink = () => {
  log.notice('Opening Chatium link')
  window.open('https://chatium.ru/?start=pl-LGBT1Oge7c61RkKTU4t0start', '_blank')
}

onMounted(() => {
  log.info('Component mounted')
  if (window.hideAppLoader) window.hideAppLoader()

  if (window.bootLoaderComplete) {
    startAnimations()
  } else {
    window.addEventListener('bootloader-complete', startAnimations)
  }

  startLogStream()
})

onUnmounted(() => {
  log.info('Component unmounted')
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

            <TestSuiteTab
              v-show="testsSuiteTab === 'http'"
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
