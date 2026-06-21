// @shared-route
import { requireAccountRole } from '@app/auth'
import * as ordersMetricsLib from '../../../lib/admin/orders-metrics.lib'
import * as loggerLib from '../../../lib/logger.lib'

const LOG_PATH = 'api/admin/orders-filter-options'

/**
 * GET /api/admin/orders-filter-options — уникальные lava_product_id / lava_offer_id из последних контрактов.
 */
export const getOrdersFilterOptionsRoute = app.get('/', async (ctx, req) => {
  requireAccountRole(ctx, 'Admin')

  await loggerLib.writeServerLog(ctx, {
    severity: 7,
    message: `[${LOG_PATH}] запрос`,
    payload: { queryKeys: Object.keys(req.query ?? {}) }
  })

  try {
    const { products, offers } = await ordersMetricsLib.getContractFilterOptions(ctx)
    return { success: true, products, offers }
  } catch (error) {
    await loggerLib.writeServerLog(ctx, {
      severity: 3,
      message: `[${LOG_PATH}] ошибка`,
      payload: { error: String(error) }
    })
    return { success: false, error: String(error) }
  }
})
