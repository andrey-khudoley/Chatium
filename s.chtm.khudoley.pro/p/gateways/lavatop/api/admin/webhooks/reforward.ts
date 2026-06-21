/**
 * POST /api/admin/webhooks/reforward — повторный форвард сохранённого вебхука клиенту
 * (кнопка «Переслать повторно» в панели). Доступ: панель (`guardInternalApi`).
 * Тело: `{ id: string }` — Heap-id записи lavatopWebhookEvent.
 */

import { guardInternalApi } from '../../../lib/access/apiGuard'
import * as loggerLib from '../../../lib/logger.lib'
import * as relay from '../../../lib/webhook/webhookRelay.service'

const LOG_PATH = 'api/admin/webhooks/reforward'

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v)
}

export const reforwardWebhookRoute = app.post('/', async (ctx, req) => {
  const denied = await guardInternalApi(ctx)
  if (denied) return denied

  const body = req.body
  const id = isObject(body) && typeof body.id === 'string' ? body.id.trim() : ''
  if (!id) {
    return { success: false, error: 'Параметр id обязателен' }
  }

  await loggerLib.writeServerLog(ctx, {
    severity: 6,
    message: `[${LOG_PATH}] entry`,
    payload: { id }
  })

  const result = await relay.reforwardEvent(ctx, id)

  await loggerLib.writeServerLog(ctx, {
    severity: 6,
    message: `[${LOG_PATH}] exit`,
    payload: { id, success: result.success, statusCode: result.statusCode ?? null }
  })

  return result
})

export default reforwardWebhookRoute
