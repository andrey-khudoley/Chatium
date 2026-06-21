import PushSubscriptions from '../../tables/push-subscriptions.table'
import { requireRealUser } from '@app/auth'

/**
 * Статистика подписок (только для админов)
 */
export const apiPushStatsRoute = app.get('/', async (ctx, req) => {
  requireRealUser(ctx)
  
  if (!ctx.user.is('Admin')) {
    throw new Error('Admin access required')
  }
  
  const total = await PushSubscriptions.countBy(ctx, {})
  const byUser = await PushSubscriptions.select({
    userId: 'userId',
    count: { $count: ['id'] }
  }).group(['userId']).run(ctx)
  
  return {
    total,
    byUser: byUser.length,
    subscriptions: byUser
  }
})
