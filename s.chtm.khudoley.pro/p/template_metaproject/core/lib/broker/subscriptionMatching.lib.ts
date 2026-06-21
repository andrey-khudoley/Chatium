import { runWithExclusiveLock } from '@app/sync'
import * as subscriptionsRepo from '../../repos/brokerSubscriptions.repo'
import * as settingsLib from '../settings.lib'
import { BrokerSemanticError } from './errorCodes.lib'
import { assertCanSubscribe, assertModuleRegistered } from './moduleIdentity.lib'
import {
  anyPatternMatches,
  clampInt,
  normalizeOptionalString,
  normalizeString,
  patternMatches,
  validatePattern,
  validateSubscriptionName
} from './patterns.lib'
import { sanitizeJson } from './safeJson.lib'
import type {
  RegisterBrokerSubscriptionsRequest,
  RetryPolicy,
  BrokerSubscriptionSafe
} from './types.lib'
import { asStringArray, toSubscriptionSafe } from './types.lib'
import type { BrokerEventsRow } from '../../tables/brokerEvents.table'
import type { BrokerSubscriptionsRow } from '../../tables/brokerSubscriptions.table'

type RegistrationResult = {
  name: string
  subscriptionKey?: string
  success: boolean
  subscription?: BrokerSubscriptionSafe
  code?: 'forbidden_event_type' | 'invalid_filter' | 'invalid_request'
  error?: string
}

async function getNumberSetting(ctx: app.Ctx, key: string): Promise<number> {
  const value = await settingsLib.getSetting(ctx, key)
  return typeof value === 'number' ? value : Number(value)
}

export async function getDefaultRetryPolicy(ctx: app.Ctx): Promise<RetryPolicy> {
  return {
    maxAttempts: await getNumberSetting(
      ctx,
      settingsLib.SETTING_KEYS.BROKER_DEFAULT_RETRY_MAX_ATTEMPTS
    ),
    initialDelayMs: await getNumberSetting(
      ctx,
      settingsLib.SETTING_KEYS.BROKER_DEFAULT_RETRY_INITIAL_DELAY_MS
    ),
    backoffMultiplier: await getNumberSetting(
      ctx,
      settingsLib.SETTING_KEYS.BROKER_DEFAULT_RETRY_BACKOFF_MULTIPLIER
    )
  }
}

export async function registerBrokerSubscriptions(
  ctx: app.Ctx,
  consumerModule: string,
  request: RegisterBrokerSubscriptionsRequest
) {
  if (request.consumerModule && request.consumerModule !== consumerModule) {
    throw new BrokerSemanticError('invalid_request', 'consumerModule mismatch')
  }
  const moduleRow = await assertModuleRegistered(ctx, consumerModule)
  if (!Array.isArray(request.subscriptions) || request.subscriptions.length === 0) {
    throw new BrokerSemanticError('invalid_request', 'subscriptions must be non-empty array')
  }
  const maxBatchSize = await getNumberSetting(ctx, settingsLib.SETTING_KEYS.BROKER_MAX_BATCH_SIZE)
  if (request.subscriptions.length > maxBatchSize) {
    throw new BrokerSemanticError('invalid_request', 'subscriptions batch is too large', {
      maxBatchSize
    })
  }
  const defaultRetry = await getDefaultRetryPolicy(ctx)
  const defaultAckTimeout = await getNumberSetting(
    ctx,
    settingsLib.SETTING_KEYS.BROKER_DEFAULT_ACK_TIMEOUT_MS
  )
  const defaultNotificationWindow = await getNumberSetting(
    ctx,
    settingsLib.SETTING_KEYS.BROKER_NOTIFICATION_BATCH_WINDOW_MS
  )
  const results: RegistrationResult[] = []
  const seen = new Set<string>()
  for (const item of request.subscriptions) {
    const name = typeof item.name === 'string' ? item.name.trim() : ''
    try {
      validateSubscriptionName(name)
      if (seen.has(name))
        throw new BrokerSemanticError('invalid_request', 'Duplicate subscription name')
      seen.add(name)
      const eventTypes = Array.isArray(item.eventTypes) ? item.eventTypes.map(String) : []
      const sourceModules = Array.isArray(item.sourceModules) ? item.sourceModules.map(String) : []
      for (const pattern of [...eventTypes, ...sourceModules]) validatePattern(pattern || '*')
      if (!eventTypes.length) {
        if (!asStringArray(moduleRow.allowedSubscribeTypes).length) {
          throw new BrokerSemanticError(
            'forbidden_event_type',
            'Consumer has no allowed subscription event types'
          )
        }
      } else {
        for (const eventType of eventTypes) assertCanSubscribe(moduleRow, eventType)
      }
      const notification = item.notification ?? { mode: 'none' as const }
      const mode = notification.mode ?? 'none'
      const handlerKey = normalizeOptionalString(notification.handlerKey, 200)
      const socketKey = normalizeOptionalString(notification.socketKey, 200)
      if (mode === 'internal' && !handlerKey)
        throw new BrokerSemanticError('invalid_request', 'handlerKey is required')
      if (mode === 'socket' && !socketKey)
        throw new BrokerSemanticError('invalid_request', 'socketKey is required')
      if (mode === 'both' && (!handlerKey || !socketKey)) {
        throw new BrokerSemanticError('invalid_request', 'handlerKey and socketKey are required')
      }
      if (mode === 'none' && (handlerKey || socketKey)) {
        throw new BrokerSemanticError(
          'invalid_request',
          'notification keys are not allowed for none mode'
        )
      }
      const retryPolicy = {
        maxAttempts: clampInt(
          item.delivery?.retryPolicy?.maxAttempts,
          0,
          100,
          defaultRetry.maxAttempts
        ),
        initialDelayMs: clampInt(
          item.delivery?.retryPolicy?.initialDelayMs,
          0,
          86400000,
          defaultRetry.initialDelayMs
        ),
        backoffMultiplier:
          typeof item.delivery?.retryPolicy?.backoffMultiplier === 'number'
            ? Math.max(1, Math.min(10, item.delivery.retryPolicy.backoffMultiplier))
            : defaultRetry.backoffMultiplier
      }
      const subscriptionKey = `${consumerModule}:${name}`
      const row = await runWithExclusiveLock(
        ctx,
        `broker:subscription:${subscriptionKey}`,
        async () =>
          subscriptionsRepo.upsert(ctx, {
            subscriptionKey,
            consumerModule,
            displayName: normalizeString(item.displayName, 'displayName', 200),
            enabled: item.enabled === true,
            sourceModules,
            eventTypes,
            targetedOnly: item.targetedOnly === true,
            notificationMode: mode,
            notificationHandlerKey: mode === 'internal' || mode === 'both' ? handlerKey : '',
            notificationSocketKey: mode === 'socket' || mode === 'both' ? socketKey : '',
            notificationBatchWindowMs: clampInt(
              notification.batchWindowMs,
              0,
              60000,
              defaultNotificationWindow
            ),
            maxBatchSize: clampInt(item.delivery?.maxBatchSize, 1, maxBatchSize, maxBatchSize),
            ackTimeoutMs: clampInt(item.delivery?.ackTimeoutMs, 10000, 3600000, defaultAckTimeout),
            retryPolicy,
            metadata: sanitizeJson(item.metadata ?? {})
          })
      )
      results.push({
        name,
        subscriptionKey,
        success: true,
        subscription: toSubscriptionSafe(row)
      })
    } catch (error) {
      const semantic = error as { code?: RegistrationResult['code']; message?: string }
      results.push({
        name: name || '',
        success: false,
        code: semantic.code ?? 'invalid_request',
        error: semantic.message ?? String(error)
      })
    }
  }
  return {
    success: true as const,
    registered: results.filter((item) => item.success).length,
    results
  }
}

export async function findMatchingSubscriptions(
  ctx: app.Ctx,
  event: BrokerEventsRow
): Promise<BrokerSubscriptionsRow[]> {
  const rows = await subscriptionsRepo.findEffectiveEnabled(ctx)
  const targets = asStringArray(event.targetModules)
  return rows.filter((row) => {
    const sourceModules = asStringArray(row.sourceModules)
    const eventTypes = asStringArray(row.eventTypes)
    if (row.targetedOnly === true && !targets.includes(row.consumerModule)) return false
    if (targets.length && !targets.includes(row.consumerModule)) return false
    if (
      sourceModules.length &&
      !sourceModules.some((pattern) => patternMatches(pattern, event.producerModule))
    ) {
      return false
    }
    if (eventTypes.length) return anyPatternMatches(eventTypes, event.eventType)
    return true
  })
}
