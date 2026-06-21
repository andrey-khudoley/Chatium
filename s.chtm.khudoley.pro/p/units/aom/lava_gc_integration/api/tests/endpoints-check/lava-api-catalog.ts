// @shared-route
import { requireAnyUser } from '@app/auth'
import * as lavaApi from '../../../lib/lava-api.client'
import * as loggerLib from '../../../lib/logger.lib'
import * as settingsLib from '../../../lib/settings.lib'

const LOG_PATH = 'api/tests/endpoints-check/lava-api-catalog'

/**
 * GET /api/tests/endpoints-check/lava-api-catalog — fetchLavaProductsCatalog из настроек (как админский каталог).
 */
export const lavaApiCatalogTestRoute = app.get('/', async (ctx, req) => {
  requireAnyUser(ctx)

  await loggerLib.writeServerLog(ctx, {
    severity: 7,
    message: `[${LOG_PATH}] Запрос fetchLavaProductsCatalog`,
    payload: {}
  })

  const apiKey = (await settingsLib.getLavaApiKey(ctx)).trim()
  if (!apiKey) {
    await loggerLib.writeServerLog(ctx, {
      severity: 7,
      message: `[${LOG_PATH}] Пропуск: нет lava_api_key`,
      payload: {}
    })
    return {
      success: true,
      test: 'lava-api-catalog',
      skipped: true,
      reason: 'lava_api_key not configured',
      at: Date.now()
    }
  }

  try {
    const baseUrl = await settingsLib.getLavaBaseUrl(ctx)
    const { rows } = await lavaApi.fetchLavaProductsCatalog(ctx, {
      apiKey,
      baseUrl
    })
    await loggerLib.writeServerLog(ctx, {
      severity: 6,
      message: `[${LOG_PATH}] каталог получен`,
      payload: { rows: rows.length }
    })
    return {
      success: true,
      test: 'lava-api-catalog',
      rowsCount: rows.length,
      at: Date.now()
    }
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e)
    await loggerLib.writeServerLog(ctx, {
      severity: 3,
      message: `[${LOG_PATH}] ошибка`,
      payload: { error: message }
    })
    return { success: false, test: 'lava-api-catalog', error: message }
  }
})
