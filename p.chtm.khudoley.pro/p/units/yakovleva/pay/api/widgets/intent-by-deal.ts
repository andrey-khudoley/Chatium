/**
 * `POST /api/widgets/intent-by-deal` — публичная инициация платежа по id
 * заказа GetCourse (deal-поток виджета). Поддерживает методы 'lifepay' и 'lavatop'.
 *
 * ВНИМАНИЕ: эндпоинт сознательно публичный. Защита:
 *   1) Серверный hard-limit `WIDGET_INTENT_HARD_LIMIT_RUB`.
 *   2) Метод должен быть включён (lifepayEnabled / lavatopEnabled).
 *   3) Сумма, email и валюта берутся с сервера из GC (не от клиента) —
 *      dealId указывает на конкретный заказ в GetCourse.
 *   4) Audit-лог через `loggerLib.writeServerLog` на каждый вызов.
 *
 * `requireRealUser`/`requireInternalAccess` НЕ применяются сознательно —
 * userscript исполняется в браузере покупателя.
 *
 * Тело запроса принимается как JSON-строка с Content-Type: text/plain (CORS
 * preflight-обход — аналогично intent-lifepay.ts).
 *
 * Порядок проверок (безопасность мутирующего вызова):
 *   getWidgetSettings → parseBody → method → enabled-флаг → dealId валидация →
 *   (только после всех проверок) резолвер / мутация.
 * Проверка Origin/домена отключена: виджеты должны работать с любого сайта.
 */

import { runWithExclusiveLock, LockAcquisitionError } from '@app/sync'
import * as loggerLib from '../../lib/logger.lib'
import * as settingsLib from '../../lib/settings.lib'
import { getWidgetSettings } from '../../lib/widget/widgetSettings.lib'
import { WIDGET_INTENT_HARD_LIMIT_RUB, areAllOffersAllowed } from '../../shared/widgetSettingsTypes'
import { invokeByGateway } from '../../lib/gateway/invokeDispatcher'
import { recordRequestLog } from '../../lib/gateway/recordRequestLog'
import { resolveGcDeal } from '../../lib/gateway/gcDealResolver'
import {
  handleLavatopDealIntent,
  type LavatopInvoiceOptions
} from '../../lib/gateway/lavatopDealIntent'
import { findCachedBill } from '../../lib/gateway/idempotentBillCache'
import type { PaymentCurrency } from '../../lib/rates/currencyConverter'
import { getFullUrl, ROUTES } from '../../config/routes'
import { appendCorrelationId } from '../../shared/correlation'
import { BILL_LOCK_WAIT_MS, BILL_LOCK_MAX_DURATION_MS } from '../../lib/gateway/constants'

const LOG_PATH = 'api/widgets/intent-by-deal'

type WidgetIntentByDealRequestBody = {
  method?: unknown
  dealId?: unknown
} & Record<string, unknown>

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v)
}

function parseBody(req: app.Req): WidgetIntentByDealRequestBody | null {
  const raw = (req as unknown as { body?: unknown }).body
  if (isObject(raw)) return raw as WidgetIntentByDealRequestBody
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw)
      return isObject(parsed) ? (parsed as WidgetIntentByDealRequestBody) : null
    } catch {
      return null
    }
  }
  return null
}

function buildCorsHeaders(): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    'Cache-Control': 'no-store',
    'Access-Control-Allow-Origin': '*'
  }
}

function jsonResponse(
  statusCode: number,
  body: Record<string, unknown>,
  extraHeaders: Record<string, string>
) {
  return {
    statusCode,
    rawHttpBody: JSON.stringify(body),
    headers: extraHeaders
  }
}

function readOptionalString(body: Record<string, unknown>, key: string): string | undefined {
  const value = body[key]
  if (typeof value !== 'string') return undefined
  const trimmed = value.trim()
  return trimmed ? trimmed : undefined
}

function readLavatopInvoiceOptions(body: Record<string, unknown>): LavatopInvoiceOptions {
  const options: LavatopInvoiceOptions = {}
  const paymentProvider = readOptionalString(body, 'paymentProvider')
  const paymentMethod = readOptionalString(body, 'paymentMethod')
  const buyerLanguage = readOptionalString(body, 'buyerLanguage')
  const periodicity = readOptionalString(body, 'periodicity')

  if (paymentProvider) options.paymentProvider = paymentProvider
  if (paymentMethod) options.paymentMethod = paymentMethod
  if (buyerLanguage) options.buyerLanguage = buyerLanguage
  if (periodicity) options.periodicity = periodicity
  if (isObject(body.clientUtm)) options.clientUtm = body.clientUtm

  return options
}

/** Маппинг кода ошибки резолвера на HTTP-статус ответа. */
function resolveErrorToHttpStatus(code: string): 400 | 404 | 409 | 422 | 502 {
  switch (code) {
    case 'WIDGET_GC_DEAL_ID_INVALID':
      return 400
    case 'WIDGET_GC_DEAL_NOT_FOUND':
      return 404
    case 'WIDGET_GC_ALREADY_PAID':
      return 409
    case 'WIDGET_GC_EMAIL_MISSING':
    case 'WIDGET_GC_CURRENCY_UNSUPPORTED':
      return 422
    case 'WIDGET_GC_GATEWAY_ERROR':
    default:
      return 502
  }
}

export const widgetIntentByDealRoute = app.post('/', async (ctx, req) => {
  const settings = await getWidgetSettings(ctx)

  const body = parseBody(req)
  if (!body) {
    return jsonResponse(400, { ok: false, error: 'WIDGET_BODY_INVALID' }, buildCorsHeaders())
  }

  // Метод: разрешены 'lifepay' и 'lavatop'; дефолт — 'lifepay'
  const methodRaw = body.method
  const method = typeof methodRaw === 'string' ? methodRaw.trim() : 'lifepay'
  if (method !== 'lifepay' && method !== 'lavatop') {
    return jsonResponse(
      400,
      { ok: false, error: 'WIDGET_GC_METHOD_UNSUPPORTED' },
      buildCorsHeaders()
    )
  }

  await loggerLib.writeServerLog(ctx, {
    severity: 6,
    message: `[${LOG_PATH}] entry`,
    payload: { method }
  })

  // Флаг включённости по методу
  const enabled = method === 'lavatop' ? settings.lavatopEnabled : settings.lifepayEnabled
  if (!enabled) {
    await loggerLib.writeServerLog(ctx, {
      severity: 4,
      message: `[${LOG_PATH}] widget_intent_by_deal: method_disabled`,
      payload: { method, ok: false }
    })
    return jsonResponse(403, { ok: false, error: 'WIDGET_METHOD_DISABLED' }, buildCorsHeaders())
  }

  // Валидация dealId из тела запроса
  const dealIdRaw = body.dealId
  if (
    (typeof dealIdRaw !== 'string' && typeof dealIdRaw !== 'number') ||
    String(dealIdRaw).trim() === ''
  ) {
    return jsonResponse(400, { ok: false, error: 'WIDGET_GC_DEAL_ID_INVALID' }, buildCorsHeaders())
  }

  // ── Ветвь Lava.Top ─────────────────────────────────────────────────────────
  if (method === 'lavatop') {
    // currency обязателен; нормализация toUpperCase; допустимые: RUB, USD, EUR
    const currencyRaw = typeof body.currency === 'string' ? body.currency.trim().toUpperCase() : ''
    if (currencyRaw !== 'RUB' && currencyRaw !== 'USD' && currencyRaw !== 'EUR') {
      return jsonResponse(
        400,
        { ok: false, error: 'WIDGET_LAVATOP_CURRENCY_INVALID' },
        buildCorsHeaders()
      )
    }
    const currency = currencyRaw as PaymentCurrency
    const invoiceOptions = readLavatopInvoiceOptions(body)

    const result = await handleLavatopDealIntent(ctx, {
      dealId: dealIdRaw,
      currency,
      corsHostname: '',
      invoiceOptions
    })

    if (!result.ok) {
      await loggerLib.writeServerLog(ctx, {
        severity: 4,
        message: `[${LOG_PATH}] widget_intent_by_deal: lavatop_fail`,
        payload: {
          method,
          dealId: String(dealIdRaw).trim(),
          currency,
          code: result.code,
          httpStatus: result.httpStatus,
          ok: false
        }
      })
      return jsonResponse(result.httpStatus, { ok: false, error: result.code }, buildCorsHeaders())
    }

    return jsonResponse(
      200,
      {
        ok: true,
        method: 'lavatop',
        paymentUrl: result.paymentUrl,
        correlationId: result.correlationId,
        requestId: result.requestId
      },
      buildCorsHeaders()
    )
  }

  // ── Ветвь LifePay (существующая логика без изменений) ──────────────────────

  // Резолвинг заказа из GC
  const resolved = await resolveGcDeal(ctx, dealIdRaw)
  if (!resolved.ok) {
    await loggerLib.writeServerLog(ctx, {
      severity: 4,
      message: `[${LOG_PATH}] widget_intent_by_deal: resolve_fail`,
      payload: {
        method: 'lifepay',
        dealId: String(dealIdRaw).trim(),
        code: resolved.code,
        ok: false
      }
    })
    return jsonResponse(
      resolveErrorToHttpStatus(resolved.code),
      { ok: false, error: resolved.code },
      buildCorsHeaders()
    )
  }

  const amount = resolved.amount

  // Фильтр суммы (hard-limit и пользовательские ограничения)
  if (amount > WIDGET_INTENT_HARD_LIMIT_RUB) {
    await loggerLib.writeServerLog(ctx, {
      severity: 4,
      message: `[${LOG_PATH}] widget_intent_by_deal: hard_limit_exceeded`,
      payload: {
        method: 'lifepay',
        amount,
        hardLimit: WIDGET_INTENT_HARD_LIMIT_RUB,
        ok: false
      }
    })
    return jsonResponse(
      400,
      { ok: false, error: 'WIDGET_AMOUNT_EXCEEDS_HARD_LIMIT' },
      buildCorsHeaders()
    )
  }
  if (settings.lifepayMin > 0 && amount < settings.lifepayMin) {
    return jsonResponse(400, { ok: false, error: 'WIDGET_AMOUNT_BELOW_MIN' }, buildCorsHeaders())
  }
  if (settings.lifepayMax > 0 && amount > settings.lifepayMax) {
    return jsonResponse(
      400,
      { ok: false, error: 'WIDGET_AMOUNT_EXCEEDS_LIMIT' },
      buildCorsHeaders()
    )
  }

  // Серверная проверка допуска по позициям заказа из GC
  if (
    !areAllOffersAllowed(resolved.positions, settings.lifepayOffers, settings.lifepayOfferListType)
  ) {
    await loggerLib.writeServerLog(ctx, {
      severity: 4,
      message: `[${LOG_PATH}] widget_intent_by_deal: offer_not_allowed`,
      payload: {
        method: 'lifepay',
        positionsCount: resolved.positions.length,
        listType: settings.lifepayOfferListType,
        ok: false
      }
    })
    return jsonResponse(403, { ok: false, error: 'WIDGET_OFFER_NOT_ALLOWED' }, buildCorsHeaders())
  }

  // Детерминированный orderNumber и correlationId по dealId (сырой числовой dealId после нормализации, без префикса)
  const dealIdNormalized = String(Number(String(dealIdRaw).trim()))
  const orderNumber = dealIdNormalized
  const correlationId = dealIdNormalized

  // Webhook callback URL: token из настроек + correlationId через appendCorrelationId
  const webhookToken = await settingsLib.getLpWebhookToken(ctx)
  const baseCallbackUrl = webhookToken
    ? `https://${ctx.account.host}${getFullUrl(ROUTES.webhook)}?token=${webhookToken}`
    : ''
  const callbackUrl = baseCallbackUrl ? appendCorrelationId(baseCallbackUrl, correlationId).url : ''

  const args: Record<string, unknown> = {
    orderNumber,
    amount: resolved.amount,
    customerEmail: resolved.email,
    description: resolved.title || `Оплата заказа ${dealIdNormalized}`,
    callbackUrl,
    correlationId
  }
  if (typeof body.customerPhone === 'string' && body.customerPhone.trim().length > 0) {
    args.customerPhone = body.customerPhone.trim()
  }

  // correlationId не должен уходить в gateway — удаляем из копии args (по образцу api/gateways/invoke.ts)
  const argsForGateway: Record<string, unknown> = { ...args }
  delete argsForGateway.correlationId

  // Идемпотентность: лок на ключ orderNumber — повторный вызов возвращает кэшированный paymentUrl
  type BillResult =
    | { cached: true; paymentUrl: string; requestId: string }
    | { cached: false; ok: boolean; paymentUrl: string; requestId: string }

  let billResult: BillResult
  try {
    billResult = await runWithExclusiveLock(
      ctx,
      `yakovleva-pay:bill-idempotency:lifepay:${orderNumber}`,
      { timeoutMs: BILL_LOCK_WAIT_MS, maxDurationMs: BILL_LOCK_MAX_DURATION_MS },
      async (lockCtx: app.Ctx): Promise<BillResult> => {
        // (a) Проверить кэш
        const hit = await findCachedBill(lockCtx, {
          op: 'createBill',
          gatewayId: 'lifepay',
          orderNumber,
          expectedAmount: resolved.amount
        })
        if (hit && hit.paymentUrl) {
          return { cached: true, paymentUrl: hit.paymentUrl, requestId: hit.requestId }
        }

        // (b) Cache miss — вызов gateway
        const result = await invokeByGateway(lockCtx, 'lifepay', 'createBill', argsForGateway)
        const responseBody = result.responseBody ?? {}
        const paymentUrl =
          (typeof responseBody.paymentUrl === 'string' && responseBody.paymentUrl) ||
          (typeof (responseBody.data as Record<string, unknown> | undefined)?.paymentUrl ===
            'string' &&
            ((responseBody.data as Record<string, unknown>).paymentUrl as string)) ||
          ''

        // Запись в request_log внутри лока (покрывает ok=false и ok=true без paymentUrl)
        try {
          await recordRequestLog(lockCtx, {
            gatewayId: 'lifepay',
            op: 'createBill',
            args: argsForGateway,
            invoke: result,
            correlationId,
            gcDealNumber: resolved.dealNumber
          })
        } catch (e) {
          await loggerLib.writeServerLog(lockCtx, {
            severity: 3,
            message: `[${LOG_PATH}] record_log_failed`,
            payload: { correlationId, error: String(e) }
          })
        }

        return { cached: false, ok: result.ok, paymentUrl, requestId: result.requestId }
      }
    )
  } catch (e) {
    if (e instanceof LockAcquisitionError) {
      await loggerLib.writeServerLog(ctx, {
        severity: 4,
        message: `[${LOG_PATH}] bill_lock_timeout`,
        payload: { orderNumber, correlationId }
      })
      return jsonResponse(
        503,
        { ok: false, error: 'WIDGET_GC_BUSY', requestId: '' },
        buildCorsHeaders()
      )
    }
    throw e
  }

  // Кэш-хит — сразу возвращаем ранее созданную ссылку
  if (billResult.cached) {
    await loggerLib.writeServerLog(ctx, {
      severity: 6,
      message: `[${LOG_PATH}] widget_intent_by_deal: success`,
      payload: {
        method: 'lifepay',
        dealId: dealIdNormalized,
        amount,
        orderNumber,
        correlationId,
        ok: true,
        requestId: billResult.requestId,
        hasPaymentUrl: true,
        cached: true
      }
    })
    return jsonResponse(
      200,
      {
        ok: true,
        paymentUrl: billResult.paymentUrl,
        orderNumber,
        correlationId,
        requestId: billResult.requestId
      },
      buildCorsHeaders()
    )
  }

  // Cache miss — стандартная обработка результата gateway
  if (!billResult.ok || !billResult.paymentUrl) {
    await loggerLib.writeServerLog(ctx, {
      severity: 4,
      message: `[${LOG_PATH}] widget_intent_by_deal: gateway_error`,
      payload: {
        method: 'lifepay',
        dealId: dealIdNormalized,
        orderNumber,
        correlationId,
        ok: false,
        requestId: billResult.requestId,
        hasPaymentUrl: false
      }
    })
    return jsonResponse(
      502,
      { ok: false, error: 'WIDGET_GC_GATEWAY_ERROR', requestId: billResult.requestId },
      buildCorsHeaders()
    )
  }

  await loggerLib.writeServerLog(ctx, {
    severity: 6,
    message: `[${LOG_PATH}] widget_intent_by_deal: success`,
    payload: {
      method: 'lifepay',
      dealId: dealIdNormalized,
      amount,
      orderNumber,
      correlationId,
      ok: true,
      requestId: billResult.requestId,
      hasPaymentUrl: true,
      cached: false
    }
  })

  // Ответ не содержит email/amount/title — только навигационные данные (PII-защита)
  return jsonResponse(
    200,
    {
      ok: true,
      paymentUrl: billResult.paymentUrl,
      orderNumber,
      correlationId,
      requestId: billResult.requestId
    },
    buildCorsHeaders()
  )
})

export default widgetIntentByDealRoute
