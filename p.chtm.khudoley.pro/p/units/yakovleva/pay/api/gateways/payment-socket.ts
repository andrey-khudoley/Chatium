/**
 * POST /api/gateways/payment-socket — выдача encodedSocketId для подписки на
 * уведомления об оплате (real-time через `@app/socket`).
 *
 * Тело: `{ correlationId: string }`. Возвращает `{ success, channel,
 * encodedSocketId }`. Имя сырого канала — `paymentSocketChannel(correlationId)`;
 * encodedSocketId — результат `genSocketId(ctx, channel)`.
 *
 * Доступ: requireRealUser + requireInternalAccess (ADR 0003 / §1.11.8), как и
 * остальные `api/gateways/*`. Канал не раскрывает данные другого аккаунта — это
 * просто согласованное имя, а полезная нагрузка приходит только при получении
 * webhook от соответствующего гейтвея (см. `webhooks/lifepay`, `webhooks/lavatop`).
 */

import { genSocketId } from '@app/socket'
import { guardInternalApi } from '../../lib/access/apiGuard'
import * as loggerLib from '../../lib/logger.lib'
import { isValidCorrelationId, paymentSocketChannel } from '../../shared/paymentSocket'

const LOG_PATH = 'api/gateways/payment-socket'

type PaymentSocketRequestBody = {
  correlationId?: unknown
}

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v)
}

function jsonResponse(statusCode: number, body: Record<string, unknown>) {
  return {
    statusCode,
    rawHttpBody: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' }
  }
}

export const paymentSocketRoute = app.post('/', async (ctx, req) => {
  const denied = await guardInternalApi(ctx)
  if (denied) return denied

  const bodyRaw = req.body as unknown
  const body = isObject(bodyRaw) ? (bodyRaw as PaymentSocketRequestBody) : null
  const correlationIdRaw = body ? body.correlationId : undefined
  if (!isValidCorrelationId(correlationIdRaw)) {
    await loggerLib.writeServerLog(ctx, {
      severity: 4,
      message: `[${LOG_PATH}] correlation_id_invalid`,
      payload: { hasCorrelationId: typeof correlationIdRaw === 'string' }
    })
    return jsonResponse(400, {
      success: false,
      error: 'PAYMENT_SOCKET_CORRELATION_ID_INVALID',
      message:
        'Поле correlationId обязательно. Допустимы латинские буквы, цифры, ".", "_", ":", "-" (1–128 символов).'
    })
  }

  const channel = paymentSocketChannel(correlationIdRaw.trim())

  let encodedSocketId: string
  try {
    encodedSocketId = await genSocketId(ctx, channel)
  } catch (e) {
    await loggerLib.writeServerLog(ctx, {
      severity: 3,
      message: `[${LOG_PATH}] gen_socket_id_failed`,
      payload: { channel, error: String(e) }
    })
    return jsonResponse(503, {
      success: false,
      error: 'SOCKET_UNAVAILABLE',
      message: 'Не удалось сгенерировать encodedSocketId. Сервис @app/socket недоступен.'
    })
  }

  await loggerLib.writeServerLog(ctx, {
    severity: 6,
    message: `[${LOG_PATH}] issued`,
    payload: { channel, hasEncoded: !!encodedSocketId }
  })

  return jsonResponse(200, {
    success: true,
    channel,
    encodedSocketId
  })
})

export default paymentSocketRoute
