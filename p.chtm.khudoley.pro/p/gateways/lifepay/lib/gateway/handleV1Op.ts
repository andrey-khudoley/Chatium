/**
 * Общая цепочка обработки `/v1/{op}` (operation-manual §2.6, §2.8, §2.11, §9.0). Инкапсулирует:
 *   1. Генерацию `requestId`.
 *   2. Лог `request_init`.
 *   3. Проверку `availability` по каталогу (`disabled` → `INVOKE_OP_DISABLED`,
 *      `unsupported` → `INVOKE_OP_UNSUPPORTED_BY_LP`).
 *   4. Извлечение и валидацию заголовков `X-Lp-Apikey`/`X-Lp-Login`.
 *   5. Для POST — проверку, что тело — JSON-объект (`INVOKE_BODY_INVALID_JSON`).
 *   6. Валидацию `args` через `argsValidator` из каталога (`INVOKE_ARGS_SCHEMA_VIOLATION`).
 *   7. Вызов прикладного `handler(ctx, { requestId, credentials, args })` → `LpClientResult`.
 *   8. Классификацию транспорта LifePay (`timeout`, `network`, `upstream_status`,
 *      `upstream_parse_error`).
 *   9. Передачу `lpJson` в `semantic`-функцию из вызывающего роута и сборку ответа.
 *
 * Для `availability = 'beta'` в успешный ответ добавляется `warnings` с
 * `GATEWAY_OP_BETA_UNSTABLE` (§2.11).
 *
 * Является middleware-слоем между API и lib: принимает `req` (типично для API-слоя), но живёт
 * в `lib/gateway/` как переиспользуемый хелпер для трёх (и более) файловых роутов `api/v1/{op}.ts`.
 *
 * Вспомогательные функции и аккумулятор журналов вынесены в `handleV1OpHelpers.ts`.
 */

import * as loggerLib from '../logger.lib'
import { findOperation } from './operationsCatalog'
import type { OperationEntry } from './operationsCatalog'
import { generateRequestId } from './requestId'
import {
  buildOkResponse,
  buildErrorResponse,
  GATEWAY_OP_BETA_UNSTABLE_WARNING
} from './gatewayResponse'
import type { GatewayHttpResponse } from './gatewayResponse'
import { extractAndValidateLpCredentials, maskLpLogin } from './lpCredentials'
import type { LpCredentials } from './lpCredentials'
import { GW_OUTBOUND_TIMEOUT_MS, GW_MAX_REQUEST_BODY_BYTES } from './constants'
import type { LpClientResult } from './lifePayClient'
import type { BillsV1SemanticResult } from './billsV1Semantic'
import { redactRawDeep } from '../../shared/redactRaw'
import {
  LOG_PATH,
  type GatewayLogCtx,
  writeGatewayLogs,
  stripSecretHeaders,
  isObject,
  readQuery,
  readBody,
  readHeaders,
  readHeader,
  isJsonContentType,
  estimateBodySize,
  extractLpJsonShape,
  applyPostValidatorChecks
} from './handleV1OpHelpers'

export type HandlerArgs<A> = {
  requestId: string
  credentials: LpCredentials
  args: A
}

/**
 * Результат, который возвращает прикладной handler.
 *
 *   - `kind: 'lp_result'` — транспортная реакция LifePay (timeout/network/upstream/json_ok).
 *     При `json_ok` handler также должен вернуть результат семантической классификации
 *     (`semantic: null` если успех; `BillsV1SemanticResult` если семантическая ошибка) и
 *     `extractSuccess()` для извлечения payload успеха.
 *   - `kind: 'gateway_error'` — handler сам решил вернуть ошибку gateway (например, валидация
 *     прикладного слоя, не покрытая `argsValidator`). Применяется редко.
 */
export type HandlerResult =
  | {
      kind: 'lp_result'
      lp: LpClientResult
      semantic?: BillsV1SemanticResult | null
      successData?: unknown
    }
  | {
      kind: 'gateway_error'
      code: import('./gatewayErrors').GatewayErrorCode
      details?: Record<string, unknown>
    }

export type V1OpHandler<A> = (ctx: app.Ctx, args: HandlerArgs<A>) => Promise<HandlerResult>

export async function handleV1Op<A = Record<string, unknown>>(
  ctx: app.Ctx,
  req: app.Req,
  op: string,
  handler: V1OpHandler<A>
): Promise<GatewayHttpResponse> {
  const requestId = generateRequestId()
  const gwLog: GatewayLogCtx = {
    requestId,
    op,
    contour: '',
    method: '',
    requestStart: Date.now(),
    rawArgs: {},
    rawHeadersSafe: {},
    upstream: null
  }

  let response: GatewayHttpResponse | null = null
  try {
    response = await runHandleV1Op(ctx, req, op, handler, requestId, gwLog)
    return response
  } catch (error) {
    try {
      await loggerLib.writeServerLog(ctx, {
        severity: 3,
        message: `[${LOG_PATH}] internal_error`,
        payload: { requestId, op, error: String(error) }
      })
    } catch {
      // глотаем — лог упал, ответ всё равно нужен
    }
    response = buildErrorResponse(requestId, 'INVOKE_INTERNAL_ERROR')
    return response
  } finally {
    // Запись gatewayRequestLog (всегда) + gatewayUpstreamLog (если был upstream-вызов).
    // Внутри функции — try/catch на каждый repo-вызов, чтобы не валить ответ.
    await writeGatewayLogs(ctx, gwLog, response)
  }
}

async function runHandleV1Op<A>(
  ctx: app.Ctx,
  req: app.Req,
  op: string,
  handler: V1OpHandler<A>,
  requestId: string,
  gwLog: GatewayLogCtx
): Promise<GatewayHttpResponse> {
  await loggerLib.writeServerLog(ctx, {
    severity: 6,
    message: `[${LOG_PATH}] request_init`,
    payload: { requestId, op }
  })

  const headersAll = readHeaders(req)
  gwLog.rawHeadersSafe = redactRawDeep(stripSecretHeaders(headersAll))

  const entry: OperationEntry | null = findOperation(op)
  if (!entry) {
    await loggerLib.writeServerLog(ctx, {
      severity: 3,
      message: `[${LOG_PATH}] op_not_found_in_catalog`,
      payload: { requestId, op }
    })
    return buildErrorResponse(requestId, 'INVOKE_INTERNAL_ERROR')
  }

  gwLog.contour = entry.contour
  gwLog.method = entry.httpMethod

  if (entry.availability === 'disabled') {
    await loggerLib.writeServerLog(ctx, {
      severity: 4,
      message: `[${LOG_PATH}] op_disabled`,
      payload: { requestId, op }
    })
    return buildErrorResponse(requestId, 'INVOKE_OP_DISABLED', { op })
  }
  if (entry.availability === 'unsupported') {
    await loggerLib.writeServerLog(ctx, {
      severity: 4,
      message: `[${LOG_PATH}] op_unsupported`,
      payload: { requestId, op }
    })
    return buildErrorResponse(requestId, 'INVOKE_OP_UNSUPPORTED_BY_LP', { op })
  }

  const headers = headersAll
  if (entry.httpMethod === 'POST') {
    const contentType = readHeader(headers, 'Content-Type')
    if (!isJsonContentType(contentType)) {
      await loggerLib.writeServerLog(ctx, {
        severity: 4,
        message: `[${LOG_PATH}] content_type_unsupported`,
        payload: { requestId, op }
      })
      return buildErrorResponse(requestId, 'INVOKE_CONTENT_TYPE_UNSUPPORTED')
    }
    const size = estimateBodySize(readBody(req), headers)
    if (size > GW_MAX_REQUEST_BODY_BYTES) {
      await loggerLib.writeServerLog(ctx, {
        severity: 4,
        message: `[${LOG_PATH}] body_too_large`,
        payload: { requestId, op, limitBytes: GW_MAX_REQUEST_BODY_BYTES, receivedBytes: size }
      })
      return buildErrorResponse(requestId, 'INVOKE_BODY_TOO_LARGE', {
        limitBytes: GW_MAX_REQUEST_BODY_BYTES,
        receivedBytes: size
      })
    }
  }

  const credResult = extractAndValidateLpCredentials(headers)
  if (credResult.kind === 'error') {
    await loggerLib.writeServerLog(ctx, {
      severity: 4,
      message: `[${LOG_PATH}] auth_header_invalid`,
      payload: { requestId, op, code: credResult.code }
    })
    return buildErrorResponse(requestId, credResult.code, credResult.details)
  }
  const credentials = credResult.credentials

  let rawArgs: unknown
  if (entry.httpMethod === 'POST') {
    const body = readBody(req)
    if (!isObject(body)) {
      await loggerLib.writeServerLog(ctx, {
        severity: 4,
        message: `[${LOG_PATH}] body_invalid_json`,
        payload: { requestId, op, bodyType: Array.isArray(body) ? 'array' : typeof body }
      })
      // Сохраним даже невалидный body как preview-маркер, чтобы было видно в журнале.
      gwLog.rawArgs =
        body === null || body === undefined
          ? { __noBody: true }
          : typeof body === 'string'
            ? { __nonJson: true, __preview: body.slice(0, 1024) }
            : redactRawDeep(body)
      return buildErrorResponse(requestId, 'INVOKE_BODY_INVALID_JSON')
    }
    rawArgs = body
  } else {
    rawArgs = readQuery(req)
  }
  gwLog.rawArgs = redactRawDeep(rawArgs)

  const parsed = entry.argsValidator.safeParse(rawArgs) as
    | { success: true; data: unknown }
    | { success: false; error: { issues?: Array<{ fullPath?: string; message: string }> } }
  if (parsed.success === false) {
    const issues = parsed.error?.issues
    const errors =
      Array.isArray(issues) && issues.length > 0
        ? issues.map((i) => ({ path: i.fullPath ?? '', message: i.message }))
        : [{ path: '', message: 'args не соответствует схеме' }]
    await loggerLib.writeServerLog(ctx, {
      severity: 4,
      message: `[${LOG_PATH}] args_schema_violation`,
      payload: { requestId, op, errors }
    })
    return buildErrorResponse(requestId, 'INVOKE_ARGS_SCHEMA_VIOLATION', { errors })
  }
  const args = parsed.data as Record<string, unknown>

  const postCheck = applyPostValidatorChecks(op, args)
  if (postCheck.kind === 'error') {
    await loggerLib.writeServerLog(ctx, {
      severity: 4,
      message: `[${LOG_PATH}] args_post_validator_violation`,
      payload: { requestId, op, errors: postCheck.errors }
    })
    return buildErrorResponse(requestId, 'INVOKE_ARGS_SCHEMA_VIOLATION', {
      errors: postCheck.errors
    })
  }

  await loggerLib.writeServerLog(ctx, {
    severity: 6,
    message: `[${LOG_PATH}] lp_request_init`,
    payload: {
      requestId,
      op,
      contour: entry.contour,
      method: entry.httpMethod,
      loginMask: maskLpLogin(credentials.login),
      apikeyLength: credentials.apikey.length
    }
  })

  await loggerLib.writeServerLog(ctx, {
    severity: 7,
    message: `[api/v1/${op}] dispatch handler`,
    payload: { requestId, op, argsKeys: Object.keys(args as Record<string, unknown>) }
  })
  const upstreamStart = Date.now()
  const result = await handler(ctx, { requestId, credentials, args: args as A })
  const upstreamDuration = Date.now() - upstreamStart

  // Заполнить gwLog.upstream — это значит «реальный вызов к LifePay был выполнен».
  // gateway_error от handler не считается обращением к LifePay (это локальная ошибка).
  if (result.kind === 'lp_result') {
    const lpResult = result.lp
    let upstreamKind: string = lpResult.kind
    let lpHttpStatus = 0
    let rawLpJson: unknown
    if (lpResult.kind === 'json_ok') {
      lpHttpStatus = lpResult.lpStatus
      rawLpJson = redactRawDeep(lpResult.lpJson)
    } else if (lpResult.kind === 'upstream_status' || lpResult.kind === 'upstream_parse_error') {
      lpHttpStatus = lpResult.lpStatus
      rawLpJson = {
        __kind: lpResult.kind,
        lpHttpStatus: lpResult.lpStatus,
        __rawText: (lpResult.lpRawText ?? '').slice(0, 1024)
      }
    } else {
      // timeout | network_error — без http-статуса.
      rawLpJson = { __kind: lpResult.kind }
    }
    gwLog.upstream = {
      kind: upstreamKind,
      lpHttpStatus,
      rawLpJson,
      semanticRule: result.semantic?.rule ?? '',
      sentAt: upstreamStart,
      durationMs: upstreamDuration
    }
  }

  if (result.kind === 'gateway_error') {
    await loggerLib.writeServerLog(ctx, {
      severity: 3,
      message: `[${LOG_PATH}] gateway_error_from_handler`,
      payload: { requestId, op, code: result.code }
    })
    return buildErrorResponse(requestId, result.code, result.details)
  }

  const lp = result.lp
  if (lp.kind === 'timeout') {
    await loggerLib.writeServerLog(ctx, {
      severity: 3,
      message: `[${LOG_PATH}] lp_timeout`,
      payload: { requestId, op, timeoutMs: GW_OUTBOUND_TIMEOUT_MS }
    })
    return buildErrorResponse(requestId, 'INVOKE_LP_TIMEOUT', { timeoutMs: GW_OUTBOUND_TIMEOUT_MS })
  }
  if (lp.kind === 'network_error') {
    await loggerLib.writeServerLog(ctx, {
      severity: 3,
      message: `[${LOG_PATH}] lp_network_error`,
      payload: { requestId, op }
    })
    return buildErrorResponse(requestId, 'INVOKE_LP_NETWORK_ERROR')
  }
  if (lp.kind === 'upstream_status' || lp.kind === 'upstream_parse_error') {
    await loggerLib.writeServerLog(ctx, {
      severity: 3,
      message: `[${LOG_PATH}] lp_upstream_error`,
      payload: { requestId, op, lpHttpStatus: lp.lpStatus, kind: lp.kind }
    })
    return buildErrorResponse(requestId, 'INVOKE_LP_UPSTREAM_ERROR', { lpHttpStatus: lp.lpStatus })
  }

  if (result.semantic) {
    const details: Record<string, unknown> = {
      lpContour: entry.contour,
      lpRule: result.semantic.rule
    }
    if (typeof result.semantic.lpNumericCode === 'number') {
      details.lpNumericCode = result.semantic.lpNumericCode
    }
    const lpShape = lp.kind === 'json_ok' ? extractLpJsonShape(lp.lpJson) : undefined
    await loggerLib.writeServerLog(ctx, {
      severity: 3,
      message: `[${LOG_PATH}] lp_semantic_error`,
      payload: { requestId, op, ...details, ...(lpShape ? { lpShape } : {}) }
    })
    return buildErrorResponse(requestId, 'INVOKE_LP_SEMANTIC_ERROR', details)
  }

  await loggerLib.writeServerLog(ctx, {
    severity: 6,
    message: `[${LOG_PATH}] lp_response_ok`,
    payload: { requestId, op }
  })

  const warnings = entry.availability === 'beta' ? [GATEWAY_OP_BETA_UNSTABLE_WARNING] : undefined
  return buildOkResponse(requestId, result.successData ?? null, warnings)
}
