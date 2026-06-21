/**
 * Запись результата invoke в Heap-таблицу request_log (implementation-plan §1.8.1).
 *
 * Поля `errorCode`, `lpHttpStatus`, `lpSemanticRule`, `lpNumericCode`
 * извлекаются из тела ответа gateway (§9.1).
 *
 * Args и rawResponseBody пишутся **сырыми** (клиент — оператор ПД, маскировать
 * не требуется). `shared/prepareRawLog.prepareRawLog` делает только структурную
 * гигиену (циклы, несериализуемое, усечение по размеру).
 */

import * as requestLogRepo from '../../repos/requestLog.repo'
import * as loggerLib from '../logger.lib'
import { extractOrderNumber } from '../../shared/redact'
import { prepareRawLog } from '../../shared/prepareRawLog'
import type { GatewayId } from '../../shared/invokeApi'
import type { InvokeResult } from './invokeResult'

const LOG_MODULE = 'lib/gateway/recordRequestLog'

export type RecordParams = {
  /** Идентификатор гейтвея — сохраняется в Heap для UI-индикации. */
  gatewayId: GatewayId
  op: string
  args: Record<string, unknown>
  invoke: InvokeResult
  /** correlationId из args запроса (не пробрасывается в gateway, хранится для связки с webhook). */
  correlationId?: string
  /** GC поле number (номер заказа) из getDealFields — для последующей передачи в createDeal.deal_number. */
  gcDealNumber?: string
}

/**
 * Извлечь errorCode из тела ответа gateway. Если ok === true или тела нет — пустая строка.
 */
function extractErrorCode(invoke: InvokeResult): string {
  if (invoke.proxyError) return invoke.proxyError
  const body = invoke.responseBody
  if (!body || body.ok === true) return ''
  const error = (body as Record<string, unknown>).error
  if (error && typeof error === 'object') {
    const code = (error as Record<string, unknown>).code
    if (typeof code === 'string') return code
  }
  return ''
}

function extractDetailNumber(invoke: InvokeResult, key: string): number {
  const body = invoke.responseBody
  if (!body) return 0
  const error = (body as Record<string, unknown>).error
  if (error && typeof error === 'object') {
    const details = (error as Record<string, unknown>).details
    if (details && typeof details === 'object') {
      const v = (details as Record<string, unknown>)[key]
      if (typeof v === 'number' && Number.isFinite(v)) return v
    }
  }
  return 0
}

function extractDetailString(invoke: InvokeResult, key: string): string {
  const body = invoke.responseBody
  if (!body) return ''
  const error = (body as Record<string, unknown>).error
  if (error && typeof error === 'object') {
    const details = (error as Record<string, unknown>).details
    if (details && typeof details === 'object') {
      const v = (details as Record<string, unknown>)[key]
      if (typeof v === 'string') return v
    }
  }
  return ''
}

export async function recordRequestLog(ctx: app.Ctx, params: RecordParams): Promise<void> {
  await loggerLib.writeServerLog(ctx, {
    severity: 6,
    message: `[${LOG_MODULE}] recordRequestLog entry`,
    payload: { op: params.op, ok: params.invoke.ok, requestId: params.invoke.requestId }
  })

  const argsForLog = prepareRawLog(params.args)
  const orderNumber = extractOrderNumber(params.args)
  const errorCode = extractErrorCode(params.invoke)
  const lpHttpStatus = extractDetailNumber(params.invoke, 'lpHttpStatus')
  const lpNumericCode = extractDetailNumber(params.invoke, 'lpNumericCode')
  const lpSemanticRule = extractDetailString(params.invoke, 'lpRule')

  // rawResponseBody: предпочтительно из распарсенного responseBody, иначе пытаемся
  // распарсить rawResponseBody (text). Если не парсится — храним preview.
  let rawForLog: unknown
  if (params.invoke.responseBody && typeof params.invoke.responseBody === 'object') {
    rawForLog = prepareRawLog(params.invoke.responseBody)
  } else if (params.invoke.rawResponseBody) {
    try {
      const parsed = JSON.parse(params.invoke.rawResponseBody)
      rawForLog = prepareRawLog(parsed)
    } catch {
      rawForLog = {
        __nonJson: true,
        __preview: params.invoke.rawResponseBody.slice(0, 1024)
      }
    }
  } else {
    rawForLog = { __noBody: true }
  }

  try {
    await requestLogRepo.create(ctx, {
      requestId: params.invoke.requestId,
      gatewayId: params.gatewayId,
      op: params.op,
      argsRedacted: argsForLog,
      orderNumber,
      correlationId: params.correlationId || undefined,
      gcDealNumber: params.gcDealNumber || undefined,
      clientHttpStatus: params.invoke.httpStatus,
      ok: params.invoke.ok,
      errorCode,
      lpHttpStatus,
      lpSemanticRule,
      lpNumericCode,
      durationMs: params.invoke.durationMs,
      requestedAt: Date.now(),
      rawResponseBody: rawForLog
    })
  } catch (e) {
    // Не валим основной поток из-за ошибки записи лога.
    await loggerLib.writeServerLog(ctx, {
      severity: 3,
      message: `[${LOG_MODULE}] heap_write_failed`,
      payload: { op: params.op, error: String(e) }
    })
  }

  await loggerLib.writeServerLog(ctx, {
    severity: 6,
    message: `[${LOG_MODULE}] recordRequestLog exit`,
    payload: { op: params.op }
  })
}
