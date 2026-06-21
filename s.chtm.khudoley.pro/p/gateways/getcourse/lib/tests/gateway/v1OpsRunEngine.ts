/**
 * Движок прогона сценариев /v1/{op}: типы результата/настроек, чтение Heap,
 * сборка исходящего запроса, исполнение одного сценария, троттлинг и сбор цепочки
 * зависимостей. Вынесено из v1OpsSuiteRunner ради лимита размера файла; публичные
 * runAllV1Ops/runSingleV1Op остаются в v1OpsSuiteRunner.
 */
import * as loggerLib from '../../logger.lib'
import * as settingsLib from '../../settings.lib'
import { handleV1OpRouteWithGcDiagnostic, type V1IncomingLike } from '../../gateway/handleV1OpRoute'
import { GW_HEADER_SCHOOL_API_KEY, GW_HEADER_SCHOOL_HOST } from '../../../shared/gatewayHttpHeaders'
import { V1_OPS_HEAP_KEYS, V1_OPS_TESTER_EMAIL, type V1OpsRunContext } from './v1OpsRunContext'
import {
  V1_OPS_EXECUTION_ORDER,
  V1_OPS_SCENARIOS,
  type V1OpScenario,
  type V1OpsHeapBag
} from './v1OpsScenarios'
import { findOperationCatalogEntry } from '../../gateway/operationsCatalog'

const LOG_MODULE = 'lib/tests/gateway/v1OpsSuiteRunner'
const THROTTLE_MS = 1000
/** Лимит размера тела GC в JSON ответа раннера (защита UI/памяти). */
const GC_UPSTREAM_BODY_MAX_CHARS = 400_000

function truncateGcUpstreamBody(text: string): string {
  if (text.length <= GC_UPSTREAM_BODY_MAX_CHARS) return text
  return `${text.slice(0, GC_UPSTREAM_BODY_MAX_CHARS)}\n… [обрезано, всего ${String(text.length)} символов]`
}

export type V1OpRunResult = {
  op: string
  phase: 1 | 2 | 3 | 4
  contour?: 'new' | 'legacy'
  httpMethod?: 'GET' | 'POST'
  availability?: 'enabled' | 'beta' | 'disabled' | 'unsupported'
  status: 'passed' | 'failed' | 'skipped'
  durationMs: number
  /** HTTP-статус, который вернул бы /v1/{op} клиенту (manual §7). */
  clientHttpStatus?: number
  /** Поле `ok` из тела ответа gateway (`true` при успехе). */
  ok?: boolean
  /** `error.code` из тела ответа gateway, если запрос неуспешен. */
  errorCode?: string
  /** `requestId` из тела ответа gateway (manual §2.3). */
  gatewayRequestId?: string
  /** Полный распарсенный JSON-ответ gateway (data/error/warnings/requestId). */
  parsedResponse?: unknown
  /**
   * Сырой HTTP-ответ GetCourse (после исходящего вызова к школе), если он был.
   * Не дублирует публичный контракт `/v1/{op}` — только для админского сьюита.
   */
  gcUpstream?: { httpStatus: number; contentType: string; bodyText: string }
  /** Причина пропуска (если status === 'skipped'). */
  skipReason?: string
  /** Подсказка из сценария — что именно делает op. */
  hint?: string
  /** Аргументы, которые сценарий собрал и отправил (для отладки). */
  sentArgs?: Record<string, unknown>
}

export type V1OpsRunSettings = {
  schoolHost: string
  schoolApiKey: string
  developerKeyConfigured: boolean
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
  /** Глобальная ошибка, если прогон не стартовал (например, нет ключей). */
  fatalError?: string
}

/** Чтение всех настроек прогона: секреты школы и опциональные `gc_itest_*` ключи. */
export async function readRunSettings(
  ctx: app.Ctx
): Promise<{ settings: V1OpsRunSettings | null; heap: V1OpsHeapBag; fatalError?: string }> {
  await loggerLib.writeServerLog(ctx, {
    severity: 7,
    message: `[${LOG_MODULE}] readRunSettings entry`,
    payload: {}
  })

  const schoolHost = (
    await settingsLib.getSettingString(ctx, settingsLib.SETTING_KEYS.GC_TEST_SCHOOL_HOST)
  ).trim()
  const schoolApiKey = (
    await settingsLib.getSettingString(ctx, settingsLib.SETTING_KEYS.GC_TEST_SCHOOL_API_KEY)
  ).trim()
  const devKey = (
    await settingsLib.getSettingString(ctx, settingsLib.SETTING_KEYS.GC_DEVELOPER_API_KEY)
  ).trim()

  if (!schoolHost) {
    return {
      settings: null,
      heap: {},
      fatalError: `Не задан Heap-ключ ${settingsLib.SETTING_KEYS.GC_TEST_SCHOOL_HOST} (manual §5.8)`
    }
  }
  if (!schoolApiKey) {
    return {
      settings: null,
      heap: {},
      fatalError: `Не задан Heap-ключ ${settingsLib.SETTING_KEYS.GC_TEST_SCHOOL_API_KEY} (manual §5.5)`
    }
  }

  async function readHeap(key: string): Promise<string | undefined> {
    const v = (await settingsLib.getSettingString(ctx, key)).trim()
    return v.length > 0 ? v : undefined
  }

  const heap: V1OpsHeapBag = {
    offerId: await readHeap(V1_OPS_HEAP_KEYS.OFFER_ID),
    lessonId: await readHeap(V1_OPS_HEAP_KEYS.LESSON_ID),
    dialogId: await readHeap(V1_OPS_HEAP_KEYS.DIALOG_ID),
    telegramChatId: await readHeap(V1_OPS_HEAP_KEYS.TELEGRAM_CHAT_ID),
    departmentId: await readHeap(V1_OPS_HEAP_KEYS.DEPARTMENT_ID),
    diplomaTemplateId: await readHeap(V1_OPS_HEAP_KEYS.DIPLOMA_TEMPLATE_ID),
    moderatorId: await readHeap(V1_OPS_HEAP_KEYS.MODERATOR_ID),
    webinarCommentId: await readHeap(V1_OPS_HEAP_KEYS.WEBINAR_COMMENT_ID),
    webhookEventId: await readHeap(V1_OPS_HEAP_KEYS.WEBHOOK_EVENT_ID),
    webhookEventObjectId: await readHeap(V1_OPS_HEAP_KEYS.WEBHOOK_EVENT_OBJECT_ID),
    webhookUri: await readHeap(V1_OPS_HEAP_KEYS.WEBHOOK_URI)
  }

  await loggerLib.writeServerLog(ctx, {
    severity: 7,
    message: `[${LOG_MODULE}] readRunSettings exit`,
    payload: {
      developerKeyConfigured: devKey.length > 0,
      heapKeysSet: Object.entries(heap)
        .filter(([, v]) => v !== undefined)
        .map(([k]) => k)
    }
  })

  return {
    settings: { schoolHost, schoolApiKey, developerKeyConfigured: devKey.length > 0 },
    heap
  }
}

function buildIncomingRequest(
  scenario: V1OpScenario,
  args: Record<string, unknown>,
  schoolHost: string,
  schoolApiKey: string
): V1IncomingLike {
  const entry = findOperationCatalogEntry(scenario.op)
  const httpMethod = entry?.httpMethod ?? 'GET'
  const headers: Record<string, string> = {
    [GW_HEADER_SCHOOL_HOST.toLowerCase()]: schoolHost,
    [GW_HEADER_SCHOOL_API_KEY.toLowerCase()]: schoolApiKey
  }
  if (httpMethod === 'POST') {
    headers['content-type'] = 'application/json'
    return { method: 'POST', headers, body: args }
  }
  const query: Record<string, string> = {}
  for (const [k, v] of Object.entries(args)) {
    if (v === undefined || v === null) continue
    query[k] = typeof v === 'string' ? v : JSON.stringify(v)
  }
  return { method: 'GET', headers, query }
}

function parseGatewayBody(rawBody: string): unknown {
  try {
    return JSON.parse(rawBody)
  } catch {
    return { raw: rawBody }
  }
}

function pickGatewayMeta(parsed: unknown): {
  ok?: boolean
  errorCode?: string
  requestId?: string
} {
  if (!parsed || typeof parsed !== 'object') return {}
  const o = parsed as Record<string, unknown>
  const meta: { ok?: boolean; errorCode?: string; requestId?: string } = {}
  if (typeof o.ok === 'boolean') meta.ok = o.ok
  if (typeof o.requestId === 'string') meta.requestId = o.requestId
  if (o.error && typeof o.error === 'object') {
    const code = (o.error as Record<string, unknown>).code
    if (typeof code === 'string') meta.errorCode = code
  }
  return meta
}

function makeSkipResult(scenario: V1OpScenario, reason: string): V1OpRunResult {
  const entry = findOperationCatalogEntry(scenario.op)
  return {
    op: scenario.op,
    phase: scenario.phase,
    contour: entry?.contour,
    httpMethod: entry?.httpMethod,
    availability: entry?.availability,
    status: 'skipped',
    durationMs: 0,
    skipReason: reason,
    hint: scenario.hint
  }
}

function checkDependencies(scenario: V1OpScenario, runCtx: V1OpsRunContext): string | null {
  if (!scenario.dependsOn || scenario.dependsOn.length === 0) return null
  for (const dep of scenario.dependsOn) {
    if (runCtx.skippedOps.has(dep) || !runCtx.completedOps.has(dep)) {
      return `Зависимость не выполнена: ${dep}`
    }
  }
  return null
}

async function executeScenario(
  ctx: app.Ctx,
  scenario: V1OpScenario,
  runCtx: V1OpsRunContext,
  heap: V1OpsHeapBag
): Promise<V1OpRunResult> {
  const entry = findOperationCatalogEntry(scenario.op)
  const dependencyError = checkDependencies(scenario, runCtx)
  if (dependencyError) {
    runCtx.skippedOps.add(scenario.op)
    return makeSkipResult(scenario, dependencyError)
  }

  if (entry?.availability === 'disabled' || entry?.availability === 'unsupported') {
    runCtx.skippedOps.add(scenario.op)
    return makeSkipResult(scenario, `availability=${entry.availability} (manual §2.11)`)
  }

  const built = scenario.build({ runCtx, heap })
  if ('skip' in built) {
    runCtx.skippedOps.add(scenario.op)
    return makeSkipResult(scenario, built.skip)
  }

  const args = built.args
  const req = buildIncomingRequest(scenario, args, runCtx.schoolHost, runCtx.schoolApiKey)
  const started = Date.now()

  let response
  let gcDiagnostic: { httpStatus: number; contentType: string; bodyText: string } | undefined
  try {
    const out = await handleV1OpRouteWithGcDiagnostic(ctx, scenario.op, req)
    response = out.response
    gcDiagnostic = out.gcDiagnostic
  } catch (e) {
    runCtx.skippedOps.add(scenario.op)
    const message = e instanceof Error ? e.message : String(e)
    return {
      op: scenario.op,
      phase: scenario.phase,
      contour: entry?.contour,
      httpMethod: entry?.httpMethod,
      availability: entry?.availability,
      status: 'failed',
      durationMs: Date.now() - started,
      hint: scenario.hint,
      sentArgs: args,
      parsedResponse: { runnerError: message }
    }
  }

  const parsed = parseGatewayBody(response.rawHttpBody)
  const meta = pickGatewayMeta(parsed)
  const passed = response.statusCode === 200 && meta.ok === true

  if (passed && scenario.capture) {
    try {
      scenario.capture(parsed, runCtx)
    } catch (captureErr) {
      await loggerLib.writeServerLog(ctx, {
        severity: 4,
        message: `[${LOG_MODULE}] capture error`,
        payload: {
          op: scenario.op,
          error: captureErr instanceof Error ? captureErr.message : String(captureErr)
        }
      })
    }
  }

  if (passed) runCtx.completedOps.add(scenario.op)
  else runCtx.skippedOps.add(scenario.op)

  return {
    op: scenario.op,
    phase: scenario.phase,
    contour: entry?.contour,
    httpMethod: entry?.httpMethod,
    availability: entry?.availability,
    status: passed ? 'passed' : 'failed',
    durationMs: Date.now() - started,
    clientHttpStatus: response.statusCode,
    ok: meta.ok,
    errorCode: meta.errorCode,
    gatewayRequestId: meta.requestId,
    parsedResponse: parsed,
    gcUpstream: gcDiagnostic
      ? {
          httpStatus: gcDiagnostic.httpStatus,
          contentType: gcDiagnostic.contentType,
          bodyText: truncateGcUpstreamBody(gcDiagnostic.bodyText)
        }
      : undefined,
    hint: scenario.hint,
    sentArgs: args
  }
}

/** Короткая блокирующая пауза без `setTimeout` (см. шапку файла). */
function throttleBusyWaitMs(ms: number): void {
  if (ms <= 0) return
  const deadline = Date.now() + ms
  while (Date.now() < deadline) {
    /* намеренный spin до deadline */
  }
}

/** Транзитивный список dependsOn в линейном порядке выполнения (без дублей). */
export function collectDependencyChain(targetOp: string): V1OpScenario[] {
  const target = V1_OPS_SCENARIOS.get(targetOp)
  if (!target) return []
  const required = new Set<string>()
  const stack = [targetOp]
  while (stack.length > 0) {
    const op = stack.pop() as string
    if (required.has(op)) continue
    required.add(op)
    const sc = V1_OPS_SCENARIOS.get(op)
    if (sc?.dependsOn) for (const d of sc.dependsOn) stack.push(d)
  }
  return V1_OPS_EXECUTION_ORDER.filter((s) => required.has(s.op))
}

export async function runScenariosSequentially(
  ctx: app.Ctx,
  scenarios: readonly V1OpScenario[],
  runCtx: V1OpsRunContext,
  heap: V1OpsHeapBag
): Promise<V1OpRunResult[]> {
  const results: V1OpRunResult[] = []
  let lastNetworkCallAt: number | null = null
  for (const scenario of scenarios) {
    const willCallNetwork =
      !runCtx.skippedOps.has(scenario.op) &&
      checkDependencies(scenario, runCtx) === null &&
      // build тоже может вернуть skip (нет heap-ключа). Однако вызываем его внутри executeScenario;
      // throttle стартует только после реального исходящего вызова — ниже корректируем по факту.
      true
    if (willCallNetwork && lastNetworkCallAt !== null) {
      const since = Date.now() - lastNetworkCallAt
      if (since < THROTTLE_MS) {
        throttleBusyWaitMs(THROTTLE_MS - since)
      }
    }
    const before = Date.now()
    const result = await executeScenario(ctx, scenario, runCtx, heap)
    if (result.status !== 'skipped') {
      lastNetworkCallAt = Date.now()
    } else {
      void before
    }
    results.push(result)
  }
  return results
}

export function makeFreshRunContext(schoolHost: string, schoolApiKey: string): V1OpsRunContext {
  return {
    schoolHost,
    schoolApiKey,
    testerEmail: V1_OPS_TESTER_EMAIL,
    completedOps: new Set<string>(),
    skippedOps: new Set<string>()
  }
}
