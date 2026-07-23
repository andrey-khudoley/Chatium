// @shared-route
import { requireAccountRole } from '@app/auth'
import { metricsCore } from '../../../lib/admin/observability'

/** Admin-only панель метрик наблюдаемости (§5.11 п.3) — тонкий роут поверх metricsCore. */
export const brokerAdminMetricsRoute = app.post('/', async (ctx) => {
  requireAccountRole(ctx, 'Admin')
  const result = await metricsCore(ctx)
  return { success: true, ...result }
})
