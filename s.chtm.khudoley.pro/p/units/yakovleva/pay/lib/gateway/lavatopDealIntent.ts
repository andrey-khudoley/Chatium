/**
 * Lava.Top deal-поток виджета: updateOfferPrice + createInvoice под единым локом.
 *
 * Механизм: цена инвойса Lava.Top фиксируется при createInvoice. Чтобы закрыть
 * гонку (параллельные вызовы updateOfferPrice с разными суммами), оба вызова
 * выполняются последовательно внутри runWithExclusiveLock на ключе оффера.
 */

import { runWithExclusiveLock, LockAcquisitionError } from '@app/sync'
import * as loggerLib from '../logger.lib'
import { getLavatopOfferId, getLavatopProductId } from '../settings.lib'
import { getWidgetSettings } from '../widget/widgetSettings.lib'
import { resolveGcDeal } from './gcDealResolver'
import { invokeByGateway } from './invokeDispatcher'
import { recordRequestLog } from './recordRequestLog'
import { findCachedBill } from './idempotentBillCache'
import { convertRubTo, type PaymentCurrency } from '../rates/currencyConverter'
import { WIDGET_INTENT_HARD_LIMIT_RUB, areAllOffersAllowed } from '../../shared/widgetSettingsTypes'
import { getFullUrl, ROUTES } from '../../config/routes'
import { LAVATOP_LOCK_WAIT_MS, LAVATOP_LOCK_MAX_DURATION_MS } from './constants'
import {
  getLavatopOfferAmountLimits,
  isAmountWithinLavatopOfferLimits
} from './lavatopAmountLimits'

const LOG_MODULE = 'lib/gateway/lavatopDealIntent'

/** Внутренние маркеры ошибок внутри лока (не выходят наружу). */
type LockErrorMarker = 'PRICE_UPDATE_FAILED' | 'GATEWAY_ERROR'

type LockSuccess = {
  ok: true
  paymentUrl: string
  requestId: string
}

type LockFailure = {
  ok: false
  marker: LockErrorMarker
  requestId?: string
}

type LockResult = LockSuccess | LockFailure

export type LavatopDealResult =
  | { ok: true; paymentUrl: string; correlationId: string; requestId: string }
  | { ok: false; code: string; httpStatus: 400 | 403 | 404 | 409 | 422 | 502 | 503 }

export type LavatopInvoiceOptions = {
  paymentProvider?: string
  paymentMethod?: string
  buyerLanguage?: string
  periodicity?: string
  clientUtm?: Record<string, unknown>
}

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v)
}

function readGatewayError(responseBody: Record<string, unknown> | null): Record<string, unknown> {
  const error = responseBody?.error
  return isObject(error) ? error : {}
}

/** Маппинг кода ошибки резолвера на HTTP-статус. */
function resolveCodeToHttpStatus(code: string): 400 | 404 | 409 | 422 | 502 {
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
    default:
      return 502
  }
}

/**
 * Обрабатывает Lava.Top deal-поток: конвертирует сумму, обновляет цену
 * оффера и создаёт инвойс под единым локом.
 */
export async function handleLavatopDealIntent(
  ctx: app.Ctx,
  params: {
    dealId: string | number
    currency: PaymentCurrency
    corsHostname: string
    invoiceOptions?: LavatopInvoiceOptions
  }
): Promise<LavatopDealResult> {
  const { dealId, currency, corsHostname, invoiceOptions = {} } = params

  // 1. Проверить наличие offerId и productId
  const offerId = await getLavatopOfferId(ctx)
  const productId = await getLavatopProductId(ctx)
  if (!offerId || !productId) {
    await loggerLib.writeServerLog(ctx, {
      severity: 4,
      message: `[${LOG_MODULE}] handleLavatopDealIntent: not_configured`,
      payload: {
        dealId: String(dealId),
        currency,
        corsHostname,
        hasOfferId: Boolean(offerId),
        hasProductId: Boolean(productId),
        code: 'WIDGET_LAVATOP_NOT_CONFIGURED'
      }
    })
    return { ok: false, code: 'WIDGET_LAVATOP_NOT_CONFIGURED', httpStatus: 502 }
  }

  // 2. Резолвинг заказа из GC
  const resolved = await resolveGcDeal(ctx, dealId)
  if (!resolved.ok) {
    await loggerLib.writeServerLog(ctx, {
      severity: 4,
      message: `[${LOG_MODULE}] handleLavatopDealIntent: resolve_fail`,
      payload: { dealId: String(dealId), currency, corsHostname, code: resolved.code }
    })
    return { ok: false, code: resolved.code, httpStatus: resolveCodeToHttpStatus(resolved.code) }
  }

  const amountRub = resolved.amount

  // 3. Фильтр суммы по рублёвому значению
  if (amountRub > WIDGET_INTENT_HARD_LIMIT_RUB) {
    await loggerLib.writeServerLog(ctx, {
      severity: 4,
      message: `[${LOG_MODULE}] handleLavatopDealIntent: hard_limit_exceeded`,
      payload: {
        dealId: String(dealId),
        currency,
        corsHostname,
        amountRub,
        hardLimit: WIDGET_INTENT_HARD_LIMIT_RUB,
        code: 'WIDGET_AMOUNT_EXCEEDS_HARD_LIMIT'
      }
    })
    return { ok: false, code: 'WIDGET_AMOUNT_EXCEEDS_HARD_LIMIT', httpStatus: 400 }
  }

  const settings = await getWidgetSettings(ctx)
  if (settings.lavatopMin > 0 && amountRub < settings.lavatopMin) {
    await loggerLib.writeServerLog(ctx, {
      severity: 4,
      message: `[${LOG_MODULE}] handleLavatopDealIntent: amount_below_min`,
      payload: {
        dealId: String(dealId),
        currency,
        corsHostname,
        amountRub,
        lavatopMin: settings.lavatopMin
      }
    })
    return { ok: false, code: 'WIDGET_AMOUNT_BELOW_MIN', httpStatus: 400 }
  }
  if (settings.lavatopMax > 0 && amountRub > settings.lavatopMax) {
    await loggerLib.writeServerLog(ctx, {
      severity: 4,
      message: `[${LOG_MODULE}] handleLavatopDealIntent: amount_exceeds_limit`,
      payload: {
        dealId: String(dealId),
        currency,
        corsHostname,
        amountRub,
        lavatopMax: settings.lavatopMax
      }
    })
    return { ok: false, code: 'WIDGET_AMOUNT_EXCEEDS_LIMIT', httpStatus: 400 }
  }

  // Серверная проверка допуска по позициям заказа из GC
  if (
    !areAllOffersAllowed(resolved.positions, settings.lavatopOffers, settings.lavatopOfferListType)
  ) {
    await loggerLib.writeServerLog(ctx, {
      severity: 4,
      message: `[${LOG_MODULE}] handleLavatopDealIntent: offer_not_allowed`,
      payload: {
        dealId: String(dealId),
        currency,
        corsHostname,
        positionsCount: resolved.positions.length,
        listType: settings.lavatopOfferListType,
        code: 'WIDGET_OFFER_NOT_ALLOWED'
      }
    })
    return { ok: false, code: 'WIDGET_OFFER_NOT_ALLOWED', httpStatus: 403 }
  }

  // 4. Конвертация суммы в целевую валюту
  const convert = await convertRubTo(ctx, { amountRub, currency })
  if (!convert.ok) {
    await loggerLib.writeServerLog(ctx, {
      severity: 4,
      message: `[${LOG_MODULE}] handleLavatopDealIntent: rate_unavailable`,
      payload: {
        dealId: String(dealId),
        currency,
        corsHostname,
        code: 'WIDGET_LAVATOP_RATE_UNAVAILABLE'
      }
    })
    return { ok: false, code: 'WIDGET_LAVATOP_RATE_UNAVAILABLE', httpStatus: 502 }
  }

  // 5. Лимиты суммы оффера Lava.Top по валюте
  const amountLimits = getLavatopOfferAmountLimits(currency)
  if (!isAmountWithinLavatopOfferLimits(convert.amount, currency)) {
    await loggerLib.writeServerLog(ctx, {
      severity: 4,
      message: `[${LOG_MODULE}] handleLavatopDealIntent: amount_too_small`,
      payload: {
        dealId: String(dealId),
        currency,
        corsHostname,
        amountConverted: convert.amount,
        minAmount: amountLimits.min,
        maxAmount: amountLimits.max,
        code: 'WIDGET_LAVATOP_AMOUNT_TOO_SMALL'
      }
    })
    return { ok: false, code: 'WIDGET_LAVATOP_AMOUNT_TOO_SMALL', httpStatus: 400 }
  }

  // 6. correlationId (детерминирован по dealId, сырой числовой dealId после нормализации, без префикса)
  const dealIdNormalized = String(Number(String(dealId).trim()))
  const correlationId = dealIdNormalized

  // 7. callbackUrl для Lava.Top webhook
  const callbackUrl = `https://${ctx.account.host}${getFullUrl(ROUTES.webhookLavatop)}`

  // 8. КРИТИЧНО — лок на ключе оффера: updateOfferPrice → createInvoice последовательно
  const lockKey = `lavatop-offer:${offerId}`
  let lockResult: LockResult
  try {
    lockResult = await runWithExclusiveLock(
      ctx,
      lockKey,
      { timeoutMs: LAVATOP_LOCK_WAIT_MS, maxDurationMs: LAVATOP_LOCK_MAX_DURATION_MS },
      async (lockCtx: app.Ctx): Promise<LockResult> => {
        // 8-idempotency. Проверить кэш до updateOfferPrice
        const hit = await findCachedBill(lockCtx, {
          op: 'createInvoice',
          gatewayId: 'lavatop',
          orderNumber: correlationId,
          expectedCurrency: currency,
          expectedAmount: convert.amount
        })
        if (hit && hit.paymentUrl) {
          await loggerLib.writeServerLog(lockCtx, {
            severity: 6,
            message: `[${LOG_MODULE}] lock: idempotent_hit, skip create`,
            payload: {
              correlationId,
              requestId: hit.requestId,
              hasPaymentUrl: true,
              gatewayId: 'lavatop'
            }
          })
          return { ok: true, paymentUrl: hit.paymentUrl, requestId: hit.requestId }
        }

        // 8a. Обновить цену оффера (только выбранная валюта)
        const updateRes = await invokeByGateway(
          lockCtx,
          'lavatop',
          'updateOfferPrice',
          {
            productId,
            offers: [
              {
                id: offerId,
                prices: [{ amount: convert.amount, currency }]
              }
            ]
          },
          { httpMethod: 'POST' }
        )

        if (!updateRes.ok) {
          const gatewayError = readGatewayError(updateRes.responseBody)
          await loggerLib.writeServerLog(lockCtx, {
            severity: 4,
            message: `[${LOG_MODULE}] lock: updateOfferPrice failed`,
            payload: {
              dealId: dealIdNormalized,
              currency,
              amountConverted: convert.amount,
              httpStatus: updateRes.httpStatus,
              requestId: updateRes.requestId,
              gatewayError,
              code: 'PRICE_UPDATE_FAILED'
            }
          })
          return { ok: false, marker: 'PRICE_UPDATE_FAILED', requestId: updateRes.requestId }
        }

        // 8b. Создать инвойс с зафиксированной суммой
        const invRes = await invokeByGateway(
          lockCtx,
          'lavatop',
          'createInvoice',
          {
            email: resolved.email,
            offerId,
            currency,
            ...invoiceOptions,
            callbackUrl,
            clientOrderId: correlationId
          },
          { httpMethod: 'POST' }
        )

        const invBody = invRes.responseBody ?? {}
        const paymentUrl =
          (typeof invBody.paymentUrl === 'string' && invBody.paymentUrl) ||
          (isObject(invBody.data) &&
          typeof (invBody.data as Record<string, unknown>).paymentUrl === 'string'
            ? ((invBody.data as Record<string, unknown>).paymentUrl as string)
            : '') ||
          ''

        if (!invRes.ok || !paymentUrl) {
          await loggerLib.writeServerLog(lockCtx, {
            severity: 4,
            message: `[${LOG_MODULE}] lock: createInvoice failed`,
            payload: {
              dealId: dealIdNormalized,
              currency,
              hasPaymentUrl: false,
              httpStatus: invRes.httpStatus,
              requestId: invRes.requestId,
              code: 'GATEWAY_ERROR'
            }
          })
          return { ok: false, marker: 'GATEWAY_ERROR', requestId: invRes.requestId }
        }

        // Записать в request_log для последующего кэш-lookup (orderNumber = correlationId)
        try {
          await recordRequestLog(lockCtx, {
            gatewayId: 'lavatop',
            op: 'createInvoice',
            args: {
              email: resolved.email,
              offerId,
              currency,
              ...invoiceOptions,
              amount: convert.amount,
              callbackUrl,
              clientOrderId: correlationId,
              orderNumber: correlationId
            },
            invoke: invRes,
            correlationId
          })
        } catch (e) {
          await loggerLib.writeServerLog(lockCtx, {
            severity: 3,
            message: `[${LOG_MODULE}] lavatop_record_log_failed`,
            payload: { correlationId, error: String(e) }
          })
        }

        return {
          ok: true,
          paymentUrl,
          requestId: invRes.requestId
        }
      }
    )
  } catch (e) {
    if (e instanceof LockAcquisitionError) {
      await loggerLib.writeServerLog(ctx, {
        severity: 4,
        message: `[${LOG_MODULE}] lavatop_lock_timeout`,
        payload: { correlationId, offerId }
      })
      return { ok: false as const, code: 'WIDGET_LAVATOP_BUSY', httpStatus: 503 }
    }
    throw e
  }

  // 9. Маппинг маркеров ошибок на публичный результат
  if (!lockResult.ok) {
    if (lockResult.marker === 'PRICE_UPDATE_FAILED') {
      return { ok: false, code: 'WIDGET_LAVATOP_PRICE_UPDATE_FAILED', httpStatus: 502 }
    }
    // GATEWAY_ERROR
    return { ok: false, code: 'WIDGET_GC_GATEWAY_ERROR', httpStatus: 502 }
  }

  // 10. Успех
  await loggerLib.writeServerLog(ctx, {
    severity: 6,
    message: `[${LOG_MODULE}] handleLavatopDealIntent: success`,
    payload: {
      dealId: dealIdNormalized,
      currency,
      invoiceOptions,
      corsHostname,
      amountRub,
      amountConverted: convert.amount,
      rate: convert.rate,
      source: convert.source,
      correlationId,
      hasPaymentUrl: true
    }
  })

  return {
    ok: true as const,
    paymentUrl: lockResult.paymentUrl,
    correlationId,
    requestId: lockResult.requestId
  }
}
