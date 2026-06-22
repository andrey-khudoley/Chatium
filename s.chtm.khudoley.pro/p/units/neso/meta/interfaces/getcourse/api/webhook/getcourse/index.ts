/**
 * Входящий postback GetCourse.
 * Публичный роут: БЕЗ requireRealUser, БЕЗ @shared-route.
 * Аутентификации у GC postback нет — только слабый фильтр по токену в URL.
 */

import * as settingsLib from '../../../lib/settings.lib'
import * as loggerLib from '../../../lib/logger.lib'
import { processWebhook } from '../../../lib/webhook/processWebhook.lib'

const LOG_MODULE = 'api/webhook/getcourse'

export const webhookGetCourseRoute = app.post('/', async (ctx, req) => {
  await loggerLib.writeServerLog(ctx, {
    severity: 6,
    message: `[${LOG_MODULE}] входящий постбэк`,
    payload: {}
  })

  // Токен-фильтр (слабый барьер — не аутентификация, см. §7 спеки)
  const configuredToken = await settingsLib.getWebhookPathToken(ctx)
  if (configuredToken) {
    const queryToken = typeof req.query?.token === 'string' ? req.query.token : ''
    if (queryToken !== configuredToken) {
      await loggerLib.writeServerLog(ctx, {
        severity: 4,
        message: `[${LOG_MODULE}] невалидный токен`,
        payload: { hasToken: !!queryToken }
        // токен в лог не пишем
      })
      return {
        statusCode: 403,
        rawHttpBody: JSON.stringify({ ok: false, error: 'forbidden' }),
        headers: { 'Content-Type': 'application/json' }
      }
    }
  }

  let result: Awaited<ReturnType<typeof processWebhook>>
  try {
    result = await processWebhook(ctx, req.body)
  } catch (err) {
    await loggerLib.writeServerLog(ctx, {
      severity: 3,
      message: `[${LOG_MODULE}] внутренняя ошибка обработки`,
      payload: { error: String(err) }
    })
    throw err
  }

  if (result.status !== 200) {
    return {
      statusCode: result.status,
      rawHttpBody: JSON.stringify(result.body),
      headers: { 'Content-Type': 'application/json' }
    }
  }

  return result.body
})
