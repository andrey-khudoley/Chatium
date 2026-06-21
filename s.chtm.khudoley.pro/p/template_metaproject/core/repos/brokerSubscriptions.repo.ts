import {
  BrokerSubscriptions,
  type BrokerSubscriptionsRow
} from '../tables/brokerSubscriptions.table'

export type SubscriptionUpsert = {
  subscriptionKey: string
  consumerModule: string
  displayName: string
  enabled: boolean
  sourceModules: string[]
  eventTypes: string[]
  targetedOnly: boolean
  notificationMode: string
  notificationHandlerKey: string
  notificationSocketKey: string
  notificationBatchWindowMs: number
  maxBatchSize: number
  ackTimeoutMs: number
  retryPolicy: unknown
  metadata?: unknown
}

export async function findBySubscriptionKey(
  ctx: app.Ctx,
  subscriptionKey: string
): Promise<BrokerSubscriptionsRow | null> {
  return BrokerSubscriptions.findOneBy(ctx, { subscriptionKey })
}

export async function findAll(
  ctx: app.Ctx,
  opts: { limit?: number; consumerModule?: string } = {}
): Promise<BrokerSubscriptionsRow[]> {
  const where = opts.consumerModule ? { consumerModule: opts.consumerModule } : undefined
  return BrokerSubscriptions.findAll(ctx, {
    where,
    order: [{ updatedAt: 'desc' }],
    limit: opts.limit ?? 500
  } as any)
}

export async function findEnabledForConsumer(
  ctx: app.Ctx,
  consumerModule: string
): Promise<BrokerSubscriptionsRow[]> {
  return BrokerSubscriptions.findAll(ctx, {
    where: { consumerModule, enabled: true, adminDisabled: false },
    order: [{ subscriptionKey: 'asc' }],
    limit: 1000
  } as any)
}

export async function findEffectiveEnabled(ctx: app.Ctx): Promise<BrokerSubscriptionsRow[]> {
  return BrokerSubscriptions.findAll(ctx, {
    where: { enabled: true, adminDisabled: false },
    order: [{ subscriptionKey: 'asc' }],
    limit: 2000
  } as any)
}

export async function upsert(
  ctx: app.Ctx,
  payload: SubscriptionUpsert
): Promise<BrokerSubscriptionsRow> {
  const now = Date.now()
  const existing = await findBySubscriptionKey(ctx, payload.subscriptionKey)
  const data = {
    subscriptionKey: payload.subscriptionKey,
    consumerModule: payload.consumerModule,
    displayName: payload.displayName,
    enabled: payload.enabled,
    adminDisabled: existing?.adminDisabled ?? false,
    adminDisabledAt: existing?.adminDisabledAt ?? 0,
    adminDisableReason: existing?.adminDisableReason ?? '',
    sourceModules: payload.sourceModules,
    eventTypes: payload.eventTypes,
    targetedOnly: payload.targetedOnly,
    notificationMode: payload.notificationMode,
    notificationHandlerKey: payload.notificationHandlerKey,
    notificationSocketKey: payload.notificationSocketKey,
    notificationBatchWindowMs: payload.notificationBatchWindowMs,
    maxBatchSize: payload.maxBatchSize,
    ackTimeoutMs: payload.ackTimeoutMs,
    retryPolicy: payload.retryPolicy,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
    metadata: payload.metadata ?? existing?.metadata ?? {}
  }
  if (existing) return BrokerSubscriptions.update(ctx, { id: existing.id, ...data })
  return BrokerSubscriptions.create(ctx, data)
}

export async function setAdminDisabled(
  ctx: app.Ctx,
  row: BrokerSubscriptionsRow,
  disabled: boolean,
  reason: string
): Promise<BrokerSubscriptionsRow> {
  return BrokerSubscriptions.update(ctx, {
    id: row.id,
    adminDisabled: disabled,
    adminDisabledAt: disabled ? Date.now() : 0,
    adminDisableReason: disabled ? reason : '',
    updatedAt: Date.now()
  })
}
