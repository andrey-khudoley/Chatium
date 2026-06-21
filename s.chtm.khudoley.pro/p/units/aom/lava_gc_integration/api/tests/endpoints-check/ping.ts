// @shared-route
import { requireAnyUser } from '@app/auth'
import * as loggerLib from '../../../lib/logger.lib'

const LOG_PATH = 'api/tests/endpoints-check/ping'

/**
 * GET /api/tests/endpoints-check/ping — тест: ping (эхо).
 * Один эндпоинт на файл. Для авторизованных пользователей.
 */
export const pingTestRoute = app.get('/', async (ctx, req) => {
  requireAnyUser(ctx)

  await loggerLib.writeServerLog(ctx, {
    severity: 7,
    message: `[${LOG_PATH}] Запрос ping`,
    payload: { queryKeys: Object.keys(req.query ?? {}) }
  })

  return { success: true, pong: true, test: 'ping', at: Date.now() }
})
