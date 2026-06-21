import { runWithExclusiveLock } from '@app/sync'
import * as modulesRepo from '../../repos/brokerModules.repo'
import * as contractsRepo from '../../repos/brokerEventContracts.repo'
import * as eventsRepo from '../../repos/brokerEvents.repo'
import * as deliveriesRepo from '../../repos/brokerDeliveries.repo'
import * as subscriptionsRepo from '../../repos/brokerSubscriptions.repo'
import * as notificationsRepo from '../../repos/brokerNotificationAttempts.repo'
import * as auditRepo from '../../repos/brokerOpsAudit.repo'
import * as settingsLib from '../settings.lib'
import { brokerNotificationsDispatchJob } from '../../jobs/broker/notifications-dispatch'
import { BrokerSemanticError } from './errorCodes.lib'
import { assertPayloadMatchesSchema } from './schemaValidation.lib'
import { registerManyForOwner, assertPublishableContract } from './eventContracts.lib'
import {
  assertBrokerEnabled,
  assertCanPublish,
  assertModuleEnabled,
  assertModuleRegistered
} from './moduleIdentity.lib'
import {
  findMatchingSubscriptions,
  getDefaultRetryPolicy,
  registerBrokerSubscriptions as registerSubscriptionsImpl
} from './subscriptionMatching.lib'
import { buildPrimarySummary } from './eventSummary.lib'
import { queueNotificationAttempts } from './notify.lib'
import {
  clampInt,
  normalizeOptionalString,
  normalizeString,
  validateEventType
} from './patterns.lib'
import { canonicalJson, safeError, sanitizeJson, stableHash, stableId } from './safeJson.lib'
import {
  asRetryPolicy,
  asStringArray,
  toDeliverySafe,
  toEventSafe,
  toModuleSafe,
  toNotificationSafe,
  toSubscriptionSafe,
  type AckDeliveriesRequest,
  type AckDeliveryItem,
  type BrokerErrorResult,
  type DeliveryActionResult,
  type FailDeliveriesRequest,
  type FailDeliveryItem,
  type PublishEventRequest,
  type RegisterBrokerModuleRequest,
  type RegisterBrokerSubscriptionsRequest,
  type RetryBrokerNotificationsRequest
} from './types.lib'

type CallerInfo = Record<string, unknown> | undefined
const MODULE_AUTH_HASH_KEY = 'moduleAuthTokenHash'

function fingerprintPublishRequest(request: PublishEventRequest): string {
  return stableHash({
    eventType: request.eventType,
    eventVersion: request.eventVersion,
    occurredAt: request.occurredAt ?? 0,
    targetModules: [...(request.targetModules ?? [])].map(String).sort(),
    aggregateType: request.aggregateType ?? '',
    aggregateId: request.aggregateId ?? '',
    correlationId: request.correlationId ?? '',
    causationId: request.causationId ?? '',
    payload: request.payload
  })
}

function claimTokenHash(claimToken: string): string {
  return stableHash(`broker-claim:${claimToken}`)
}

function normalizeAckRequest(request: AckDeliveriesRequest): AckDeliveryItem[] {
  if ('items' in request) return Array.isArray(request.items) ? request.items : []
  return [request]
}

function normalizeFailRequest(request: FailDeliveriesRequest): FailDeliveryItem[] {
  if ('items' in request) return Array.isArray(request.items) ? request.items : []
  return [request]
}

function semanticResult(error: unknown): BrokerErrorResult {
  if (error instanceof BrokerSemanticError) {
    return error.details
      ? { success: false, code: error.code, error: error.message, details: error.details }
      : { success: false, code: error.code, error: error.message }
  }
  return { success: false, code: 'invalid_request', error: String(error) }
}

async function getBrokerMaxBatchSize(ctx: app.Ctx): Promise<number> {
  return Number(await settingsLib.getSetting(ctx, settingsLib.SETTING_KEYS.BROKER_MAX_BATCH_SIZE))
}

function getAdminUserId(ctx: app.Ctx): string {
  const user = (ctx as unknown as { user?: { id?: unknown; email?: unknown } }).user
  return String(user?.id ?? user?.email ?? 'admin')
}

function normalizeAuthToken(authToken: unknown): string {
  return typeof authToken === 'string' ? authToken.trim() : ''
}

function moduleAuthHash(moduleKey: string, authToken: string): string {
  return stableHash(`broker-module-auth:${moduleKey}:${authToken}`)
}

function metadataObject(value: unknown): Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {}
}

async function assertModuleAuth(
  ctx: app.Ctx,
  moduleKey: string,
  authToken: unknown
): Promise<void> {
  const token = normalizeAuthToken(authToken)
  if (!token) throw new BrokerSemanticError('invalid_request', 'module auth token is required')
  const existing = await modulesRepo.findByModuleKey(ctx, moduleKey)
  if (!existing) return
  const existingHash = metadataObject(existing.metadata)[MODULE_AUTH_HASH_KEY]
  if (existingHash === undefined || existingHash === null || existingHash === '') return
  if (typeof existingHash === 'string' && existingHash === moduleAuthHash(moduleKey, token)) return
  throw new BrokerSemanticError('invalid_request', 'invalid module auth token', { moduleKey })
}

function buildModuleMetadata(
  moduleKey: string,
  authToken: unknown,
  metadata: unknown
): Record<string, unknown> {
  const token = normalizeAuthToken(authToken)
  return {
    ...metadataObject(sanitizeJson(metadata ?? {})),
    [MODULE_AUTH_HASH_KEY]: moduleAuthHash(moduleKey, token)
  }
}

export async function registerBrokerModule(
  ctx: app.Ctx,
  moduleKey: string,
  request: RegisterBrokerModuleRequest,
  _callerInfo?: CallerInfo,
  authToken?: string
) {
  try {
    if (!request?.module || request.module.moduleKey !== moduleKey) {
      throw new BrokerSemanticError('invalid_request', 'module.moduleKey mismatch')
    }
    await assertModuleAuth(ctx, moduleKey, authToken)
    const allowedPublishTypes = Array.isArray(request.module.allowedPublishTypes)
      ? request.module.allowedPublishTypes.map(String)
      : []
    const allowedSubscribeTypes = Array.isArray(request.module.allowedSubscribeTypes)
      ? request.module.allowedSubscribeTypes.map(String)
      : []
    const row = await modulesRepo.upsert(ctx, {
      moduleKey,
      displayName: normalizeString(request.module.displayName, 'displayName', 200),
      kind: normalizeString(request.module.kind, 'kind', 32),
      enabled: request.module.enabled === true,
      allowedPublishTypes,
      allowedSubscribeTypes,
      metadata: buildModuleMetadata(moduleKey, authToken, request.module.metadata ?? {})
    })
    const contractsRegistered = await registerManyForOwner(
      ctx,
      moduleKey,
      request.eventContracts ?? []
    )
    return { success: true as const, module: toModuleSafe(row), contractsRegistered }
  } catch (error) {
    return semanticResult(error)
  }
}

export async function registerBrokerSubscriptions(
  ctx: app.Ctx,
  consumerModule: string,
  request: RegisterBrokerSubscriptionsRequest,
  _callerInfo?: CallerInfo,
  authToken?: string
) {
  try {
    await assertModuleAuth(ctx, consumerModule, authToken)
    return await registerSubscriptionsImpl(ctx, consumerModule, request)
  } catch (error) {
    return semanticResult(error)
  }
}

export async function publishBrokerEvent(
  ctx: app.Ctx,
  producerModule: string,
  request: PublishEventRequest,
  _callerInfo?: CallerInfo,
  authToken?: string
) {
  try {
    await assertModuleAuth(ctx, producerModule, authToken)
    await assertBrokerEnabled(ctx)
    validateEventType(normalizeString(request.eventType, 'eventType', 160))
    const moduleRow = await assertModuleEnabled(ctx, producerModule)
    assertCanPublish(moduleRow, request.eventType)
    if (!Number.isInteger(request.eventVersion) || request.eventVersion <= 0) {
      throw new BrokerSemanticError('invalid_request', 'eventVersion must be positive integer')
    }
    const contract = await assertPublishableContract(
      ctx,
      producerModule,
      request.eventType,
      request.eventVersion
    )
    assertPayloadMatchesSchema(contract.payloadSchema, request.payload)
    const idempotencyKey = normalizeOptionalString(request.idempotencyKey, 300)
    const lockKey = idempotencyKey
      ? `broker:event:${producerModule}:${idempotencyKey}`
      : `broker:event:${producerModule}:${stableId('publish')}`
    return await runWithExclusiveLock(ctx, lockKey, async () => {
      const fingerprint = idempotencyKey ? fingerprintPublishRequest(request) : ''
      const existing = idempotencyKey
        ? await eventsRepo.findByIdempotencyKey(ctx, producerModule, idempotencyKey)
        : null
      if (existing) {
        if (existing.idempotencyFingerprint !== fingerprint) {
          throw new BrokerSemanticError('invalid_request', 'Idempotency fingerprint conflict', {
            reason: 'idempotency_fingerprint_conflict',
            eventId: existing.eventId
          })
        }
        return {
          success: true as const,
          eventId: existing.eventId,
          deliveriesCreated: 0,
          notificationsQueued: 0
        }
      }
      const now = Date.now()
      const event = await eventsRepo.create(ctx, {
        eventId: stableId('evt'),
        producerModule,
        eventType: request.eventType,
        eventVersion: request.eventVersion,
        contractKey: contract.contractKey,
        schemaHash: contract.schemaHash,
        occurredAt:
          typeof request.occurredAt === 'number' && Number.isFinite(request.occurredAt)
            ? Math.floor(request.occurredAt)
            : now,
        publishedAt: now,
        targetModules: Array.isArray(request.targetModules)
          ? request.targetModules.map(String)
          : [],
        aggregateType: normalizeOptionalString(request.aggregateType, 160),
        aggregateId: normalizeOptionalString(request.aggregateId, 300),
        correlationId: normalizeOptionalString(request.correlationId, 300),
        causationId: normalizeOptionalString(request.causationId, 300),
        idempotencyKey,
        idempotencyFingerprint: fingerprint,
        payload: sanitizeJson(request.payload),
        metadata: sanitizeJson(request.metadata ?? {})
      })
      const subscriptions = await findMatchingSubscriptions(ctx, event)
      const deliveries = await deliveriesRepo.createManyForEvent(ctx, event, subscriptions, () =>
        stableId('dlv')
      )
      const pairs = subscriptions.map((subscription) => ({
        subscription,
        deliveries: deliveries.filter(
          (delivery) => delivery.subscriptionKey === subscription.subscriptionKey
        )
      }))
      const notificationsQueued = await queueNotificationAttempts(ctx, pairs)
      if (notificationsQueued > 0) {
        await brokerNotificationsDispatchJob.scheduleJobAsap(ctx, {})
      }
      return {
        success: true as const,
        eventId: event.eventId,
        deliveriesCreated: deliveries.length,
        notificationsQueued
      }
    })
  } catch (error) {
    return semanticResult(error)
  }
}

export async function pollBrokerDeliveries(
  ctx: app.Ctx,
  consumerModule: string,
  request: { subscriptionKey?: string; limit?: number },
  _callerInfo?: CallerInfo,
  authToken?: string
) {
  try {
    await assertModuleAuth(ctx, consumerModule, authToken)
    await assertBrokerEnabled(ctx)
    const moduleRow = await assertModuleEnabled(ctx, consumerModule)
    const maxBatchSize = await getBrokerMaxBatchSize(ctx)
    const limit = clampInt(request?.limit, 1, maxBatchSize, maxBatchSize)
    const subscriptionKey = normalizeOptionalString(request?.subscriptionKey, 300)
    if (subscriptionKey) {
      const sub = await subscriptionsRepo.findBySubscriptionKey(ctx, subscriptionKey)
      if (!sub)
        throw new BrokerSemanticError(
          'subscription_not_registered',
          'Subscription is not registered'
        )
      if (
        sub.consumerModule !== consumerModule ||
        sub.enabled !== true ||
        sub.adminDisabled === true
      ) {
        throw new BrokerSemanticError('subscription_disabled', 'Subscription is disabled')
      }
    }
    return await runWithExclusiveLock(ctx, `broker:poll:${consumerModule}`, async () => {
      const now = Date.now()
      const expired = await deliveriesRepo.findExpiredClaims(ctx, consumerModule, now)
      for (const row of expired) await deliveriesRepo.releaseExpiredClaim(ctx, row)
      const rows = await deliveriesRepo.findAvailableForConsumer(ctx, consumerModule, {
        subscriptionKey,
        limit,
        now
      })
      const deliveries = []
      for (const row of rows) {
        const sub = await subscriptionsRepo.findBySubscriptionKey(ctx, row.subscriptionKey)
        const ackTimeoutMs = sub?.ackTimeoutMs ?? 300000
        const claimToken = stableId('clm')
        const claimed = await deliveriesRepo.claim(ctx, row, {
          claimTokenHash: claimTokenHash(claimToken),
          claimedUntil: Date.now() + ackTimeoutMs
        })
        const event = await eventsRepo.findByEventId(ctx, claimed.eventId)
        if (!event) continue
        deliveries.push({
          deliveryId: claimed.deliveryId,
          claimToken,
          subscriptionKey: claimed.subscriptionKey,
          event: {
            eventId: event.eventId,
            producerModule: event.producerModule,
            eventType: event.eventType,
            eventVersion: event.eventVersion,
            contractKey: event.contractKey,
            schemaHash: event.schemaHash,
            occurredAt: event.occurredAt,
            publishedAt: event.publishedAt,
            payload: event.payload,
            metadata:
              typeof event.metadata === 'object' && event.metadata !== null
                ? (event.metadata as Record<string, unknown>)
                : {}
          }
        })
      }
      return { success: true as const, deliveries, module: toModuleSafe(moduleRow) }
    })
  } catch (error) {
    return semanticResult(error)
  }
}

async function assertDeliveryClaim(ctx: app.Ctx, consumerModule: string, item: AckDeliveryItem) {
  const deliveryId = normalizeString(item.deliveryId, 'deliveryId', 200)
  const token = normalizeString(item.claimToken, 'claimToken', 300)
  const row = await deliveriesRepo.findByDeliveryId(ctx, deliveryId)
  if (!row || row.consumerModule !== consumerModule || row.status !== 'claimed') {
    throw new BrokerSemanticError('delivery_not_claimed', 'Delivery is not claimed', { deliveryId })
  }
  if (row.claimTokenHash !== claimTokenHash(token)) {
    throw new BrokerSemanticError('invalid_claim_token', 'Invalid claim token', { deliveryId })
  }
  return row
}

export async function ackBrokerDeliveries(
  ctx: app.Ctx,
  consumerModule: string,
  request: AckDeliveriesRequest,
  _callerInfo?: CallerInfo,
  authToken?: string
) {
  try {
    await assertModuleAuth(ctx, consumerModule, authToken)
    await assertBrokerEnabled(ctx)
    await assertModuleEnabled(ctx, consumerModule)
    const items = normalizeAckRequest(request)
    const maxBatchSize = await getBrokerMaxBatchSize(ctx)
    if (!items.length || items.length > maxBatchSize) {
      throw new BrokerSemanticError('invalid_request', 'Invalid ack batch size')
    }
    const seen = new Set<string>()
    const results: DeliveryActionResult[] = []
    for (const item of items) {
      const deliveryId = typeof item.deliveryId === 'string' ? item.deliveryId : ''
      if (seen.has(deliveryId)) {
        results.push({
          deliveryId,
          success: false,
          code: 'invalid_request',
          error: 'Duplicate deliveryId'
        })
        continue
      }
      seen.add(deliveryId)
      const result = await runWithExclusiveLock(ctx, `broker:delivery:${deliveryId}`, async () => {
        try {
          const row = await assertDeliveryClaim(ctx, consumerModule, item)
          await deliveriesRepo.markAcked(ctx, row)
          return { deliveryId: row.deliveryId, success: true, status: 'acked' as const }
        } catch (error) {
          const semantic = error as { code?: DeliveryActionResult['code']; message?: string }
          return {
            deliveryId,
            success: false,
            code: semantic.code ?? 'invalid_request',
            error: semantic.message ?? String(error)
          }
        }
      })
      results.push(result)
    }
    return {
      success: true as const,
      acked: results.filter((item) => item.success && item.status === 'acked').length,
      results
    }
  } catch (error) {
    return semanticResult(error)
  }
}

export async function failBrokerDeliveries(
  ctx: app.Ctx,
  consumerModule: string,
  request: FailDeliveriesRequest,
  _callerInfo?: CallerInfo,
  authToken?: string
) {
  try {
    await assertModuleAuth(ctx, consumerModule, authToken)
    await assertBrokerEnabled(ctx)
    await assertModuleEnabled(ctx, consumerModule)
    const items = normalizeFailRequest(request)
    const maxBatchSize = await getBrokerMaxBatchSize(ctx)
    if (!items.length || items.length > maxBatchSize) {
      throw new BrokerSemanticError('invalid_request', 'Invalid fail batch size')
    }
    const defaultRetry = await getDefaultRetryPolicy(ctx)
    const seen = new Set<string>()
    const results: DeliveryActionResult[] = []
    for (const item of items) {
      const deliveryId = typeof item.deliveryId === 'string' ? item.deliveryId : ''
      if (seen.has(deliveryId)) {
        results.push({
          deliveryId,
          success: false,
          code: 'invalid_request',
          error: 'Duplicate deliveryId'
        })
        continue
      }
      seen.add(deliveryId)
      const result = await runWithExclusiveLock(ctx, `broker:delivery:${deliveryId}`, async () => {
        try {
          if (item.error === undefined || item.error === null) {
            throw new BrokerSemanticError('invalid_request', 'error is required')
          }
          const row = await assertDeliveryClaim(ctx, consumerModule, item)
          const sub = await subscriptionsRepo.findBySubscriptionKey(ctx, row.subscriptionKey)
          const policy = sub ? asRetryPolicy(sub.retryPolicy) : defaultRetry
          const nextAttempt = row.attempts + 1
          const deadLetter = policy.maxAttempts === 0 || nextAttempt >= policy.maxAttempts
          const delay =
            policy.initialDelayMs * Math.pow(policy.backoffMultiplier, Math.max(0, nextAttempt - 1))
          const updated = await deliveriesRepo.markFailed(ctx, row, {
            error: safeError(item.error),
            retryAt: deadLetter ? 0 : Date.now() + delay,
            deadLetter
          })
          return {
            deliveryId: updated.deliveryId,
            success: true,
            status: updated.status as 'failed' | 'dead_letter'
          }
        } catch (error) {
          const semantic = error as { code?: DeliveryActionResult['code']; message?: string }
          return {
            deliveryId,
            success: false,
            code: semantic.code ?? 'invalid_request',
            error: semantic.message ?? String(error)
          }
        }
      })
      results.push(result)
    }
    return {
      success: true as const,
      failed: results.filter((item) => item.success && item.status === 'failed').length,
      deadLetter: results.filter((item) => item.success && item.status === 'dead_letter').length,
      results
    }
  } catch (error) {
    return semanticResult(error)
  }
}

export async function getBrokerDiagnostics(
  ctx: app.Ctx,
  filters: {
    moduleKey?: string
    eventType?: string
    eventId?: string
    subscriptionKey?: string
    deliveryStatus?: string
    notificationStatus?: string
    limit?: number
  } = {}
) {
  try {
    const limit = clampInt(filters.limit, 1, 200, 50)
    const [modules, subscriptions, events, deliveries, notifications] = await Promise.all([
      modulesRepo.findAll(ctx, { limit }),
      subscriptionsRepo.findAll(ctx, { limit, consumerModule: filters.moduleKey }),
      eventsRepo.findRecent(ctx, { eventType: filters.eventType, eventId: filters.eventId, limit }),
      deliveriesRepo.findRecent(ctx, {
        consumerModule: filters.moduleKey,
        status: filters.deliveryStatus,
        limit
      }),
      notificationsRepo.findRecent(ctx, {
        consumerModule: filters.moduleKey,
        status: filters.notificationStatus,
        limit
      })
    ])
    const contractMap: Record<
      string,
      Awaited<ReturnType<typeof contractsRepo.findByContractKey>>
    > = {}
    for (const event of events) {
      if (!contractMap[event.contractKey]) {
        contractMap[event.contractKey] = await contractsRepo.findByContractKey(
          ctx,
          event.contractKey
        )
      }
    }
    return {
      success: true as const,
      modules: modules.map(toModuleSafe),
      subscriptions: subscriptions
        .filter(
          (row) => !filters.subscriptionKey || row.subscriptionKey === filters.subscriptionKey
        )
        .map(toSubscriptionSafe),
      events: events.map((row) =>
        toEventSafe(row, buildPrimarySummary(row.payload, contractMap[row.contractKey] ?? null))
      ),
      deliveries: deliveries.map(toDeliverySafe),
      notifications: notifications.map(toNotificationSafe)
    }
  } catch (error) {
    return semanticResult(error)
  }
}

export async function getBrokerEventRaw(
  ctx: app.Ctx,
  request: { eventId?: unknown; reason?: unknown }
) {
  try {
    const eventId = normalizeString(request.eventId, 'eventId', 200)
    const row = await eventsRepo.findByEventId(ctx, eventId)
    if (!row) throw new BrokerSemanticError('not_found', 'Event not found')
    await auditRepo.create(ctx, {
      auditId: stableId('boa'),
      action: 'raw_payload_view',
      targetType: 'event',
      targetId: eventId,
      adminUserId: getAdminUserId(ctx),
      reason: normalizeOptionalString(request.reason, 500),
      metadata: { eventType: row.eventType, eventVersion: row.eventVersion }
    })
    return { success: true as const, eventId, payload: row.payload, metadata: row.metadata }
  } catch (error) {
    return semanticResult(error)
  }
}

export async function toggleBrokerModule(
  ctx: app.Ctx,
  request: { moduleKey?: unknown; enabled?: unknown; reason?: unknown }
) {
  try {
    const moduleKey = normalizeString(request.moduleKey, 'moduleKey', 300)
    const reason = normalizeString(request.reason, 'reason', 1000)
    if (typeof request.enabled !== 'boolean') {
      throw new BrokerSemanticError('invalid_request', 'enabled must be boolean')
    }
    const row = await modulesRepo.findByModuleKey(ctx, moduleKey)
    if (!row) throw new BrokerSemanticError('module_not_registered', 'Module is not registered')
    const before = toModuleSafe(row)
    const updated = await modulesRepo.setAdminDisabled(ctx, row, request.enabled === false, reason)
    const after = toModuleSafe(updated)
    await auditRepo.create(ctx, {
      auditId: stableId('boa'),
      action: 'module_toggle',
      targetType: 'module',
      targetId: moduleKey,
      adminUserId: getAdminUserId(ctx),
      reason,
      before,
      after
    })
    return { success: true as const, module: after }
  } catch (error) {
    return semanticResult(error)
  }
}

export async function toggleBrokerSubscription(
  ctx: app.Ctx,
  request: { subscriptionKey?: unknown; enabled?: unknown; reason?: unknown }
) {
  try {
    const subscriptionKey = normalizeString(request.subscriptionKey, 'subscriptionKey', 300)
    const reason = normalizeString(request.reason, 'reason', 1000)
    if (typeof request.enabled !== 'boolean') {
      throw new BrokerSemanticError('invalid_request', 'enabled must be boolean')
    }
    const row = await subscriptionsRepo.findBySubscriptionKey(ctx, subscriptionKey)
    if (!row)
      throw new BrokerSemanticError('subscription_not_registered', 'Subscription is not registered')
    const before = toSubscriptionSafe(row)
    const updated = await subscriptionsRepo.setAdminDisabled(
      ctx,
      row,
      request.enabled === false,
      reason
    )
    const after = toSubscriptionSafe(updated)
    await auditRepo.create(ctx, {
      auditId: stableId('boa'),
      action: 'subscription_toggle',
      targetType: 'subscription',
      targetId: subscriptionKey,
      adminUserId: getAdminUserId(ctx),
      reason,
      before,
      after
    })
    return { success: true as const, subscription: after }
  } catch (error) {
    return semanticResult(error)
  }
}

export async function requeueBrokerDelivery(
  ctx: app.Ctx,
  request: { deliveryId?: unknown; reason?: unknown }
) {
  try {
    const deliveryId = normalizeString(request.deliveryId, 'deliveryId', 200)
    const reason = normalizeString(request.reason, 'reason', 1000)
    return await runWithExclusiveLock(ctx, `broker:delivery:${deliveryId}`, async () => {
      const row = await deliveriesRepo.findByDeliveryId(ctx, deliveryId)
      if (!row) throw new BrokerSemanticError('not_found', 'Delivery not found')
      if (row.status !== 'failed' && row.status !== 'dead_letter') {
        throw new BrokerSemanticError('delivery_not_requeueable', 'Delivery is not requeueable')
      }
      const before = toDeliverySafe(row)
      const updated = await deliveriesRepo.requeue(ctx, row)
      const after = toDeliverySafe(updated)
      await auditRepo.create(ctx, {
        auditId: stableId('boa'),
        action: 'delivery_requeue',
        targetType: 'delivery',
        targetId: deliveryId,
        adminUserId: getAdminUserId(ctx),
        reason,
        before,
        after,
        metadata: {
          resetFields: [
            'attempts',
            'lastError',
            'claimTokenHash',
            'claimedAt',
            'claimedUntil',
            'ackedAt'
          ]
        }
      })
      return { success: true as const, delivery: after }
    })
  } catch (error) {
    return semanticResult(error)
  }
}

export async function skipBrokerDelivery(
  ctx: app.Ctx,
  request: { deliveryId?: unknown; reason?: unknown }
) {
  try {
    const deliveryId = normalizeString(request.deliveryId, 'deliveryId', 200)
    const reason = normalizeString(request.reason, 'reason', 1000)
    return await runWithExclusiveLock(ctx, `broker:delivery:${deliveryId}`, async () => {
      const row = await deliveriesRepo.findByDeliveryId(ctx, deliveryId)
      if (!row) throw new BrokerSemanticError('not_found', 'Delivery not found')
      if (row.status === 'acked' || row.status === 'skipped') {
        throw new BrokerSemanticError('delivery_not_skippable', 'Delivery is not skippable')
      }
      const before = toDeliverySafe(row)
      const updated = await deliveriesRepo.skip(ctx, row)
      const after = toDeliverySafe(updated)
      await auditRepo.create(ctx, {
        auditId: stableId('boa'),
        action: 'delivery_skip',
        targetType: 'delivery',
        targetId: deliveryId,
        adminUserId: getAdminUserId(ctx),
        reason,
        before,
        after,
        metadata: { resetFields: ['claimTokenHash', 'claimedAt', 'claimedUntil', 'ackedAt'] }
      })
      return { success: true as const, delivery: after }
    })
  } catch (error) {
    return semanticResult(error)
  }
}

export async function retryBrokerNotifications(
  ctx: app.Ctx,
  request: RetryBrokerNotificationsRequest & { reason?: unknown }
) {
  try {
    const reason = normalizeString(request.reason, 'reason', 1000)
    const enabled = await settingsLib.getSetting(
      ctx,
      settingsLib.SETTING_KEYS.BROKER_NOTIFICATION_ENABLED
    )
    if (enabled === false) {
      throw new BrokerSemanticError('notification_not_retryable', 'Notifications are disabled')
    }
    if (request.notificationId && request.filters) {
      throw new BrokerSemanticError(
        'invalid_request',
        'notificationId and filters are mutually exclusive'
      )
    }
    const rows = request.notificationId
      ? [await notificationsRepo.findByNotificationId(ctx, request.notificationId)].filter(Boolean)
      : await notificationsRepo.findRetryable(ctx, {
          ...request.filters,
          limit: clampInt(request.filters?.limit, 1, 200, 50)
        })
    if (request.notificationId && rows.length === 0) {
      throw new BrokerSemanticError('notification_not_found', 'Notification not found')
    }
    const results = []
    let retried = 0
    let skipped = 0
    for (const row of rows) {
      if (!row || (row.status !== 'failed' && row.status !== 'skipped') || !row.handlerKey) {
        skipped++
        results.push({
          notificationId: row?.notificationId ?? '',
          success: false,
          code: 'notification_not_retryable' as const,
          error: 'Notification is not retryable'
        })
        continue
      }
      const updated = await notificationsRepo.resetToPending(ctx, row)
      retried++
      results.push({
        notificationId: updated.notificationId,
        success: true,
        status: 'pending' as const
      })
    }
    await auditRepo.create(ctx, {
      auditId: stableId('boa'),
      action: 'notification_retry',
      targetType: request.notificationId ? 'notification' : 'notification_bulk',
      targetId: request.notificationId ?? `notification_retry_bulk:${Date.now()}`,
      adminUserId: getAdminUserId(ctx),
      reason,
      metadata: {
        filters: request.filters ?? null,
        notificationIds: results.map((item) => item.notificationId),
        retried,
        skipped
      }
    })
    if (retried > 0) await brokerNotificationsDispatchJob.scheduleJobAsap(ctx, {})
    return { success: true as const, retried, skipped, results }
  } catch (error) {
    return semanticResult(error)
  }
}

export function makeIdempotencyFingerprintForTests(request: PublishEventRequest): string {
  return stableHash(canonicalJson(request))
}
