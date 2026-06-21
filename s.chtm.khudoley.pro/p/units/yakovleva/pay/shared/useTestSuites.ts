// @shared
/**
 * Composable вкладок тестов Payments Client (юнит / серверная интеграция / HTTP-страницы):
 * состояние, прогон наборов и отдельных тестов, представление каталога и метрики.
 * Чистые помощники — в testSuiteHelpers.
 */
import { ref, computed } from 'vue'
import { createComponentLogger } from './logger'
import {
  UNIT_TEST_BLOCKS,
  INTEGRATION_SERVER_TEST_BLOCKS,
  INTEGRATION_HTTP_TEST_BLOCK,
  flattenCatalogBlocks
} from './testCatalog'
import {
  type SuiteRow,
  type SuiteSectionTab,
  type SingleRunGroup,
  HTTP_PATH_BY_TEST_ID,
  httpPagePassed,
  upsertTestResults,
  metricsFromBlocks,
  summarizeRows,
  mapBlocksToView
} from './testSuiteHelpers'

export interface UseTestSuitesOptions {
  indexUrl: string
}

export function useTestSuites(options: UseTestSuitesOptions) {
  const log = createComponentLogger('TestsPage')

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
  const singleTestRun = ref<{ group: SingleRunGroup; id: string } | null>(null)
  const suiteSectionOpen = ref<Record<string, boolean>>({})

  function getApiBaseUrl(): string {
    const path = options.indexUrl.startsWith('http')
      ? new URL(options.indexUrl).pathname
      : options.indexUrl
    const basePath = path.replace(/\/$/, '') || '/p/template_project'
    const origin = options.indexUrl.startsWith('http')
      ? new URL(options.indexUrl).origin
      : window.location.origin
    return `${origin}${basePath.startsWith('/') ? basePath : '/' + basePath}`
  }

  function isSingleRunning(group: SingleRunGroup, id: string): boolean {
    const active = singleTestRun.value
    return active !== null && active.group === group && active.id === id
  }

  function isGroupBlockedBySingle(group: SingleRunGroup): boolean {
    return singleTestRun.value?.group === group
  }

  const tabTestMetrics = computed(() => {
    if (testsSuiteTab.value === 'unit')
      return metricsFromBlocks(UNIT_TEST_BLOCKS, unitResults.value)
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

  const unitBlocksView = computed(() => mapBlocksToView(UNIT_TEST_BLOCKS, unitResults.value))
  const integrationServerBlocksView = computed(() =>
    mapBlocksToView(INTEGRATION_SERVER_TEST_BLOCKS, integrationResults.value)
  )
  const integrationHttpBlocksView = computed(() =>
    mapBlocksToView([INTEGRATION_HTTP_TEST_BLOCK], httpPageResults.value)
  )

  function suiteSectionStateKey(tab: SuiteSectionTab, blockId: string): string {
    return `${tab}:${blockId}`
  }

  function isSuiteSectionExpanded(
    tab: SuiteSectionTab,
    blockId: string,
    blockIndex: number
  ): boolean {
    const v = suiteSectionOpen.value[suiteSectionStateKey(tab, blockId)]
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
      const one = Array.isArray(data?.results)
        ? data.results.find((r) => r.id === testId)
        : undefined
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
        {
          id: testId,
          title: fallbackTitle,
          passed: false,
          error: (e as Error)?.message ?? String(e)
        }
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
      const one = Array.isArray(data?.results)
        ? data.results.find((r) => r.id === testId)
        : undefined
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
        {
          id: testId,
          title: fallbackTitle,
          passed: false,
          error: (e as Error)?.message ?? String(e)
        }
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
          out.push({ id: t.id, title: t.title, passed: chk.ok, error: chk.error })
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
        { id: testId, title: fallbackTitle, passed: chk.ok, error: chk.error }
      ])
      lastSuiteRunAt.value = new Date().toLocaleString('ru-RU')
    } catch (e) {
      httpPageResults.value = upsertTestResults(httpPageResults.value, [
        {
          id: testId,
          title: fallbackTitle,
          passed: false,
          error: (e as Error)?.message ?? String(e)
        }
      ])
    } finally {
      singleTestRun.value = null
    }
  }

  const runAllTestsOnCurrentTab = async () => {
    runTabTestsLoading.value = true
    try {
      if (testsSuiteTab.value === 'unit') await runUnitSuite()
      else if (testsSuiteTab.value === 'integration') await runIntegrationSuite()
      else await runHttpPageChecks()
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

  return {
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
  }
}
