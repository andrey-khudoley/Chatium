/**
 * `POST /api/payment-page/config` — публичный CORS-открытый эндпоинт.
 *
 * Возвращает визуальную конфигурацию страницы оплаты: общие настройки
 * (enabled, accentColor, URL статики) и конфиг каждого метода
 * (enabled, min/max, hideOnPartialPayment, hideOnTopUpPayment, секция, порядок,
 * offerIds для клиентской фильтрации, resolver для DOM-нахождения элемента).
 *
 * CORS-стратегия: Access-Control-Allow-Origin: '*' — один скрипт-лоадер
 * работает на всех школах. Тело может содержать только dealId текущей страницы:
 * он используется сервером для boolean-контекста доплаты без отдачи PII наружу.
 *
 * simple-request (Content-Type: text/plain) — без OPTIONS-preflight.
 * Тело запроса не обязательно.
 *
 * `requireRealUser`/`guardInternalApi` НЕ применяются сознательно —
 * скрипт исполняется в браузере покупателя.
 *
 * При любой ошибке возвращает { success:false, error:... } HTTP 200 —
 * loader проверяет json.success, не response.ok.
 */

import * as loggerLib from '../../lib/logger.lib'
import { resolveGcDealAmount } from '../../lib/gateway/gcDealResolver'
import {
  getPaymentPageGeneral,
  getPaymentPageMethods
} from '../../lib/paymentPage/paymentPageSettings.lib'
import { getFullUrl } from '../../config/routes'
import {
  PAYMENT_PAGE_LOADER_FILE,
  PAYMENT_PAGE_STYLE_FILE,
  PAYMENT_PAGE_SCRIPT_FILES,
  type PaymentPageDealContext,
  type PaymentPageGeneralPublic,
  type PaymentPageMethodPublic
} from '../../shared/paymentPageTypes'

const LOG_PATH = 'api/payment-page/config'

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v)
}

function readHeaders(req: app.Req): Record<string, unknown> {
  const h = (req as unknown as { headers?: unknown }).headers
  return isObject(h) ? h : {}
}

function getOriginOrHostname(headers: Record<string, unknown>): string {
  const origin = headers['origin'] ?? headers['Origin']
  if (typeof origin === 'string' && origin) return origin
  const host = headers['host'] ?? headers['Host']
  if (typeof host === 'string' && host) return host
  return ''
}

function parseConfigBody(req: app.Req): Record<string, unknown> {
  const raw = (req as unknown as { body?: unknown }).body
  if (isObject(raw)) return raw
  if (typeof raw !== 'string' || raw.trim() === '') return {}
  try {
    const parsed = JSON.parse(raw)
    return isObject(parsed) ? parsed : {}
  } catch {
    return {}
  }
}

function readDealId(raw: unknown): string | number | null {
  if (typeof raw !== 'string' && typeof raw !== 'number') return null
  const trimmed = String(raw).trim()
  return trimmed === '' ? null : raw
}

function jsonResponse(statusCode: number, body: Record<string, unknown>): Record<string, unknown> {
  return {
    statusCode,
    rawHttpBody: JSON.stringify(body),
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
      'Access-Control-Allow-Origin': '*'
    }
  }
}

export const paymentPageConfigRoute = app.post('/', async (ctx, req) => {
  const headers = readHeaders(req)
  const originOrHost = getOriginOrHostname(headers)
  const body = parseConfigBody(req)
  const dealId = readDealId(body.dealId)

  await loggerLib.writeServerLog(ctx, {
    severity: 6,
    message: `[${LOG_PATH}] entry`,
    payload: { originOrHost, hasDealId: dealId !== null }
  })

  try {
    // seed:false — публичный анонимный путь не сидирует БД (это делает админский
    // путь: SSR панели и settings-get). Здесь только чтение.
    const [general, methods] = await Promise.all([
      getPaymentPageGeneral(ctx),
      getPaymentPageMethods(ctx, { seed: false })
    ])
    const needsTopUpContext = dealId !== null && methods.some((m) => m.hideOnTopUpPayment === true)
    const dealAmount =
      dealId !== null && needsTopUpContext ? await resolveGcDealAmount(ctx, dealId) : null
    const dealContext: PaymentPageDealContext = {
      hasTopUpPayment: !!(dealAmount && dealAmount.ok === true && dealAmount.hasTopUpPayment)
    }

    // Строим URL статических ресурсов через ctx.account.host + getFullUrl (без хардкода)
    const loaderUrl = `https://${ctx.account.host}${getFullUrl('/userscripts/' + PAYMENT_PAGE_LOADER_FILE)}`
    const stylesUrl = `https://${ctx.account.host}${getFullUrl('/userscripts/' + PAYMENT_PAGE_STYLE_FILE)}`
    const scriptUrls = PAYMENT_PAGE_SCRIPT_FILES.map(
      (f) => `https://${ctx.account.host}${getFullUrl('/userscripts/' + f)}`
    )

    const generalPublic: PaymentPageGeneralPublic = {
      ...general,
      loaderUrl,
      stylesUrl,
      scriptUrls
    }

    // Преобразуем методы: offers[] → offerIds[]; resolver/isSystem/methodKey входят в ...rest.
    // ВАЖНО: customScript и menuItems сознательно включаются в публичный CORS-ответ —
    // они исполняются в браузере покупателя через new Function (pp-script-11.js) на стороне GC.
    // Доверие предполагается: скрипты вводятся только оператором панели под guardInternalApi.
    const methodsPublic: Record<string, PaymentPageMethodPublic> = {}
    for (const rec of methods) {
      const { offers, ...rest } = rec
      methodsPublic[rec.methodKey] = {
        ...rest,
        offerIds: offers.map((o) => o.id)
      }
    }

    await loggerLib.writeServerLog(ctx, {
      severity: 6,
      message: `[${LOG_PATH}] success`,
      payload: {
        originOrHost,
        generalEnabled: general.enabled,
        methodCount: Object.keys(methodsPublic).length,
        hasDealId: dealId !== null,
        needsTopUpContext,
        hasTopUpPayment: dealContext.hasTopUpPayment
      }
    })

    return jsonResponse(200, {
      success: true,
      general: generalPublic,
      methods: methodsPublic,
      deal: dealContext
    })
  } catch (err) {
    try {
      await loggerLib.writeServerLog(ctx, {
        severity: 3,
        message: `[${LOG_PATH}] error`,
        payload: { error: err instanceof Error ? err.message : String(err), originOrHost }
      })
    } catch {
      /* fail-open: ошибка логирования не должна ломать ответ */
    }
    return jsonResponse(200, { success: false, error: 'PAYMENT_PAGE_CONFIG_ERROR' })
  }
})

export default paymentPageConfigRoute
