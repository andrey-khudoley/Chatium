// @shared
/**
 * Composable сьюита /v1/{op} страницы тестов: состояние результатов и префлайта,
 * запуск полного/одиночного прогона, метрики и группировка строк по фазам.
 * Чистые помощники/типы — в v1OpsView. Презентация — в TestsV1OpsTab.
 */
import { ref, computed, type Ref } from 'vue'
import { createComponentLogger } from './logger'
import type { OperationSummary } from './operationsCatalogShared'
import {
  type V1OpRunResult,
  type V1OpsRunSummary,
  type V1OpPreflight,
  type V1OpsPreflightSnapshot,
  type V1OpRow,
  PHASE_LABELS,
  deriveVisualStatus,
  isV1OpRowRunnable
} from './v1OpsView'

export interface UseV1OpsOptions {
  /** Источник каталога операций (SSR-проп). */
  operationsList: Ref<OperationSummary[]>
  /** Базовый URL API проекта (как у useTestSuites). */
  getApiBaseUrl: () => string
  /** URL админки для подсказок «задать в Heap». */
  adminUrl: () => string
}

export function useV1Ops(options: UseV1OpsOptions) {
  const log = createComponentLogger('TestsPage')

  const v1OpsResults = ref<Record<string, V1OpRunResult>>({})
  const v1OpsExpanded = ref<Record<string, boolean>>({})
  const v1OpsRunningAll = ref(false)
  const v1OpsSingleRunning = ref<string | null>(null)
  const v1OpsFatalError = ref<string | null>(null)
  const v1OpsLastRunAt = ref<string | null>(null)

  const v1OpsPreflight = ref<V1OpsPreflightSnapshot | null>(null)
  const v1OpsPreflightLoading = ref(false)
  const v1OpsPreflightError = ref<string | null>(null)

  function applyV1OpsSummary(summary: V1OpsRunSummary) {
    v1OpsFatalError.value = summary.fatalError ?? null
    for (const r of summary.results) {
      v1OpsResults.value[r.op] = r
    }
    v1OpsLastRunAt.value = new Date().toLocaleString('ru-RU')
  }

  async function loadV1OpsPreflight() {
    v1OpsPreflightLoading.value = true
    v1OpsPreflightError.value = null
    try {
      const base = options.getApiBaseUrl().replace(/\/$/, '')
      const res = await fetch(`${base}/api/tests/v1-ops/preflight`, {
        method: 'GET',
        credentials: 'include'
      })
      const data = (await res.json().catch(() => null)) as {
        success?: boolean
        snapshot?: V1OpsPreflightSnapshot
        error?: string
      } | null
      if (data?.snapshot) {
        v1OpsPreflight.value = data.snapshot
      } else if (data?.error) {
        v1OpsPreflightError.value = data.error
      } else {
        v1OpsPreflightError.value = `HTTP ${res.status}`
      }
    } catch (e) {
      v1OpsPreflightError.value = (e as Error)?.message ?? String(e)
    } finally {
      v1OpsPreflightLoading.value = false
    }
  }

  async function runV1OpsSuite() {
    v1OpsRunningAll.value = true
    v1OpsFatalError.value = null
    try {
      const base = options.getApiBaseUrl().replace(/\/$/, '')
      const res = await fetch(`${base}/api/tests/v1-ops/run`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'all' })
      })
      const data = (await res.json().catch(() => null)) as {
        success?: boolean
        summary?: V1OpsRunSummary
        error?: string
      } | null
      if (data?.summary) {
        applyV1OpsSummary(data.summary)
      } else if (data?.error) {
        v1OpsFatalError.value = data.error
      } else {
        v1OpsFatalError.value = `HTTP ${res.status}`
      }
      log.info('Сьюит /v1/{op} завершён', {
        total: data?.summary?.total,
        passed: data?.summary?.passed,
        failed: data?.summary?.failed,
        skipped: data?.summary?.skipped
      })
    } catch (e) {
      v1OpsFatalError.value = (e as Error)?.message ?? String(e)
      log.error('Ошибка сьюита /v1/{op}', e)
    } finally {
      v1OpsRunningAll.value = false
      void loadV1OpsPreflight()
    }
  }

  async function runSingleV1Op(op: string) {
    v1OpsSingleRunning.value = op
    v1OpsFatalError.value = null
    try {
      const base = options.getApiBaseUrl().replace(/\/$/, '')
      const res = await fetch(`${base}/api/tests/v1-ops/run`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'single', opId: op })
      })
      const data = (await res.json().catch(() => null)) as {
        success?: boolean
        summary?: V1OpsRunSummary
        error?: string
      } | null
      if (data?.summary) {
        applyV1OpsSummary(data.summary)
      } else if (data?.error) {
        v1OpsFatalError.value = data.error
      } else {
        v1OpsFatalError.value = `HTTP ${res.status}`
      }
    } catch (e) {
      v1OpsFatalError.value = (e as Error)?.message ?? String(e)
    } finally {
      v1OpsSingleRunning.value = null
      void loadV1OpsPreflight()
    }
  }

  function toggleV1OpRow(op: string) {
    v1OpsExpanded.value[op] = !v1OpsExpanded.value[op]
  }

  const v1OpsMetrics = computed(() => {
    let passed = 0
    let failed = 0
    let skipped = 0
    for (const op of options.operationsList.value) {
      const r = v1OpsResults.value[op.op]
      if (!r) continue
      if (r.status === 'passed') passed++
      else if (r.status === 'failed') failed++
      else skipped++
    }
    const total = options.operationsList.value.length
    return { total, passed, failed, skipped, pending: total - passed - failed - skipped }
  })

  const v1OpsViewRows = computed<V1OpRow[]>(() => {
    const preflightByOp = new Map<string, V1OpPreflight>()
    if (v1OpsPreflight.value) {
      for (const op of v1OpsPreflight.value.ops) preflightByOp.set(op.op, op)
    }
    return options.operationsList.value.map((entry) => {
      const result = v1OpsResults.value[entry.op]
      const preflight = preflightByOp.get(entry.op)
      return { entry, result, preflight, visualStatus: deriveVisualStatus(result, preflight) }
    })
  })

  /** Группировка строк по фазам сценариев (стратегия §3.1) — для понятного порядка в UI. */
  const v1OpsRowsByPhase = computed<
    Array<{ phase: 1 | 2 | 3 | 4; label: string; rows: V1OpRow[] }>
  >(() => {
    const buckets: Record<1 | 2 | 3 | 4, V1OpRow[]> = { 1: [], 2: [], 3: [], 4: [] }
    for (const row of v1OpsViewRows.value) {
      const phase = (row.preflight?.phase ?? row.result?.phase ?? 1) as 1 | 2 | 3 | 4
      buckets[phase].push(row)
    }
    return ([1, 2, 3, 4] as const)
      .map((p) => ({ phase: p, label: PHASE_LABELS[p] ?? '', rows: buckets[p] ?? [] }))
      .filter((g) => g.rows.length > 0)
  })

  const v1OpsAnyRunnable = computed(() => v1OpsViewRows.value.some(isV1OpRowRunnable))
  const v1OpsAdminUrl = computed(() => options.adminUrl())

  return {
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
  }
}
