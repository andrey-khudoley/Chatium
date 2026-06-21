/**
 * Основная цепочка проверок и вызова per-op handler для `/v1/{op}`. Вынесено из
 * handleV1Op ради лимита размера файла; используется через executeWithLogging.
 */
import * as loggerLib from '../logger.lib'
import * as settingsLib from '../settings.lib'
import { GW_OUTBOUND_TIMEOUT_MS, GW_MAX_REQUEST_BODY_BYTES } from './constants'
import { applyPathTemplate } from './pathTemplate'
import { findOperationCatalogEntry } from './operationsCatalog'
import {
  extractJsonObjectArgs,
  isApplicationJsonContentType,
  measureSerializedBodyBytes,
  parseContentLengthBytes,
  parseSchoolHeaders
} from './v1IncomingPost'
import { parseFlatQueryArgs } from './v1GatewayQuery'
import { v1ErrorResponse } from './v1TuneResponse'
import { redactRawDeep } from '../../shared/redactRaw'
import {
  type V1IncomingLike,
  type V1GcDiagnostic,
  type GcHandlerResult,
  type HandlerArgs,
  type V1GcHandler,
  type GwLogCtx,
  type RunResult,
  detectSchoolHostPresent,
  interpretGcAndBuildResult
} from './handleV1OpHelpers'

export async function runHandleV1Op(
  ctx: app.Ctx,
  req: V1IncomingLike,
  op: string,
  handler: V1GcHandler,
  gwLog: GwLogCtx
): Promise<RunResult> {
  const requestId = gwLog.requestId
  const httpMethod = String(req.method ?? 'GET').toUpperCase()
  const entry = findOperationCatalogEntry(op)
  const schoolHostPresent = detectSchoolHostPresent(req.headers)

  const baseLog = (extra: Record<string, unknown>) => ({
    requestId,
    op,
    httpMethod,
    contour: entry?.contour,
    availability: entry?.availability,
    schoolHostPresent,
    ...extra
  })

  const finishError = (
    code: string,
    extra?: Record<string, unknown>,
    gcDiagnostic?: V1GcDiagnostic
  ): RunResult => ({
    response: v1ErrorResponse(code, requestId, extra),
    errorCode: code,
    ...(gcDiagnostic ? { gcDiagnostic } : {})
  })

  await loggerLib.writeServerLog(ctx, {
    severity: 6,
    message: `[api/v1/${op}] start`,
    payload: baseLog({ logStage: 'v1_op_start' })
  })

  if (!entry) {
    // manual §3.5: файл роута есть, а записи в каталоге нет — это рассогласование сборки,
    // а не INVOKE_OP_UNKNOWN (тот — платформенный 404, когда файла роута нет).
    await loggerLib.writeServerLog(ctx, {
      severity: 3,
      message: `[api/v1/${op}] catalog entry missing for existing route file`,
      payload: baseLog({ logStage: 'catalog_entry_missing', errorCode: 'INVOKE_INTERNAL_ERROR' })
    })
    return finishError('INVOKE_INTERNAL_ERROR')
  }

  gwLog.contour = entry.contour
  gwLog.method = entry.httpMethod

  if (httpMethod !== entry.httpMethod) {
    await loggerLib.writeServerLog(ctx, {
      severity: 6,
      message: `[api/v1/${op}] method not allowed`,
      payload: baseLog({
        logStage: 'http_method_not_allowed',
        errorCode: 'INVOKE_HTTP_METHOD_NOT_ALLOWED',
        expectedMethod: entry.httpMethod
      })
    })
    return finishError('INVOKE_HTTP_METHOD_NOT_ALLOWED', { expectedMethod: entry.httpMethod })
  }

  // manual §2.6: проверка availability — до заголовков школы и чтения devKey.
  const availability = entry.availability
  if (availability === 'disabled') {
    await loggerLib.writeServerLog(ctx, {
      severity: 6,
      message: `[api/v1/${op}] op disabled`,
      payload: baseLog({ logStage: 'op_disabled', errorCode: 'INVOKE_OP_DISABLED' })
    })
    return finishError('INVOKE_OP_DISABLED', { op })
  }
  if (availability === 'unsupported') {
    await loggerLib.writeServerLog(ctx, {
      severity: 6,
      message: `[api/v1/${op}] op unsupported`,
      payload: baseLog({ logStage: 'op_unsupported', errorCode: 'INVOKE_OP_UNSUPPORTED_BY_GC' })
    })
    return finishError('INVOKE_OP_UNSUPPORTED_BY_GC', { op })
  }

  const cl = parseContentLengthBytes(req.headers)
  if (cl !== null && cl > GW_MAX_REQUEST_BODY_BYTES) {
    await loggerLib.writeServerLog(ctx, {
      severity: 6,
      message: `[api/v1/${op}] body too large (content-length)`,
      payload: baseLog({
        logStage: 'body_too_large',
        limitBytes: GW_MAX_REQUEST_BODY_BYTES,
        receivedBytes: cl
      })
    })
    return finishError('INVOKE_BODY_TOO_LARGE', {
      limitBytes: GW_MAX_REQUEST_BODY_BYTES,
      receivedBytes: cl
    })
  }

  const measured = measureSerializedBodyBytes(req.body)
  if (cl === null && measured > GW_MAX_REQUEST_BODY_BYTES) {
    await loggerLib.writeServerLog(ctx, {
      severity: 6,
      message: `[api/v1/${op}] body too large (measured)`,
      payload: baseLog({
        logStage: 'body_too_large',
        limitBytes: GW_MAX_REQUEST_BODY_BYTES,
        receivedBytes: measured
      })
    })
    return finishError('INVOKE_BODY_TOO_LARGE', {
      limitBytes: GW_MAX_REQUEST_BODY_BYTES,
      receivedBytes: measured
    })
  }

  const hdrs = parseSchoolHeaders(req.headers)
  if (hdrs.ok === false) {
    const details =
      hdrs.code === 'INVOKE_SCHOOL_HOST_INVALID' && hdrs.hint ? { hint: hdrs.hint } : undefined
    await loggerLib.writeServerLog(ctx, {
      severity: 6,
      message: `[api/v1/${op}] school headers`,
      payload: baseLog({ logStage: 'school_headers_fail', errorCode: hdrs.code })
    })
    return finishError(hdrs.code, details)
  }

  const rawDev = await settingsLib.getSetting(ctx, settingsLib.SETTING_KEYS.GC_DEVELOPER_API_KEY)
  const devKey = typeof rawDev === 'string' ? rawDev.trim() : ''
  if (!devKey) {
    await loggerLib.writeServerLog(ctx, {
      severity: 4,
      message: `[api/v1/${op}] dev key not configured`,
      payload: baseLog({ logStage: 'dev_key_missing', errorCode: 'GATEWAY_DEV_KEY_NOT_CONFIGURED' })
    })
    return finishError('GATEWAY_DEV_KEY_NOT_CONFIGURED')
  }

  let rawArgs: Record<string, unknown>
  if (entry.httpMethod === 'POST') {
    if (!isApplicationJsonContentType(req.headers)) {
      await loggerLib.writeServerLog(ctx, {
        severity: 6,
        message: `[api/v1/${op}] content-type`,
        payload: baseLog({
          logStage: 'content_type_fail',
          errorCode: 'INVOKE_CONTENT_TYPE_UNSUPPORTED'
        })
      })
      return finishError('INVOKE_CONTENT_TYPE_UNSUPPORTED')
    }
    const argsEx = extractJsonObjectArgs(req.body)
    if (!argsEx.ok) {
      await loggerLib.writeServerLog(ctx, {
        severity: 6,
        message: `[api/v1/${op}] body not json object`,
        payload: baseLog({ logStage: 'body_invalid_json', errorCode: 'INVOKE_BODY_INVALID_JSON' })
      })
      return finishError('INVOKE_BODY_INVALID_JSON')
    }
    rawArgs = argsEx.args
  } else {
    rawArgs = parseFlatQueryArgs(req.query as Record<string, unknown> | undefined)
  }
  gwLog.rawArgs = redactRawDeep(rawArgs)

  const schema = entry.argsValidator
  const parsed = schema.safeParse(rawArgs) as
    | { success: true; data: unknown }
    | {
        success: false
        error: {
          errors?: Array<{ fullPath?: string; message: string }>
          data?: { fields?: Record<string, string> }
        }
      }
  if (!parsed.success) {
    const issues = parsed.error.errors ?? []
    const errors =
      issues.length > 0
        ? issues.map((iss) => ({ path: iss.fullPath ?? '', message: iss.message }))
        : Object.entries(parsed.error.data?.fields ?? {}).map(([path, message]) => ({
            path,
            message
          }))
    await loggerLib.writeServerLog(ctx, {
      severity: 6,
      message: `[api/v1/${op}] args schema`,
      payload: baseLog({ logStage: 'args_schema_fail', errorCode: 'INVOKE_ARGS_SCHEMA_VIOLATION' })
    })
    return finishError('INVOKE_ARGS_SCHEMA_VIOLATION', { errors })
  }
  const args = parsed.data as Record<string, unknown>

  let resolvedPath: string
  let restArgs: Record<string, unknown>
  try {
    const applied = applyPathTemplate(entry.pathTemplate, args)
    resolvedPath = applied.path
    restArgs = applied.restArgs
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e)
    const m = /^MISSING_PATH_PARAM:(.+)$/.exec(msg)
    const paramName = m?.[1] ?? 'path'
    await loggerLib.writeServerLog(ctx, {
      severity: 6,
      message: `[api/v1/${op}] path template`,
      payload: baseLog({ logStage: 'path_param_missing', paramName })
    })
    return finishError('INVOKE_ARGS_SCHEMA_VIOLATION', {
      errors: [
        {
          path: paramName,
          message: 'Отсутствует значение для подстановки в путь URL GetCourse'
        }
      ]
    })
  }

  // ─── Вызов per-op handler (единственное место исходящего вызова к GC) ───
  const handlerArgs: HandlerArgs = {
    requestId,
    schoolHost: hdrs.schoolHost,
    schoolApiKey: hdrs.schoolApiKey,
    devKey,
    resolvedPath,
    restArgs,
    args,
    entry
  }

  const upstreamStart = Date.now()
  let handlerResult: GcHandlerResult
  try {
    await loggerLib.writeServerLog(ctx, {
      severity: 7,
      message: `[api/v1/${op}] dispatch handler`,
      payload: { requestId, op, argsKeys: Object.keys(args as Record<string, unknown>) }
    })
    handlerResult = await handler(ctx, handlerArgs)
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e)
    const isTimeout = msg === 'INVOKE_GC_TIMEOUT'
    const upstreamDuration = Date.now() - upstreamStart
    gwLog.upstream = {
      kind: isTimeout ? 'timeout' : 'network_error',
      gcHttpStatus: 0,
      rawGcJson: { __kind: isTimeout ? 'timeout' : 'network_error' },
      semanticRule: '',
      sentAt: upstreamStart,
      durationMs: upstreamDuration
    }
    await loggerLib.writeServerLog(ctx, {
      severity: 3,
      message: `[api/v1/${op}] gc invoke error`,
      payload: baseLog({
        logStage: 'gc_invoke_throw',
        errorCode: isTimeout ? 'INVOKE_GC_TIMEOUT' : 'INVOKE_GC_NETWORK_ERROR'
      })
    })
    if (isTimeout) {
      return finishError('INVOKE_GC_TIMEOUT', { timeoutMs: GW_OUTBOUND_TIMEOUT_MS })
    }
    return finishError('INVOKE_GC_NETWORK_ERROR')
  }

  if (handlerResult.kind === 'gateway_error') {
    await loggerLib.writeServerLog(ctx, {
      severity: 3,
      message: `[api/v1/${op}] gateway_error_from_handler`,
      payload: baseLog({ logStage: 'gateway_error_from_handler', errorCode: handlerResult.code })
    })
    return finishError(handlerResult.code, handlerResult.details)
  }

  const gc = handlerResult.gc

  return interpretGcAndBuildResult(
    ctx,
    {
      op,
      contour: entry.contour,
      availability,
      gc,
      upstreamStart,
      requestId,
      baseLog
    },
    gwLog
  )
}
