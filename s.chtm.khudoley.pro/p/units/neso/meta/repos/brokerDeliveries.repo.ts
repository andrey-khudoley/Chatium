import { BrokerDeliveries, type BrokerDeliveriesRow } from '../tables/brokerDeliveries.table'
import type { BrokerEventsRow } from '../tables/brokerEvents.table'
import type { BrokerSubscriptionsRow } from '../tables/brokerSubscriptions.table'

export type DeliveryCreate = {
  deliveryId: string
  eventId: string
  subscriptionKey: string
  consumerModule: string
  eventPublishedAt: number
  eventType: string
  eventVersion: number
  contractKey: string
  schemaHash: string
  producerModule: string
  aggregateType: string
  aggregateId: string
}

export async function create(ctx: app.Ctx, payload: DeliveryCreate): Promise<BrokerDeliveriesRow> {
  const now = Date.now()
  return BrokerDeliveries.create(ctx, {
    ...payload,
    status: 'pending',
    attempts: 0,
    availableAt: now,
    claimedAt: 0,
    claimedUntil: 0,
    claimTokenHash: '',
    lastError: '',
    ackedAt: 0,
    createdAt: now,
    updatedAt: now
  })
}

export async function createManyForEvent(
  ctx: app.Ctx,
  event: BrokerEventsRow,
  subscriptions: BrokerSubscriptionsRow[],
  makeId: () => string
): Promise<BrokerDeliveriesRow[]> {
  const rows: BrokerDeliveriesRow[] = []
  for (const sub of subscriptions) {
    rows.push(
      await create(ctx, {
        deliveryId: makeId(),
        eventId: event.eventId,
        subscriptionKey: sub.subscriptionKey,
        consumerModule: sub.consumerModule,
        eventPublishedAt: event.publishedAt,
        eventType: event.eventType,
        eventVersion: event.eventVersion,
        contractKey: event.contractKey,
        schemaHash: event.schemaHash,
        producerModule: event.producerModule,
        aggregateType: event.aggregateType,
        aggregateId: event.aggregateId
      })
    )
  }
  return rows
}

export async function findByDeliveryId(
  ctx: app.Ctx,
  deliveryId: string
): Promise<BrokerDeliveriesRow | null> {
  return BrokerDeliveries.findOneBy(ctx, { deliveryId })
}

export async function findRecent(
  ctx: app.Ctx,
  opts: { limit?: number; consumerModule?: string; status?: string } = {}
): Promise<BrokerDeliveriesRow[]> {
  const where: Record<string, unknown> = {}
  if (opts.consumerModule) where.consumerModule = opts.consumerModule
  if (opts.status) where.status = opts.status
  return BrokerDeliveries.findAll(ctx, {
    where: Object.keys(where).length ? where : undefined,
    order: [{ updatedAt: 'desc' }],
    limit: opts.limit ?? 100
  } as any)
}

export async function findAvailableForConsumer(
  ctx: app.Ctx,
  consumerModule: string,
  opts: { subscriptionKey?: string; limit?: number; now?: number } = {}
): Promise<BrokerDeliveriesRow[]> {
  const now = opts.now ?? Date.now()
  const base: Record<string, unknown> = { consumerModule, availableAt: { $lte: now } }
  if (opts.subscriptionKey) base.subscriptionKey = opts.subscriptionKey
  const pending = await BrokerDeliveries.findAll(ctx, {
    where: { ...base, status: 'pending' },
    order: [{ availableAt: 'asc' }, { eventPublishedAt: 'asc' }, { createdAt: 'asc' }],
    limit: opts.limit ?? 20
  } as any)
  if (pending.length >= (opts.limit ?? 20)) return pending
  const failed = await BrokerDeliveries.findAll(ctx, {
    where: { ...base, status: 'failed' },
    order: [{ availableAt: 'asc' }, { eventPublishedAt: 'asc' }, { createdAt: 'asc' }],
    limit: (opts.limit ?? 20) - pending.length
  } as any)
  return [...pending, ...failed]
}

export async function findExpiredClaims(
  ctx: app.Ctx,
  consumerModule: string,
  now: number
): Promise<BrokerDeliveriesRow[]> {
  return BrokerDeliveries.findAll(ctx, {
    where: { consumerModule, status: 'claimed', claimedUntil: { $lte: now } },
    order: [{ claimedUntil: 'asc' }],
    limit: 200
  } as any)
}

export async function releaseExpiredClaim(
  ctx: app.Ctx,
  row: BrokerDeliveriesRow
): Promise<BrokerDeliveriesRow> {
  return BrokerDeliveries.update(ctx, {
    id: row.id,
    status: 'pending',
    claimedAt: 0,
    claimedUntil: 0,
    claimTokenHash: '',
    updatedAt: Date.now()
  })
}

export async function claim(
  ctx: app.Ctx,
  row: BrokerDeliveriesRow,
  data: { claimTokenHash: string; claimedUntil: number }
): Promise<BrokerDeliveriesRow> {
  const now = Date.now()
  return BrokerDeliveries.update(ctx, {
    id: row.id,
    status: 'claimed',
    claimedAt: now,
    claimedUntil: data.claimedUntil,
    claimTokenHash: data.claimTokenHash,
    updatedAt: now
  })
}

export async function markAcked(
  ctx: app.Ctx,
  row: BrokerDeliveriesRow
): Promise<BrokerDeliveriesRow> {
  return BrokerDeliveries.update(ctx, {
    id: row.id,
    status: 'acked',
    claimedAt: 0,
    claimedUntil: 0,
    claimTokenHash: '',
    ackedAt: Date.now(),
    updatedAt: Date.now()
  })
}

export async function markFailed(
  ctx: app.Ctx,
  row: BrokerDeliveriesRow,
  data: { error: string; retryAt: number; deadLetter: boolean }
): Promise<BrokerDeliveriesRow> {
  const attempts = row.attempts + 1
  return BrokerDeliveries.update(ctx, {
    id: row.id,
    status: data.deadLetter ? 'dead_letter' : 'failed',
    attempts,
    availableAt: data.retryAt,
    claimedAt: 0,
    claimedUntil: 0,
    claimTokenHash: '',
    lastError: data.error,
    updatedAt: Date.now()
  })
}

export async function requeue(
  ctx: app.Ctx,
  row: BrokerDeliveriesRow
): Promise<BrokerDeliveriesRow> {
  return BrokerDeliveries.update(ctx, {
    id: row.id,
    status: 'pending',
    attempts: 0,
    availableAt: Date.now(),
    claimedAt: 0,
    claimedUntil: 0,
    claimTokenHash: '',
    lastError: '',
    ackedAt: 0,
    updatedAt: Date.now()
  })
}

export async function skip(ctx: app.Ctx, row: BrokerDeliveriesRow): Promise<BrokerDeliveriesRow> {
  return BrokerDeliveries.update(ctx, {
    id: row.id,
    status: 'skipped',
    availableAt: 0,
    claimedAt: 0,
    claimedUntil: 0,
    claimTokenHash: '',
    lastError: 'skipped_by_admin',
    ackedAt: 0,
    updatedAt: Date.now()
  })
}
