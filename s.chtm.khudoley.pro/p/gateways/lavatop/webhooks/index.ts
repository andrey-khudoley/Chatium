/**
 * Эндпоинт приёма вебхуков Lava.Top (`PurchaseWebhookLog`).
 * POST `/` — приём вебхука. Авторизация: `X-Api-Key` или Basic = `lava_webhook_secret`.
 *
 * Ответ формируется как `{ statusCode, rawHttpBody, headers }` — это «честный» HTTP-статус
 * (паттерн gateway-роутов lifepay/api/v1): 401 при неверном секрете заставляет Lava.Top повторить,
 * 2xx — считается доставленным. Тело вебхука читается из `req.body` (платформа парсит JSON).
 */

import * as loggerLib from '../lib/logger.lib'
import { processWebhook } from '../lib/webhook/webhookRelay.service'
import type { LavaWebhookPayload } from '../lib/gateway/lavaTypes'

const LOG_PATH = 'webhooks'

type LavaWebhookRequestBody = Partial<LavaWebhookPayload> & Record<string, unknown>

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

/** POST — приём вебхука Lava.Top и проксирование на клиентский callback. */
export const webhookReceiveRoute = app.post('/', async (ctx, req) => {
  const headers = readHeaders(req)
  const apiKey = readHeader(headers, 'X-Api-Key').trim()
  const authorization = readHeader(headers, 'Authorization')

  const bodyRaw = (req as unknown as { body?: unknown }).body
  if (
    !isObject(bodyRaw) ||
    typeof bodyRaw.contractId !== 'string' ||
    typeof bodyRaw.eventType !== 'string'
  ) {
    await loggerLib.writeServerLog(ctx, {
      severity: 4,
      message: `[${LOG_PATH}] invalid_webhook_payload`,
      payload: { bodyType: Array.isArray(bodyRaw) ? 'array' : typeof bodyRaw }
    })
    return jsonResponse(400, { success: false, error: 'invalid_webhook_payload' })
  }

  const payload = bodyRaw as LavaWebhookRequestBody as LavaWebhookPayload

  await loggerLib.writeServerLog(ctx, {
    severity: 6,
    message: `[${LOG_PATH}] received`,
    payload: {
      eventType: payload.eventType,
      contractId: payload.contractId,
      status: payload.status
    }
  })

  const result = await processWebhook(ctx, payload, { apiKey, authorization })

  if (result.kind === 'unauthorized') {
    return jsonResponse(401, { success: false, error: 'unauthorized' })
  }
  if (result.kind === 'config_error') {
    return jsonResponse(500, { success: false, error: 'webhook_secret_not_configured' })
  }
  return jsonResponse(200, {
    success: true,
    duplicate: result.duplicate === true,
    forwarded: result.forwarded === true,
    contractNotFound: result.contractNotFound === true
  })
})
