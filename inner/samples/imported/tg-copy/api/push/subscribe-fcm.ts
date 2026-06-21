import PushSubscriptions from '../../tables/push-subscriptions.table'
import { requireRealUser } from '@app/auth'

/**
 * Сохранение FCM токена пользователя
 */
export const apiPushSubscribeFCMRoute = app.post('/', async (ctx, req) => {
  requireRealUser(ctx)

  const { token, deviceInfo } = req.body

  console.log(`[Push API] Subscribe request from user ${ctx.user.id}, token: ${token ? token.substring(0, 20) + '...' : 'MISSING'}`);

  if (!token) {
    console.log('[Push API] Error: FCM token is required');
    throw new Error('FCM token is required')
  }

  // Проверяем, есть ли уже такая подписка
  const existing = await PushSubscriptions.findOneBy(ctx, {
    $and: [
      { userId: ctx.user.id },
      { endpoint: token }
    ]
  })

  if (existing) {
    console.log(`[Push API] Updating existing subscription ${existing.id}`);
    // Обновляем существующую
    await PushSubscriptions.update(ctx, {
      id: existing.id,
      subscriptionData: {
        fcmToken: token,
        deviceInfo: deviceInfo || null,
        updatedAt: new Date()
      }
    })

    return { success: true, message: 'Subscription updated', id: existing.id }
  }

  // Создаём новую подписку
  console.log(`[Push API] Creating new subscription for user ${ctx.user.id}`);
  const newSub = await PushSubscriptions.create(ctx, {
    endpoint: token,
    subscriptionData: {
      fcmToken: token,
      deviceInfo: deviceInfo || null
    },
    userId: ctx.user.id,
    createdAt: new Date()
  })

  console.log(`[Push API] Subscription created: ${newSub.id}`);

  return { success: true, message: 'Subscription created', id: newSub.id }
})
