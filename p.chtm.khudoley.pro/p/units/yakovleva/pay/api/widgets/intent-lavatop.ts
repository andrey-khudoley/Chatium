/**
 * `POST /api/widgets/intent-lavatop` — публичная инициация платежа Lava.Top
 * через виджет на странице магазина.
 *
 * @deprecated DEPRECATED (с 2026-05-31): заменён единым deal-потоком
 * `api/widgets/intent-by-deal.ts` (method:'lavatop'). Оставлен для обратной
 * совместимости; новые интеграции должны использовать intent-by-deal.
 *
 * ВНИМАНИЕ: эндпоинт сознательно публичный. Защита идентична lifepay-intent:
 *   1) Серверный hard-limit `WIDGET_INTENT_HARD_LIMIT_RUB`.
 *   2) Пользовательский лимит `widget_lavatop_max` (если задан > 0).
 *   3) Метод должен быть включён (`widget_lavatop_enabled === true`).
 *   4) Audit-лог на каждый вызов.
 *
 * Тело принимает `Content-Type: text/plain` с JSON-string внутри, чтобы
 * избежать CORS preflight (платформа Chatium `app.options` не обслуживает).
 *
 * `callbackUrl` для Lava.Top формируется на сервере (webhook-relay не требует
 * передачи токена в URL: Lava.Top передаёт секрет в заголовке X-Api-Key,
 * проверяет наш webhook-эндпоинт). `clientOrderId` пробрасывается из тела
 * для дальнейшей связки в socket-уведомлениях об оплате.
 */

import * as loggerLib from '../../lib/logger.lib'
import { getWidgetSettings } from '../../lib/widget/widgetSettings.lib'
import { WIDGET_INTENT_HARD_LIMIT_RUB } from '../../shared/widgetSettingsTypes'
import { invokeByGateway } from '../../lib/gateway/invokeDispatcher'
import { getFullUrl, ROUTES } from '../../config/routes'

const LOG_PATH = 'api/widgets/intent-lavatop'

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v)
}

function parseBody(req: app.Req): Record<string, unknown> | null {
  const raw = (req as unknown as { body?: unknown }).body
  if (isObject(raw)) return raw
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw)
      return isObject(parsed) ? parsed : null
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

export const widgetIntentLavatopRoute = app.post('/', async (ctx, req) => {
  const settings = await getWidgetSettings(ctx)

  await loggerLib.writeServerLog(ctx, {
    severity: 6,
    message: `[${LOG_PATH}] entry`,
    payload: { lavatopEnabled: settings.lavatopEnabled }
  })

  if (!settings.lavatopEnabled) {
    await loggerLib.writeServerLog(ctx, {
      severity: 4,
      message: `[${LOG_PATH}] widget_intent_attempt: method_disabled`,
      payload: { method: 'lavatop', ok: false }
    })
    return jsonResponse(403, { ok: false, error: 'WIDGET_METHOD_DISABLED' }, buildCorsHeaders())
  }

  const body = parseBody(req)
  if (!body) {
    return jsonResponse(400, { ok: false, error: 'WIDGET_BODY_INVALID' }, buildCorsHeaders())
  }

  const email = typeof body.email === 'string' ? body.email.trim() : ''
  if (!email) {
    return jsonResponse(400, { ok: false, error: 'WIDGET_EMAIL_REQUIRED' }, buildCorsHeaders())
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return jsonResponse(400, { ok: false, error: 'WIDGET_EMAIL_INVALID' }, buildCorsHeaders())
  }
  const offerId = typeof body.offerId === 'string' ? body.offerId.trim() : ''
  if (!offerId) {
    return jsonResponse(400, { ok: false, error: 'WIDGET_OFFER_ID_REQUIRED' }, buildCorsHeaders())
  }

  // Offer-фильтр по ids удалён (deprecated endpoint; новый фильтр — в intent-by-deal).
  // offerId как продуктовый параметр createInvoice сохраняется (args.offerId ниже).

  // amount — опционален для Lava.Top (цена берётся из оффера), но если
  // передан — проверяем фильтры по сумме.
  let amount: number | null = null
  if (body.amount !== undefined && body.amount !== null) {
    const raw = body.amount
    const n = typeof raw === 'number' ? raw : typeof raw === 'string' ? parseFloat(raw) : NaN
    if (!Number.isFinite(n) || n <= 0) {
      return jsonResponse(400, { ok: false, error: 'WIDGET_AMOUNT_INVALID' }, buildCorsHeaders())
    }
    if (n > WIDGET_INTENT_HARD_LIMIT_RUB) {
      await loggerLib.writeServerLog(ctx, {
        severity: 4,
        message: `[${LOG_PATH}] widget_intent_attempt: hard_limit_exceeded`,
        payload: {
          method: 'lavatop',
          amount: n,
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
    if (settings.lavatopMin > 0 && n < settings.lavatopMin) {
      return jsonResponse(400, { ok: false, error: 'WIDGET_AMOUNT_BELOW_MIN' }, buildCorsHeaders())
    }
    if (settings.lavatopMax > 0 && n > settings.lavatopMax) {
      return jsonResponse(
        400,
        { ok: false, error: 'WIDGET_AMOUNT_EXCEEDS_LIMIT' },
        buildCorsHeaders()
      )
    }
    amount = n
  }

  const currency =
    typeof body.currency === 'string' && body.currency.trim().length > 0
      ? body.currency.trim().toUpperCase()
      : 'RUB'
  const clientOrderId =
    typeof body.clientOrderId === 'string' && body.clientOrderId.trim().length > 0
      ? body.clientOrderId.trim()
      : `widget-${Date.now()}-${Math.floor(Math.random() * 100_000)}`
  const correlationId =
    typeof body.correlationId === 'string' ? body.correlationId.trim() : clientOrderId

  const callbackUrl = `https://${ctx.account.host}${getFullUrl(ROUTES.webhookLavatop)}`

  // Lava.Top берёт цену из оффера; передаём amount только если виджет явно
  // указал её в запросе (магазин может прокидывать итоговую сумму с DOM).
  const args: Record<string, unknown> = {
    email,
    offerId,
    currency,
    callbackUrl,
    clientOrderId
  }
  if (amount !== null) {
    args.amount = amount
  }

  const result = await invokeByGateway(ctx, 'lavatop', 'createInvoice', args)
  const upstreamOk = result.ok
  const responseBody = result.responseBody ?? {}
  const paymentUrl =
    (typeof responseBody.paymentUrl === 'string' && responseBody.paymentUrl) ||
    (typeof (responseBody.data as Record<string, unknown> | undefined)?.paymentUrl === 'string' &&
      ((responseBody.data as Record<string, unknown>).paymentUrl as string)) ||
    ''

  await loggerLib.writeServerLog(ctx, {
    severity: upstreamOk ? 6 : 4,
    message: `[${LOG_PATH}] widget_intent_attempt`,
    payload: {
      method: 'lavatop',
      amount,
      offerId,
      clientOrderId,
      correlationId,
      ok: upstreamOk,
      httpStatus: result.httpStatus,
      requestId: result.requestId,
      hasPaymentUrl: paymentUrl.length > 0
    }
  })

  if (!upstreamOk || !paymentUrl) {
    return jsonResponse(
      502,
      { ok: false, error: 'WIDGET_GATEWAY_ERROR', requestId: result.requestId },
      buildCorsHeaders()
    )
  }

  return jsonResponse(
    200,
    {
      ok: true,
      paymentUrl,
      clientOrderId,
      correlationId,
      requestId: result.requestId
    },
    buildCorsHeaders()
  )
})

export default widgetIntentLavatopRoute
