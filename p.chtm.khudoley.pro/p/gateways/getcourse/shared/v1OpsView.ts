// @shared
/**
 * Типы и чистые помощники представления сьюита /v1/{op} на странице тестов
 * (gateway-testing-strategy.md §3, §6, §9). Без состояния Vue — используются
 * composable useV1Ops и компонентом TestsV1OpsTab.
 */
import type { OperationSummary } from './operationsCatalogShared'

/** Результат прогона одного /v1/{op} (gateway-testing-strategy.md §3, §6). */
export type V1OpRunResult = {
  op: string
  phase: number
  contour?: 'new' | 'legacy'
  httpMethod?: 'GET' | 'POST'
  availability?: string
  status: 'passed' | 'failed' | 'skipped'
  durationMs: number
  clientHttpStatus?: number
  ok?: boolean
  errorCode?: string
  gatewayRequestId?: string
  parsedResponse?: unknown
  /** Сырой ответ GetCourse (HTTP + тело), если исходящий вызов к школе был — см. `handleV1OpRouteWithGcDiagnostic`. */
  gcUpstream?: { httpStatus: number; contentType: string; bodyText: string }
  skipReason?: string
  hint?: string
  sentArgs?: Record<string, unknown>
}

export type V1OpsRunSummary = {
  startedAt: number
  finishedAt: number
  durationMs: number
  total: number
  passed: number
  failed: number
  skipped: number
  results: V1OpRunResult[]
  fatalError?: string
}

// Preflight: статичный анализ готовности сьюита /v1/{op} (gateway-testing-strategy.md §1, §9).
export type V1OpRunStatus = 'ready' | 'blocked-availability' | 'warn-heap' | 'warn-deps'

export type V1OpPreflight = {
  op: string
  phase: 1 | 2 | 3 | 4
  contour?: 'new' | 'legacy'
  httpMethod?: 'GET' | 'POST'
  availability?: 'enabled' | 'beta' | 'disabled' | 'unsupported'
  dependsOn: readonly string[]
  heapKeys: readonly string[]
  missingHeapKeys: readonly string[]
  blockedDependencies: readonly string[]
  runStatus: V1OpRunStatus
  blockReason?: string
  hint?: string
}

export type V1OpsPreflightSnapshot = {
  levelA: {
    schoolHostSet: boolean
    schoolApiKeySet: boolean
    developerKeySet: boolean
    ready: boolean
  }
  setHeapKeys: readonly string[]
  knownHeapKeys: readonly string[]
  testerEmail: string
  ops: V1OpPreflight[]
  summary: {
    total: number
    ready: number
    blockedAvailability: number
    warnHeap: number
    warnDeps: number
  }
}

export type V1OpRow = {
  entry: OperationSummary
  result?: V1OpRunResult
  preflight?: V1OpPreflight
  /**
   * Эффективный визуальный статус строки: после прогона приоритетен результат
   * (success/fail), до прогона — статус префлайта (ready/blocked/warn).
   */
  visualStatus:
    | 'success'
    | 'fail'
    | 'skip'
    | 'ready'
    | 'blocked-availability'
    | 'warn-heap'
    | 'warn-deps'
    | 'pending'
}

export const PHASE_LABELS: Record<number, string> = {
  1: 'Ф1 каталог/Heap',
  2: 'Ф2 производитель',
  3: 'Ф3 потребитель',
  4: 'Ф4 деструктор'
}

export function v1OpStatusBadge(result: V1OpRunResult | undefined): {
  text: string
  status: 'pending' | 'success' | 'fail' | 'skip'
} {
  if (!result) return { text: 'ОЖИД', status: 'pending' }
  if (result.status === 'passed') return { text: 'OK', status: 'success' }
  if (result.status === 'failed') return { text: 'FAIL', status: 'fail' }
  return { text: 'SKIP', status: 'skip' }
}

export function formatMs(ms: number | undefined): string {
  if (ms === undefined) return ''
  if (ms < 1000) return `${ms} мс`
  return `${(ms / 1000).toFixed(1)} с`
}

export function formatJsonForDisplay(value: unknown): string {
  try {
    return JSON.stringify(value, null, 2)
  } catch {
    return String(value)
  }
}

/** Сырое тело ответа школы: заголовки + JSON с отступами, если парсится. */
export function formatGcUpstreamForDisplay(up: {
  httpStatus: number
  contentType: string
  bodyText: string
}): string {
  const head = `HTTP ${String(up.httpStatus)}\nContent-Type: ${up.contentType}\n\n`
  const t = up.bodyText.trim()
  if ((t.startsWith('{') && t.endsWith('}')) || (t.startsWith('[') && t.endsWith(']'))) {
    try {
      return head + JSON.stringify(JSON.parse(t) as unknown, null, 2)
    } catch {
      return head + up.bodyText
    }
  }
  return head + up.bodyText
}

export function deriveVisualStatus(
  result: V1OpRunResult | undefined,
  preflight: V1OpPreflight | undefined
): V1OpRow['visualStatus'] {
  if (result?.status === 'passed') return 'success'
  if (result?.status === 'failed') return 'fail'
  if (result?.status === 'skipped') return 'skip'
  if (preflight) return preflight.runStatus
  return 'pending'
}

export function isV1OpRowRunnable(row: V1OpRow): boolean {
  if (!row.preflight) return true // до загрузки префлайта не блокируем — ответственность за SKIP несёт раннер
  return row.preflight.runStatus === 'ready'
}

/** Короткая подпись для тэга runStatus — только из script, без `{{ { ... } }}` в шаблоне (иначе UGC/Vue может распарсить `{` как блок и дать пустой ReferenceError). */
export function v1OpsPreflightRunStatusShortLabel(status: V1OpRunStatus | string): string {
  switch (status) {
    case 'blocked-availability':
      return 'запуск запрещён'
    case 'warn-heap':
      return 'нужен Heap'
    case 'warn-deps':
      return 'нужен предшественник'
    default:
      return ''
  }
}
