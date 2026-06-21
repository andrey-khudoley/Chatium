// @shared-route
import { requireAccountRole } from '@app/auth'
import * as lavaApi from '../../../../lib/lava-api.client'
import * as loggerLib from '../../../../lib/logger.lib'

const LOG_PATH = 'api/admin/lava/catalog'

/**
 * POST /api/admin/lava/catalog — загрузить каталог продуктов и офферов Lava (диагностика настройки).
 * Body: { lavaApiKey: string, lavaBaseUrl?: string }. Только Admin. Ключ в логах не пишется.
 */
export const lavaCatalogRoute = app.post('/', async (ctx, req) => {
  requireAccountRole(ctx, 'Admin')

  await loggerLib.writeServerLog(ctx, {
    severity: 7,
    message: `[${LOG_PATH}] Запрос каталога Lava`,
    payload: { hasKey: !!(req.body as { lavaApiKey?: string })?.lavaApiKey }
  })

  const body = req.body as { lavaApiKey?: unknown; lavaBaseUrl?: unknown }
  const lavaApiKey = typeof body.lavaApiKey === 'string' ? body.lavaApiKey : ''
  const lavaBaseUrl = typeof body.lavaBaseUrl === 'string' ? body.lavaBaseUrl : ''

  if (!lavaApiKey.trim()) {
    await loggerLib.writeServerLog(ctx, {
      severity: 7,
      message: `[${LOG_PATH}] VALIDATION: пустой lavaApiKey`,
      payload: {}
    })
    return { success: false, errorCode: 'VALIDATION', message: 'Укажите API-ключ Lava' }
  }

  try {
    const { rows } = await lavaApi.fetchLavaProductsCatalog(ctx, {
      baseUrl: lavaBaseUrl,
      apiKey: lavaApiKey
    })
    return {
      success: true,
      catalog: rows.map((r) => ({
        productId: r.productId,
        productTitle: r.productTitle,
        offerId: r.offerId,
        offerName: r.offerName
      }))
    }
  } catch (e) {
    await loggerLib.writeServerLog(ctx, {
      severity: 3,
      message: `[${LOG_PATH}] Ошибка запроса к Lava`,
      payload: { error: String(e) }
    })
    return { success: false, errorCode: 'LAVA_REQUEST', message: String(e) }
  }
})
