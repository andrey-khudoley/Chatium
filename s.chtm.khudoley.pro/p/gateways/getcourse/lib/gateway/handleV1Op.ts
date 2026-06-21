/**
 * Общая цепочка обработки `/v1/{op}` (manual §2.6, §2.8, §2.11, §9.0) по lifepay-модели.
 *
 * Инкапсулирует все проверки (requestId, availability, заголовки школы, devKey, content-type,
 * args-валидация, path-template), а сам исходящий вызов к GetCourse делегирует прикладному
 * per-op handler-у (`api/v1/{op}.ts`). После вызова — единая классификация ответа GC через
 * `interpretGcContourResponse` и сборка ответа `/v1`.
 *
 * В `finally` — запись raw-журналов: `gatewayRequestLog` (всегда) и `gatewayUpstreamLog`
 * (только если был фактический вызов GC). Каждый repo-вызов обёрнут в свой try/catch, чтобы
 * не ломать клиентский ответ.
 *
 * ВАЖНО (против циклов импорта): этот файл НЕ импортирует `v1OpHandlers.ts` и `api/v1/*`.
 * Зависимость односторонняя: `api/v1/{op}.ts` → `handleV1Op.ts`.
 *
 * Типы и журнальные помощники — в `handleV1OpHelpers`; основная цепочка проверок —
 * в `handleV1OpRun` (вынесено ради лимита размера файла). Здесь — обёртка с записью
 * журналов в `finally` и публичные точки входа.
 */

import * as loggerLib from '../logger.lib'
import { newGatewayRequestId } from './requestId'
import { v1ErrorResponse, type V1TuneResponse } from './v1TuneResponse'
import { redactRawDeep } from '../../shared/redactRaw'
import {
  type V1IncomingLike,
  type V1GcDiagnostic,
  type V1GcHandler,
  type GwLogCtx,
  type RunResult,
  readHeadersObject,
  stripSecretHeaders,
  writeGatewayLogs
} from './handleV1OpHelpers'
import { runHandleV1Op } from './handleV1OpRun'

export type {
  V1IncomingLike,
  V1GcDiagnostic,
  GcRawResult,
  HandlerArgs,
  GcHandlerResult,
  V1GcHandler
} from './handleV1OpHelpers'

/** Внутренняя обёртка: единый прогон + запись журналов в finally. */
async function executeWithLogging(
  ctx: app.Ctx,
  req: V1IncomingLike,
  op: string,
  handler: V1GcHandler
): Promise<RunResult> {
  const requestId = newGatewayRequestId()
  const gwLog: GwLogCtx = {
    requestId,
    op,
    contour: '',
    method: String(req.method ?? 'GET').toUpperCase(),
    requestStart: Date.now(),
    rawArgs: {},
    rawHeadersSafe: redactRawDeep(stripSecretHeaders(readHeadersObject(req.headers))),
    upstream: null
  }

  let result: RunResult | null = null
  try {
    await loggerLib.writeServerLog(ctx, {
      severity: 6,
      message: `[api/v1/${op}] execute start`,
      payload: { requestId, op, method: String(req.method ?? 'GET').toUpperCase() }
    })
    result = await runHandleV1Op(ctx, req, op, handler, gwLog)
    return result
  } catch (error) {
    try {
      await loggerLib.writeServerLog(ctx, {
        severity: 3,
        message: `[api/v1/${op}] internal`,
        payload: {
          requestId,
          op,
          logStage: 'v1_op_internal',
          errorCode: 'INVOKE_INTERNAL_ERROR',
          error: error instanceof Error ? error.message : String(error)
        }
      })
    } catch {
      // глотаем — лог упал, ответ всё равно нужен
    }
    result = {
      response: v1ErrorResponse('INVOKE_INTERNAL_ERROR', requestId),
      errorCode: 'INVOKE_INTERNAL_ERROR'
    }
    return result
  } finally {
    const clientHttpStatus = result?.response.statusCode ?? 500
    const errorCode = result?.errorCode ?? 'INVOKE_INTERNAL_ERROR'
    await writeGatewayLogs(ctx, gwLog, clientHttpStatus, errorCode)
  }
}

/** Публичная точка входа для файловых роутов `api/v1/{op}.ts`. */
export async function handleV1Op(
  ctx: app.Ctx,
  req: V1IncomingLike,
  op: string,
  handler: V1GcHandler
): Promise<V1TuneResponse> {
  const result = await executeWithLogging(ctx, req, op, handler)
  return result.response
}

/**
 * Как `handleV1Op`, плюс сырой ответ GetCourse для админского сьюита тестов
 * (`lib/tests/gateway/v1OpsSuiteRunner.ts`). Публичные роуты должны звать только `handleV1Op`.
 */
export async function handleV1OpWithGcDiagnostic(
  ctx: app.Ctx,
  req: V1IncomingLike,
  op: string,
  handler: V1GcHandler
): Promise<{ response: V1TuneResponse; gcDiagnostic?: V1GcDiagnostic }> {
  const result = await executeWithLogging(ctx, req, op, handler)
  return { response: result.response, gcDiagnostic: result.gcDiagnostic }
}
