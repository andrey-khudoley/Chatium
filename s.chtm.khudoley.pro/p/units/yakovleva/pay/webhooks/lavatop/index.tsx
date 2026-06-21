/**
 * `/webhooks/lavatop` — приёмник webhook Lava.Top на стороне клиента.
 *
 * Источник — Lava.Top gateway webhook-relay либо напрямую Lava.Top, если магазин
 * настроен туда. Контракт тела — `PurchaseWebhookLog`
 * (минимум: `contractId: string`, `eventType: string`, `status: string`).
 *
 * Авторизация: заголовок `X-Api-Key` (или Basic) должен совпадать со значением
 * настройки `lava_webhook_secret`. Секрет должен быть задан — без него любой
 * запрос отвечает 503.
 *
 * Дедупликация по композитному ключу `contractId:eventType:status`
 * (механизм `runWithExclusiveLock` из `@app/sync` — тот же паттерн, что
 * LifePay-webhook использует по `number`).
 *
 * Запись в `webhook_log` с `gatewayId='lavatop'` и `gatewayExternalId=contractId`.
 * Возврат 200/401/503 без подробного тела.
 */

import * as loggerLib from '../../lib/logger.lib'
import * as settingsLib from '../../lib/settings.lib'
import * as webhookLogRepo from '../../repos/webhookLog.repo'
import * as webhookIdempRepo from '../../repos/webhookIdempotency.repo'
import { prepareRawLog } from '../../shared/prepareRawLog'
import { base64ToUtf8String } from '../../lib/base64.lib'
import { paymentSocketChannel } from '../../shared/paymentSocket'
import { sendDataToSocket } from '@app/socket'

const LOG_PATH = 'webhooks/lavatop'

type LavatopWebhookRequestBody = {
  contractId?: unknown
  eventType?: unknown
  status?: unknown
  amount?: unknown
  buyer?: unknown
  clientOrderId?: unknown
  clientUtm?: unknown
} & Record<string, unknown>

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v)
}

function readHeaders(req: app.Req): Record<string, unknown> {
  const h = (req as unknown as { headers?: unknown }).headers
  return isObject(h) ? h : {}
}

function readHeader(headers: Record<string, unknown>, name: string): string {
  const lower = name.toLowerCase()
  for (const key of Object.keys(headers)) {
    if (key.toLowerCase() === lower) {
      const v = headers[key]
      if (typeof v === 'string') return v
      if (Array.isArray(v) && v.length > 0 && typeof v[0] === 'string') return v[0]
      return ''
    }
  }
  return ''
}

function jsonResponse(statusCode: number, body: Record<string, unknown>) {
  return {
    statusCode,
    rawHttpBody: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' }
  }
}

/**
 * Проверка совпадения секрета. Поддерживает `X-Api-Key` или Basic-схему
 * `Authorization: Basic <base64(user:secret)>` (значение secret = lava_webhook_secret).
 */
function isAuthorized(apiKey: string, authorization: string, secret: string): boolean {
  if (apiKey && apiKey === secret) return true
  if (!authorization) return false
  const m = /^Basic\s+(.+)$/i.exec(authorization)
  if (!m) return false
  const enc = m[1]?.trim()
  if (!enc) return false
  try {
    // Base64 декодируем самописно: `Buffer` / `atob` в Chatium UGC-рантайме НЕ гарантированы
    // (см. `inner/docs/047-base64.md`). Декларация Buffer заглушила бы TS, но в рантайме был бы
    // ReferenceError. Используем чистый JS-декодер из `lib/base64.lib.ts`.
    const decoded = base64ToUtf8String(enc)
    const idx = decoded.indexOf(':')
    if (idx < 0) return false
    const pwd = decoded.slice(idx + 1)
    return pwd === secret
  } catch {
    return false
  }
}

/** POST — приём вебхука Lava.Top, запись в webhook_log, дедупликация. */
export const webhookLavatopRoute = app.post('/', async (ctx, req) => {
  const headers = readHeaders(req)
  const apiKey = readHeader(headers, 'X-Api-Key').trim()
  const authorization = readHeader(headers, 'Authorization')

  const secret = (await settingsLib.getLavaWebhookSecret(ctx)).trim()
  if (!secret) {
    await loggerLib.writeServerLog(ctx, {
      severity: 3,
      message: `[${LOG_PATH}] secret_not_configured`,
      payload: {}
    })
    return jsonResponse(503, { success: false, error: 'webhook_secret_not_configured' })
  }

  if (!isAuthorized(apiKey, authorization, secret)) {
    await loggerLib.writeServerLog(ctx, {
      severity: 4,
      message: `[${LOG_PATH}] unauthorized`,
      payload: { hasApiKey: apiKey.length > 0, hasAuthorization: authorization.length > 0 }
    })
    return jsonResponse(401, { success: false, error: 'unauthorized' })
  }

  const bodyRaw = (req as unknown as { body?: unknown }).body
  if (!isObject(bodyRaw)) {
    await loggerLib.writeServerLog(ctx, {
      severity: 4,
      message: `[${LOG_PATH}] body_invalid`,
      payload: { bodyType: typeof bodyRaw }
    })
    return jsonResponse(400, { success: false, error: 'invalid_body' })
  }
  const body = bodyRaw as LavatopWebhookRequestBody

  const contractId = typeof body.contractId === 'string' ? body.contractId : ''
  const eventType = typeof body.eventType === 'string' ? body.eventType : ''
  const status = typeof body.status === 'string' ? body.status : ''
  if (!contractId || !eventType) {
    await loggerLib.writeServerLog(ctx, {
      severity: 4,
      message: `[${LOG_PATH}] invalid_webhook_payload`,
      payload: {
        hasContractId: !!contractId,
        hasEventType: !!eventType
      }
    })
    return jsonResponse(400, { success: false, error: 'invalid_webhook_payload' })
  }

  // Дедупликация: используем существующую таблицу webhook_idempotency
  // (`number` хранит композитный ключ Lava.Top — он гарантированно уникален в
  // рамках всего журнала, не пересекается с числовыми transaction-id LifePay).
  const dedupeKey = `lavatop:${contractId}:${eventType}:${status}`
  let duplicate = false
  try {
    const reg = await webhookIdempRepo.tryRegister(ctx, dedupeKey, Date.now())
    duplicate = reg === 'duplicate'
  } catch (e) {
    await loggerLib.writeServerLog(ctx, {
      severity: 3,
      message: `[${LOG_PATH}] dedupe_error`,
      payload: { dedupeKey, error: String(e) }
    })
    // Консервативный фоллбэк: при сбое idempotency-lookup помечаем событие
    // как дубль, чтобы при Lava.Top-ретраях клиентский JS не получал
    // multiple socket-уведомлений по одной оплате.
    duplicate = true
  }

  // Чтение query (на случай если кто-то проксирует webhook через query) и тело.
  const queryRaw = (req as unknown as { query?: unknown }).query
  const queryObj =
    typeof queryRaw === 'object' && queryRaw !== null ? (queryRaw as Record<string, unknown>) : {}
  const rawBodyForLog = prepareRawLog(body)
  const rawQueryForLog = prepareRawLog(queryObj)

  // Поля amount/email/orderNumber по возможности извлечь — структура Lava.Top
  // содержит вложенные поля; для совместимости с существующей схемой берём строковые
  // значения там, где они есть.
  const amount = (() => {
    const v = body.amount
    if (typeof v === 'string') return v
    if (typeof v === 'number') return String(v)
    if (isObject(v)) {
      const av = (v as Record<string, unknown>).value
      if (typeof av === 'string') return av
      if (typeof av === 'number') return String(av)
    }
    return ''
  })()
  const email = (() => {
    const buyer = (body as Record<string, unknown>).buyer
    if (isObject(buyer) && typeof buyer.email === 'string') return buyer.email
    if (typeof (body as Record<string, unknown>).email === 'string') {
      return String((body as Record<string, unknown>).email)
    }
    return ''
  })()
  const orderNumber = (() => {
    const v = body.clientOrderId
    if (typeof v === 'string') return v
    return ''
  })()

  try {
    await webhookLogRepo.create(ctx, {
      // У Lava.Top нет аналога LifePay-`number`; используем contractId как
      // идентификатор транзакции (совместимо со старыми UI/поиском по `number`).
      number: contractId,
      gatewayId: 'lavatop',
      gatewayExternalId: contractId,
      type: eventType,
      status,
      method: '',
      amount,
      orderNumber,
      tokenValid: true,
      duplicate,
      processedAt: Date.now(),
      email,
      rawBody: rawBodyForLog,
      rawQuery: rawQueryForLog
    })
  } catch (e) {
    await loggerLib.writeServerLog(ctx, {
      severity: 3,
      message: `[${LOG_PATH}] webhook_log_create_failed`,
      payload: { contractId, error: String(e) }
    })
  }

  await loggerLib.writeServerLog(ctx, {
    severity: 6,
    message: `[${LOG_PATH}] webhook_done`,
    payload: { contractId, eventType, status, duplicate }
  })

  // Публикация в socket-канал уведомлений об оплате. У Lava.Top нет
  // явного `correlationId` — связку с магазинным заказом обеспечивает
  // `clientOrderId` (его магазин передаёт в `createInvoice.args`, а Lava.Top
  // возвращает в payload вебхука). Если он не задан — публикации нет, но
  // запись webhook_log всё равно сделана.
  const channel = paymentSocketChannel(orderNumber)
  if (channel && !duplicate) {
    try {
      await sendDataToSocket(ctx, channel, {
        type: 'payment',
        data: {
          gatewayId: 'lavatop',
          correlationId: orderNumber,
          status,
          eventType,
          externalId: contractId,
          orderNumber,
          amount,
          timestamp: Date.now()
        }
      })
    } catch (e) {
      await loggerLib.writeServerLog(ctx, {
        severity: 3,
        message: `[${LOG_PATH}] socket_publish_failed`,
        payload: { channel, error: String(e) }
      })
    }
  }

  return jsonResponse(200, { success: true, duplicate })
})
