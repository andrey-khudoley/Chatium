// @shared-route
import { requireAccountRole } from '@app/auth'
import { statusCore } from '../../../lib/admin/observability'

/** Admin-only статус-панель наблюдаемости (§5.11 п.2) — тонкий роут поверх statusCore. */
export const brokerAdminStatusRoute = app.post('/', async (ctx) => {
  requireAccountRole(ctx, 'Admin')
  const result = await statusCore(ctx)
  return { success: true, ...result }
})
