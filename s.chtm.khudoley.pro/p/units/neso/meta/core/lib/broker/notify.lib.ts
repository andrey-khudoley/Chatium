import { sendDataToSocket } from '@app/socket'
import { runWithExclusiveLock } from '@app/sync'
import * as notificationsRepo from '../../repos/brokerNotificationAttempts.repo'
import * as settingsLib from '../settings.lib'
import * as loggerLib from '../logger.lib'
import { safeError, stableId } from './safeJson.lib'
import type { BrokerSubscriptionsRow } from '../../tables/brokerSubscriptions.table'
import type { BrokerDeliveriesRow } from '../../tables/brokerDeliveries.table'

const LOG_PATH = 'lib/broker/notify.lib'

function channelsForSubscription(row: BrokerSubscriptionsRow): Array<{
  mode: 'internal' | 'socket'
  handlerKey: string
}> {
  if (row.notificationMode === 'internal')
    return [{ mode: 'internal', handlerKey: row.notificationHandlerKey }]
  if (row.notificationMode === 'socket')
    return [{ mode: 'socket', handlerKey: row.notificationSocketKey }]
  if (row.notificationMode === 'both') {
    return [
      { mode: 'internal', handlerKey: row.notificationHandlerKey },
      { mode: 'socket', handlerKey: row.notificationSocketKey }
    ]
  }
  return []
}

export async function queueNotificationAttempts(
  ctx: app.Ctx,
  pairs: Array<{ subscription: BrokerSubscriptionsRow; deliveries: BrokerDeliveriesRow[] }>
): Promise<number> {
  const enabled = await settingsLib.getSetting(
    ctx,
    settingsLib.SETTING_KEYS.BROKER_NOTIFICATION_ENABLED
  )
  if (enabled === false) {
    await loggerLib.writeServerLog(ctx, {
      severity: 6,
      message: `[${LOG_PATH}] Broker notifications disabled`,
      payload: {}
    })
    return 0
  }
  const maxBatchSize = Number(
    await settingsLib.getSetting(ctx, settingsLib.SETTING_KEYS.BROKER_MAX_BATCH_SIZE)
  )
  let queued = 0
  for (const pair of pairs) {
    const deliveryIds = pair.deliveries.map((item) => item.deliveryId)
    for (const channel of channelsForSubscription(pair.subscription)) {
      if (!channel.handlerKey) {
        await loggerLib.writeServerLog(ctx, {
          severity: 4,
          message: `[${LOG_PATH}] Notification channel has no handler key`,
          payload: {
            consumerModule: pair.subscription.consumerModule,
            subscriptionKey: pair.subscription.subscriptionKey,
            mode: channel.mode
          }
        })
        continue
      }
      const now = Date.now()
      const nextAttemptAt = now + Math.max(0, pair.subscription.notificationBatchWindowMs)
      await runWithExclusiveLock(
        ctx,
        `broker:notification:queue:${pair.subscription.consumerModule}:${pair.subscription.subscriptionKey}:${channel.mode}:${channel.handlerKey}`,
        async () => {
          const existing = await notificationsRepo.findCoalescable(ctx, {
            consumerModule: pair.subscription.consumerModule,
            subscriptionKey: pair.subscription.subscriptionKey,
            mode: channel.mode,
            handlerKey: channel.handlerKey,
            now,
            maxBatchSize
          })
          if (existing) {
            await notificationsRepo.appendDeliveries(ctx, existing, deliveryIds)
          } else {
            await notificationsRepo.create(ctx, {
              notificationId: stableId('ntf'),
              consumerModule: pair.subscription.consumerModule,
              subscriptionKey: pair.subscription.subscriptionKey,
              deliveryIds,
              mode: channel.mode,
              handlerKey: channel.handlerKey,
              nextAttemptAt
            })
          }
        }
      )
      queued++
    }
  }
  return queued
}

export async function dispatchBrokerNotifications(ctx: app.Ctx): Promise<{ processed: number }> {
  const started = Date.now()
  const enabled = await settingsLib.getSetting(
    ctx,
    settingsLib.SETTING_KEYS.BROKER_NOTIFICATION_ENABLED
  )
  const maxAttempts = Number(
    await settingsLib.getSetting(ctx, settingsLib.SETTING_KEYS.BROKER_NOTIFICATION_MAX_ATTEMPTS)
  )
  const retryDelay = Number(
    await settingsLib.getSetting(ctx, settingsLib.SETTING_KEYS.BROKER_NOTIFICATION_RETRY_DELAY_MS)
  )
  const rows = await notificationsRepo.findPending(ctx, { limit: 50 })
  let processed = 0
  for (const row of rows) {
    if (Date.now() - started > 9500) {
      await loggerLib.writeServerLog(ctx, {
        severity: 7,
        message: `[${LOG_PATH}] Notification dispatch budget exhausted`,
        payload: { processed }
      })
      break
    }
    const didProcess = await runWithExclusiveLock(
      ctx,
      `broker:notification:dispatch:${row.notificationId}`,
      async () => {
        const current = await notificationsRepo.findByNotificationId(ctx, row.notificationId)
        if (!current || !['pending', 'failed'].includes(current.status)) return false
        if (enabled === false) {
          await notificationsRepo.markSkipped(ctx, current, 'notification_disabled')
          return true
        }
        if (maxAttempts <= 0) {
          await notificationsRepo.markSkipped(ctx, current, 'max_attempts_zero')
          return true
        }
        try {
          if (current.mode === 'socket') {
            await sendDataToSocket(ctx, current.handlerKey, {
              type: 'broker.deliveries.available',
              data: {
                consumerModule: current.consumerModule,
                subscriptionKey: current.subscriptionKey,
                deliveryCount: Array.isArray(current.deliveryIds) ? current.deliveryIds.length : 0
              }
            } as any)
          }
          await notificationsRepo.markSent(ctx, current)
          return true
        } catch (error) {
          await loggerLib.writeServerLog(ctx, {
            severity: 4,
            message: `[${LOG_PATH}] Notification dispatch failed`,
            payload: { notificationId: current.notificationId, error: safeError(error) }
          })
          const exhausted = current.attempts + 1 >= maxAttempts
          await notificationsRepo.markFailed(
            ctx,
            current,
            safeError(error),
            Date.now() + retryDelay,
            exhausted
          )
          return true
        }
      }
    )
    if (didProcess) processed++
  }
  return { processed }
}
