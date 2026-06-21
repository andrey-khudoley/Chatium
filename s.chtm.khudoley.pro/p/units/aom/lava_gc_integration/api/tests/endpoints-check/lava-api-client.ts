// @shared-route
import { requireAnyUser } from '@app/auth'
import * as lavaApi from '../../../lib/lava-api.client'
import * as loggerLib from '../../../lib/logger.lib'

const LOG_PATH = 'api/tests/endpoints-check/lava-api-client'

/**
 * GET /api/tests/endpoints-check/lava-api-client — диагностика: GET /api/v2/products Lava (getProducts).
 * Требуются настройки `lava_api_key` и `lava_base_url`. Для авторизованных пользователей.
 */
export const lavaApiClientTestRoute = app.get('/', async (ctx, req) => {
  requireAnyUser(ctx)

  await loggerLib.writeServerLog(ctx, {
    severity: 7,
    message: `[${LOG_PATH}] Запрос теста getProducts`,
    payload: {}
  })

  try {
    const body = await lavaApi.getProducts(ctx)
    await loggerLib.writeServerLog(ctx, {
      severity: 6,
      message: `[${LOG_PATH}] getProducts успешно`,
      payload: {}
    })
    return { success: true, test: 'lava-api-client', body }
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e)
    await loggerLib.writeServerLog(ctx, {
      severity: 3,
      message: `[${LOG_PATH}] getProducts ошибка`,
      payload: { error: message }
    })
    return { success: false, test: 'lava-api-client', error: message }
  }
})
