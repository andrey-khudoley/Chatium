// @shared-route
import { requireAnyUser } from '@app/auth'
import * as loggerLib from '../../../lib/logger.lib'

const LOG_PATH = 'api/tests/endpoints-check/health'

/**
 * GET /api/tests/endpoints-check/health — тест: проверка доступности (health check).
 * Один эндпоинт на файл. Для авторизованных пользователей.
 */
export const healthTestRoute = app.get('/', async (ctx, req) => {
  requireAnyUser(ctx)

  await loggerLib.writeServerLog(ctx, {
    severity: 7,
    message: `[${LOG_PATH}] Запрос health`,
    payload: {}
  })

  return { success: true, ok: true, test: 'health', at: Date.now() }
})
