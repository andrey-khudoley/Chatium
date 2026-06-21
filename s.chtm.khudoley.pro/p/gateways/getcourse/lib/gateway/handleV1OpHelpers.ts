/**
 * Типы и журнальные помощники цепочки `/v1/{op}` (вынесены из handleV1Op ради
 * лимита размера файла): входной HTTP, диагностика GC, результат per-op handler-а,
 * аккумулятор журналов и запись `gatewayRequestLog`/`gatewayUpstreamLog`.
 */
import * as loggerLib from '../logger.lib'
import { type OperationEntry } from './operationsCatalog'
import { readHeaderInsensitive } from './v1IncomingPost'
import { GW_HEADER_SCHOOL_HOST } from '../../shared/gatewayHttpHeaders'
import { v1ErrorResponse, v1SuccessResponse, type V1TuneResponse } from './v1TuneResponse'
import { interpretGcContourResponse } from './interpretGcV1Response'
import { GATEWAY_OP_BETA_WARNING_ENTRY } from './gatewayBetaWarnings'
import { redactRawDeep } from '../../shared/redactRaw'
import * as gatewayRequestLogRepo from '../../repos/gatewayRequestLog.repo'
import * as gatewayUpstreamLogRepo from '../../repos/gatewayUpstreamLog.repo'

const LOG_PATH = 'lib/gateway/handleV1Op'

/** Минимальные поля входящего HTTP (роут платформы или синтетический объект в тестах). */
export type V1IncomingLike = {
  method?: string
  headers?: unknown
  body?: unknown
  query?: Record<string, string | string[] | undefined>
}

/**
 * Сырой ответ GetCourse — для админского сьюита тестов
 * (`handleV1OpWithGcDiagnostic`). Публичный JSON `/v1/{op}` этого не включает.
 */
export type V1GcDiagnostic = {
  httpStatus: number
  contentType: string
  bodyText: string
}

/** Сырой результат исходящего HTTP к GetCourse. */
export type GcRawResult = {
  gcStatus: number
  gcContentType: string
  gcBodyText: string
}

/** Аргументы, которые общий обработчик передаёт per-op handler-у. */
export type HandlerArgs = {
  requestId: string
  schoolHost: string
  schoolApiKey: string
  devKey: string
  resolvedPath: string
  restArgs: Record<string, unknown>
  args: Record<string, unknown>
  entry: OperationEntry
}

/**
 * Результат per-op handler-а:
 *   - `gc_result` — был выполнен исходящий вызов к GC (его сырой ответ);
 *   - `gateway_error` — handler сам решил вернуть ошибку gateway (без вызова GC).
 */
export type GcHandlerResult =
  | { kind: 'gc_result'; gc: GcRawResult }
  | { kind: 'gateway_error'; code: string; details?: Record<string, unknown> }

export type V1GcHandler = (ctx: app.Ctx, a: HandlerArgs) => Promise<GcHandlerResult>

/** Аккумулятор данных для финальной записи в журналы gateway. */
export type GwLogCtx = {
  requestId: string
  op: string
  contour: string
  method: string
  requestStart: number
  rawArgs: unknown
  rawHeadersSafe: unknown
  upstream: null | {
    kind: string
    gcHttpStatus: number
    rawGcJson: unknown
    semanticRule: string
    sentAt: number
    durationMs: number
  }
}

/** Итог цепочки до записи журналов: ответ клиенту + код ошибки + опц. сырой ответ GC. */
export type RunResult = {
  response: V1TuneResponse
  errorCode: string
  gcDiagnostic?: V1GcDiagnostic
}

/** Заголовки, которые ВСЕГДА исключаем из rawHeadersSafe до применения redactRawDeep. */
const HEADERS_SECRET_BLOCKLIST = new Set([
  'x-gc-school-api-key',
  'x-gc-school-host',
  'authorization',
  'cookie',
  'set-cookie'
])

export function readHeadersObject(headers: unknown): Record<string, unknown> {
  if (!headers || typeof headers !== 'object') return {}
  return headers as Record<string, unknown>
}

export function stripSecretHeaders(headers: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(headers)) {
    if (HEADERS_SECRET_BLOCKLIST.has(k.toLowerCase())) continue
    out[k] = v
  }
  return out
}

export function detectSchoolHostPresent(headers: unknown): boolean {
  const v = readHeaderInsensitive(headers, GW_HEADER_SCHOOL_HOST)
  return typeof v === 'string' && v.length > 0
}

export function packGcDiagnostic(gc: GcRawResult): V1GcDiagnostic {
  return { httpStatus: gc.gcStatus, contentType: gc.gcContentType, bodyText: gc.gcBodyText }
}

/** Распарсить тело ответа GC для журнала (или marker, как в lifepay). */
export function buildRawGcJson(gc: GcRawResult): unknown {
  try {
    const parsed = JSON.parse(gc.gcBodyText)
    return redactRawDeep(parsed)
  } catch {
    return {
      __kind: 'raw_text',
      gcHttpStatus: gc.gcStatus,
      gcContentType: gc.gcContentType,
      __rawText: (gc.gcBodyText ?? '').slice(0, 1024)
    }
  }
}

export async function writeGatewayLogs(
  ctx: app.Ctx,
  gwLog: GwLogCtx,
  clientHttpStatus: number,
  errorCode: string
): Promise<void> {
  const requestedAt = gwLog.requestStart
  const durationMs = Date.now() - requestedAt

  try {
    await gatewayRequestLogRepo.create(ctx, {
      requestId: gwLog.requestId,
      op: gwLog.op,
      contour: gwLog.contour,
      method: gwLog.method,
      rawArgs: gwLog.rawArgs,
      rawHeadersSafe: gwLog.rawHeadersSafe,
      clientHttpStatus,
      errorCode,
      durationMs,
      requestedAt
    })
    try {
      await loggerLib.writeServerLog(ctx, {
        severity: 7,
        message: 'writeGatewayLogs requestLog saved',
        payload: { requestId: gwLog.requestId, op: gwLog.op, durationMs }
      })
    } catch {
      // глотаем
    }
  } catch (e) {
    try {
      await loggerLib.writeServerLog(ctx, {
        severity: 3,
        message: `[${LOG_PATH}] gateway_request_log_write_failed`,
        payload: { requestId: gwLog.requestId, op: gwLog.op, error: String(e) }
      })
    } catch {
      // глотаем
    }
  }

  if (gwLog.upstream) {
    try {
      await gatewayUpstreamLogRepo.create(ctx, {
        requestId: gwLog.requestId,
        op: gwLog.op,
        upstreamKind: gwLog.upstream.kind,
        rawGcJson: gwLog.upstream.rawGcJson,
        gcHttpStatus: gwLog.upstream.gcHttpStatus,
        semanticRule: gwLog.upstream.semanticRule,
        durationMs: gwLog.upstream.durationMs,
        sentAt: gwLog.upstream.sentAt
      })
      try {
        await loggerLib.writeServerLog(ctx, {
          severity: 7,
          message: 'writeGatewayLogs upstreamLog saved',
          payload: { requestId: gwLog.requestId, op: gwLog.op }
        })
      } catch {
        // глотаем
      }
    } catch (e) {
      try {
        await loggerLib.writeServerLog(ctx, {
          severity: 3,
          message: `[${LOG_PATH}] gateway_upstream_log_write_failed`,
          payload: { requestId: gwLog.requestId, op: gwLog.op, error: String(e) }
        })
      } catch {
        // глотаем
      }
    }
  }
}

/**
 * Классификация ответа GetCourse и сборка итогового RunResult после успешного
 * вызова per-op handler-а. Заполняет `gwLog.upstream` и пишет серверные логи стадий.
 * Вынесено из runHandleV1Op ради лимита размера файла; поведение и тексты сохранены.
 */
export async function interpretGcAndBuildResult(
  ctx: app.Ctx,
  params: {
    op: string
    contour: 'new' | 'legacy'
    availability: 'enabled' | 'beta' | 'disabled' | 'unsupported'
    gc: GcRawResult
    upstreamStart: number
    requestId: string
    baseLog: (extra: Record<string, unknown>) => Record<string, unknown>
  },
  gwLog: GwLogCtx
): Promise<RunResult> {
  const { op, contour, availability, gc, upstreamStart, requestId, baseLog } = params
  const upstreamDuration = Date.now() - upstreamStart

  const outcome = interpretGcContourResponse({
    contour,
    gcStatus: gc.gcStatus,
    gcContentType: gc.gcContentType,
    gcBodyText: gc.gcBodyText
  })

  // Маппинг исхода → upstreamKind/semanticRule для журнала.
  let upstreamKind: string
  let semanticRule = ''
  if (outcome.kind === 'success') {
    upstreamKind = 'json_ok'
  } else if (outcome.kind === 'upstream_error') {
    upstreamKind = 'upstream_error'
  } else if (outcome.kind === 'json_parse_error') {
    upstreamKind = 'json_parse_error'
  } else {
    upstreamKind = 'semantic'
    semanticRule = outcome.gcRule
  }

  gwLog.upstream = {
    kind: upstreamKind,
    gcHttpStatus: gc.gcStatus,
    rawGcJson: buildRawGcJson(gc),
    semanticRule,
    sentAt: upstreamStart,
    durationMs: upstreamDuration
  }

  if (outcome.kind === 'upstream_error') {
    await loggerLib.writeServerLog(ctx, {
      severity: 4,
      message: `[api/v1/${op}] gc upstream`,
      payload: baseLog({
        logStage: 'gc_upstream',
        errorCode: 'INVOKE_GC_UPSTREAM_ERROR',
        gcHttpStatus: outcome.gcHttpStatus,
        durationMs: upstreamDuration
      })
    })
    return {
      response: v1ErrorResponse('INVOKE_GC_UPSTREAM_ERROR', requestId, {
        gcHttpStatus: outcome.gcHttpStatus
      }),
      errorCode: 'INVOKE_GC_UPSTREAM_ERROR',
      gcDiagnostic: packGcDiagnostic(gc)
    }
  }

  if (outcome.kind === 'json_parse_error') {
    await loggerLib.writeServerLog(ctx, {
      severity: 4,
      message: `[api/v1/${op}] gc json parse`,
      payload: baseLog({
        logStage: 'gc_json_parse_fail',
        errorCode: 'INVOKE_GC_UPSTREAM_ERROR',
        durationMs: upstreamDuration,
        gcHttpStatus: gc.gcStatus
      })
    })
    return {
      response: v1ErrorResponse('INVOKE_GC_UPSTREAM_ERROR', requestId, {
        gcHttpStatus: gc.gcStatus
      }),
      errorCode: 'INVOKE_GC_UPSTREAM_ERROR',
      gcDiagnostic: packGcDiagnostic(gc)
    }
  }

  if (outcome.kind === 'semantic_error') {
    // ранняя ветка — limit error
    if (outcome.gcContour === 'legacy' && outcome.gcRule === 'legacy_result_limit_error') {
      await loggerLib.writeServerLog(ctx, {
        severity: 4,
        message: `[api/v1/${op}] gc semantic limit`,
        payload: baseLog({
          logStage: 'gc_semantic_limit',
          errorCode: 'INVOKE_GC_LIMIT_ERROR',
          gcSemanticRule: outcome.gcRule,
          durationMs: upstreamDuration,
          gcHttpStatus: gc.gcStatus,
          gcBodyPreview: (gc.gcBodyText ?? '').slice(0, 512)
        })
      })
      return {
        response: v1ErrorResponse('INVOKE_GC_LIMIT_ERROR', requestId, {
          gcContour: 'legacy',
          gcRule: outcome.gcRule
        }),
        errorCode: 'INVOKE_GC_LIMIT_ERROR',
        gcDiagnostic: packGcDiagnostic(gc)
      }
    }

    // общая ветка semantic error
    await loggerLib.writeServerLog(ctx, {
      severity: 4,
      message: `[api/v1/${op}] gc semantic`,
      payload: baseLog({
        logStage: 'gc_semantic',
        errorCode: 'INVOKE_GC_SEMANTIC_ERROR',
        gcSemanticRule: outcome.gcRule,
        durationMs: upstreamDuration,
        gcHttpStatus: gc.gcStatus,
        gcBodyPreview: (gc.gcBodyText ?? '').slice(0, 512)
      })
    })
    const semDetails: Record<string, unknown> = {
      gcContour: outcome.gcContour,
      gcRule: outcome.gcRule
    }
    if (outcome.gcContour === 'new') {
      if (outcome.gcNumericCode !== undefined) semDetails.gcNumericCode = outcome.gcNumericCode
      if (outcome.gcErrorsCount !== undefined) semDetails.gcErrorsCount = outcome.gcErrorsCount
    }
    return {
      response: v1ErrorResponse('INVOKE_GC_SEMANTIC_ERROR', requestId, semDetails),
      errorCode: 'INVOKE_GC_SEMANTIC_ERROR',
      gcDiagnostic: packGcDiagnostic(gc)
    }
  }

  await loggerLib.writeServerLog(ctx, {
    severity: 6,
    message: `[api/v1/${op}] ok`,
    payload: baseLog({
      logStage: 'v1_op_ok',
      durationMs: upstreamDuration,
      gcHttpStatus: gc.gcStatus,
      clientHttpStatus: 200
    })
  })

  const warnings = availability === 'beta' ? [GATEWAY_OP_BETA_WARNING_ENTRY] : undefined
  return {
    response: v1SuccessResponse(outcome.data, requestId, warnings),
    errorCode: '',
    gcDiagnostic: packGcDiagnostic(gc)
  }
}
