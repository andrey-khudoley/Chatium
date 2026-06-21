<script setup lang="ts">
import { onMounted, onBeforeUnmount, onUnmounted, ref } from 'vue'
import { getOrCreateBrowserSocketClient } from '@app/socket'
import Header from '../components/Header.vue'
import GlobalGlitch from '../components/GlobalGlitch.vue'
import AppFooter from '../components/AppFooter.vue'
import LogStreamPanel from '../components/LogStreamPanel.vue'
import TestsToolbar from '../components/tests/TestsToolbar.vue'
import TestsMetrics from '../components/tests/TestsMetrics.vue'
import TestSuiteTab from '../components/tests/TestSuiteTab.vue'
import { createComponentLogger, setLogSink, type LogEntry } from '../shared/logger'
import { createBrowserRemoteLogger } from '../shared/browserRemoteLogger'
import { postBrowserLogsRoute } from '../api/logger/browser'
import { useTestSuites } from '../shared/useTestSuites'

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
  panelUrl?: string
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

// Визуальная лог-панель (список/фильтры/загрузка/разворачивание) вынесена в общий компонент.
const logPanel = ref<InstanceType<typeof LogStreamPanel> | null>(null)
// `DataSocketSubscription.listen()` возвращает функцию отписки — её и храним для очистки.
let logsSocketUnsubscribe: (() => void) | null = null

let browserRemoteLogger: ReturnType<typeof createBrowserRemoteLogger> | null = null

/** Записи приложения уже показаны через setLogSink; с сервера приходит тот же лог по WebSocket — пропускаем дубль. */
function isBrowserSinkEchoFromSocket(entry: LogEntry): boolean {
  const p = entry.args[1]
  if (!p || typeof p !== 'object' || Array.isArray(p)) return false
  const o = p as { source?: string; channel?: string }
  return o.source === 'browser' && o.channel === 'sink'
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
} = useTestSuites({ indexUrl: props.indexUrl })

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
      logPanel.value?.pushEntry(entry)
      browserRemoteLogger!.pushSinkEntry(entry)
    })
    getOrCreateBrowserSocketClient()
      .then((socketClient) => {
        const logsSocketSubscription = socketClient.subscribeToData(props.encodedLogsSocketId!)
        logsSocketUnsubscribe = logsSocketSubscription.listen(
          (data: { type?: string; data?: LogEntry }) => {
            if (data?.type === 'new-log' && data.data) {
              const entry = data.data as LogEntry
              if (isBrowserSinkEchoFromSocket(entry)) return
              logPanel.value?.pushEntry(entry)
            }
          }
        )
      })
      .catch((err) => log.error('Не удалось подписаться на логи по WebSocket', err))
    logPanel.value?.loadRecent()
  }
})

onBeforeUnmount(() => {
  log.info('onBeforeUnmount: cleaning up socket subscription')
  if (logsSocketUnsubscribe) {
    logsSocketUnsubscribe()
    logsSocketUnsubscribe = null
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
            <TestsMetrics
              :total="tabTestMetrics.total"
              :passed="tabTestMetrics.passed"
              :failed="tabTestMetrics.failed"
              :skipped="tabTestMetrics.skipped"
            />

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
            <LogStreamPanel ref="logPanel" />
          </aside>
        </div>
      </div>
    </main>

    <AppFooter v-if="bootLoaderDone" @chatium-click="openChatiumLink" />
  </div>
</template>
