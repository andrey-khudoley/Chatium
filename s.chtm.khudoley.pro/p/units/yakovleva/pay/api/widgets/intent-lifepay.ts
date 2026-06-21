/**
 * `POST /api/widgets/intent-lifepay` — публичная инициация платежа LifePay
 * через виджет на странице магазина.
 *
 * ВНИМАНИЕ: эндпоинт сознательно публичный. Защита:
 *   1) Серверный hard-limit `WIDGET_INTENT_HARD_LIMIT_RUB` независимо от
 *      пользовательских настроек.
 *   2) Пользовательский лимит `widget_lifepay_max` (если задан > 0).
 *   3) Метод должен быть включён (`widget_lifepay_enabled === true`).
 *   4) Audit-лог через `loggerLib.writeServerLog` на каждый вызов.
 * `requireRealUser`/`requireInternalAccess` НЕ применяются сознательно —
 * userscript исполняется в браузере покупателя.
 *
 * Тело запроса принимается как JSON. Userscript отправляет `Content-Type:
 * application/json` — это **triggers CORS preflight** в современных браузерах
 * (OPTIONS-запрос). Платформа Chatium через `app.options` его не обслуживает,
 * поэтому userscript использует `Content-Type: text/plain` и JSON-string в
 * теле — обработчик парсит body вручную.
 */

import * as loggerLib from '../../lib/logger.lib'
import * as settingsLib from '../../lib/settings.lib'
import { getWidgetSettings } from '../../lib/widget/widgetSettings.lib'
import { WIDGET_INTENT_HARD_LIMIT_RUB } from '../../shared/widgetSettingsTypes'
import { invokeByGateway } from '../../lib/gateway/invokeDispatcher'
import { getFullUrl, ROUTES } from '../../config/routes'

const LOG_PATH = 'api/widgets/intent-lifepay'

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

export const widgetIntentLifepayRoute = app.post('/', async (ctx, req) => {
  const settings = await getWidgetSettings(ctx)

  await loggerLib.writeServerLog(ctx, {
    severity: 6,
    message: `[${LOG_PATH}] entry`,
    payload: { lifepayEnabled: settings.lifepayEnabled }
  })

  if (!settings.lifepayEnabled) {
    await loggerLib.writeServerLog(ctx, {
      severity: 4,
      message: `[${LOG_PATH}] widget_intent_attempt: method_disabled`,
      payload: { method: 'lifepay', ok: false }
    })
    return jsonResponse(403, { ok: false, error: 'WIDGET_METHOD_DISABLED' }, buildCorsHeaders())
  }

  const body = parseBody(req)
  if (!body) {
    return jsonResponse(400, { ok: false, error: 'WIDGET_BODY_INVALID' }, buildCorsHeaders())
  }

  const amountRaw = body.amount
  const amount =
    typeof amountRaw === 'number'
      ? amountRaw
      : typeof amountRaw === 'string'
        ? parseFloat(amountRaw)
        : NaN
  if (!Number.isFinite(amount) || amount <= 0) {
    return jsonResponse(400, { ok: false, error: 'WIDGET_AMOUNT_INVALID' }, buildCorsHeaders())
  }
  if (amount > WIDGET_INTENT_HARD_LIMIT_RUB) {
    await loggerLib.writeServerLog(ctx, {
      severity: 4,
      message: `[${LOG_PATH}] widget_intent_attempt: hard_limit_exceeded`,
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

  const email = typeof body.email === 'string' ? body.email.trim() : ''
  if (!email) {
    return jsonResponse(400, { ok: false, error: 'WIDGET_EMAIL_REQUIRED' }, buildCorsHeaders())
  }
  // Базовая проверка формата (наличие @ + домена). LifePay-gateway сам
  // отвергнет невалидный — отбрасываем тут, чтобы не платить за upstream-вызов.
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return jsonResponse(400, { ok: false, error: 'WIDGET_EMAIL_INVALID' }, buildCorsHeaders())
  }

  // Offer-фильтр по позициям удалён (deprecated endpoint; новый фильтр — в intent-by-deal).
  const orderNumber =
    typeof body.orderNumber === 'string' && body.orderNumber.trim().length > 0
      ? body.orderNumber.trim()
      : `widget-${Date.now()}-${Math.floor(Math.random() * 100_000)}`
  const correlationId =
    typeof body.correlationId === 'string' ? body.correlationId.trim() : orderNumber
  const description =
    typeof body.description === 'string' && body.description.trim().length > 0
      ? body.description.trim()
      : `Оплата заказа ${orderNumber}`

  // Webhook URL формируется на сервере: токен из настроек + хост аккаунта.
  // Если токен не настроен — gateway-клиент отдаст SETTINGS_MISSING, обрабатываем
  // ниже через `upstreamOk`.
  const webhookToken = await settingsLib.getLpWebhookToken(ctx)
  const callbackUrl = webhookToken
    ? `https://${ctx.account.host}${getFullUrl(ROUTES.webhook)}?token=${webhookToken}`
    : ''

  const args: Record<string, unknown> = {
    orderNumber,
    amount,
    customerEmail: email,
    description,
    callbackUrl
  }
  if (typeof body.customerPhone === 'string' && body.customerPhone.trim().length > 0) {
    args.customerPhone = body.customerPhone.trim()
  }

  const result = await invokeByGateway(ctx, 'lifepay', 'createBill', args)
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
      method: 'lifepay',
      amount,
      orderNumber,
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
      orderNumber,
      correlationId,
      requestId: result.requestId
    },
    buildCorsHeaders()
  )
})

export default widgetIntentLifepayRoute
