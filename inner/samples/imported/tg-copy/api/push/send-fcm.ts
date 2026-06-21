import PushSubscriptions from '../../tables/push-subscriptions.table'
import { requireRealUser } from '@app/auth'
import { generateJWT, getAccessToken } from '../../lib/jwt-rs256'
import { request } from '@app/request'

// Firebase Service Account ключ
// ВАЖНО: Замените плейсхолдеры на реальные значения из service-account.json
const serviceAccount = {
  "project_id": "YOUR_PROJECT_ID",
  "private_key": "YOUR_PRIVATE_KEY",
  "client_email": "YOUR_CLIENT_EMAIL"
}

/**
 * Отправка push-уведомления через FCM API v1
 */
export const apiPushSendFCMRoute = app.post('/', async (ctx, req) => {
  requireRealUser(ctx)

  // Проверяем, что ключи не плейсхолдеры
  if (serviceAccount.project_id === 'YOUR_PROJECT_ID' ||
      serviceAccount.private_key === 'YOUR_PRIVATE_KEY' ||
      serviceAccount.client_email === 'YOUR_CLIENT_EMAIL') {
    throw new Error('Firebase Service Account не настроен. Замените плейсхолдеры в api/push/send-fcm.ts')
  }

  console.log('[Push API] Received send request:', JSON.stringify(req.body));

  const { userIds, title, body, data, icon, badge, image, url } = req.body

  if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
    console.log('[Push API] Error: userIds array is required');
    throw new Error('userIds array is required')
  }

  console.log(`[Push API] Sending to ${userIds.length} users, title: "${title}"`);

  // Получаем все подписки для указанных пользователей
  const subscriptions = await PushSubscriptions.findAll(ctx, {
    where: { userId: userIds }
  })

  console.log(`[Push API] Found ${subscriptions.length} subscriptions`);

  if (subscriptions.length === 0) {
    console.log('[Push API] No subscriptions found, returning early');
    return { success: true, sent: 0, message: 'No subscriptions found' }
  }

  // Логируем подписки для отладки
  subscriptions.forEach((sub, i) => {
    const fcmToken = sub.subscriptionData?.fcmToken;
    console.log(`[Push API] Subscription ${i + 1}: userId=${sub.userId}, token=${fcmToken ? fcmToken.substring(0, 20) + '...' : 'MISSING'}`);
  });

  // Генерируем JWT и получаем access token
  console.log('[Push API] Generating JWT...');
  const jwt = await generateJWT(
    serviceAccount.client_email,
    serviceAccount.private_key
  )
  console.log('[Push API] JWT generated, getting access token...');
  const accessToken = await getAccessToken(jwt)
  console.log(`[Push API] Access token obtained: ${accessToken ? accessToken.substring(0, 20) + '...' : 'FAILED'}`);

  // Отправляем уведомление каждому устройству
  let sent = 0
  let failed = 0
  const errors = []
  const invalidTokens = []

  for (const sub of subscriptions) {
    const fcmToken = sub.subscriptionData?.fcmToken

    if (!fcmToken) {
      console.log(`[Push API] Skipping subscription ${sub.id}: no FCM token`);
      failed++
      continue
    }

    console.log(`[Push API] Sending to token: ${fcmToken.substring(0, 20)}...`);

    try {
            // FCM API v1 payload — ТОЛЬКО data, без notification и webpush
      // Это критично для iOS PWA: service worker сам покажет уведомление
      const payload = {
        message: {
          token: fcmToken,
          data: {
            title: title || 'Новое уведомление',
            body: body || '',
            url: url || '/tg',
            icon: icon || '/tg/icons/icon-192.png',
            badge: badge || '/tg/icons/icon-192.png',
            chatId: (typeof data === 'object' && data?.chatId) ? data.chatId : '',
            timestamp: new Date().toISOString()
          }
        }
      }

      console.log(`[Push API] FCM payload:`, JSON.stringify(payload, null, 2));

      const response = await request({
        method: 'post',
        url: `https://fcm.googleapis.com/v1/projects/${serviceAccount.project_id}/messages:send`,
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        json: payload
      })

      console.log(`[Push API] FCM response status: ${response.statusCode}`);
      console.log(`[Push API] FCM response body:`, JSON.stringify(response.body));

      if (response.statusCode === 200) {
        sent++
        console.log(`[Push API] Successfully sent to ${fcmToken.substring(0, 20)}...`);
      } else {
        failed++
        const errorMsg = `HTTP ${response.statusCode}: ${JSON.stringify(response.body)}`;
        errors.push(`Token ${fcmToken.slice(0, 10)}...: ${errorMsg}`);
        console.log(`[Push API] Failed to send: ${errorMsg}`);

        // Проверяем на ошибки токена
        if (response.body?.error?.details?.some(d => d.errorCode === 'INVALID_ARGUMENT' || d.errorCode === 'UNREGISTERED')) {
          invalidTokens.push(sub.id);
        }
      }
    } catch (error) {
      failed++
      errors.push(`Token ${fcmToken.slice(0, 10)}...: ${error.message}`)
      console.error(`[Push API] Error sending to ${fcmToken.substring(0, 20)}...:`, error.message);

      // Если токен невалиден - помечаем для удаления
      if (error.message.includes('NOT_FOUND') ||
          error.message.includes('INVALID') ||
          error.message.includes('UNREGISTERED')) {
        invalidTokens.push(sub.id);
      }
    }
  }

  // Удаляем невалидные токены
  if (invalidTokens.length > 0) {
    console.log(`[Push API] Removing ${invalidTokens.length} invalid subscriptions`);
    for (const subId of invalidTokens) {
      try {
        await PushSubscriptions.delete(ctx, subId);
        console.log(`[Push API] Deleted invalid subscription ${subId}`);
      } catch (e) {
        console.error(`[Push API] Failed to delete subscription ${subId}:`, e);
      }
    }
  }

  console.log(`[Push API] Summary: sent=${sent}, failed=${failed}, total=${subscriptions.length}`);

  ctx.account.log('FCM notifications sent', {
    level: 'info',
    json: { sent, failed, total: subscriptions.length, errors: errors.slice(0, 5) }
  })

  return {
    success: true,
    sent,
    failed,
    total: subscriptions.length,
    errors: errors.length > 0 ? errors.slice(0, 10) : undefined,
    invalidTokensRemoved: invalidTokens.length
  }
})
