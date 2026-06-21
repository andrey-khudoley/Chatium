import { BrokerEvents, type BrokerEventsRow } from '../tables/brokerEvents.table'

export type EventCreate = {
  eventId: string
  producerModule: string
  eventType: string
  eventVersion: number
  contractKey: string
  schemaHash: string
  occurredAt: number
  publishedAt: number
  targetModules: string[]
  aggregateType: string
  aggregateId: string
  correlationId: string
  causationId: string
  idempotencyKey: string
  idempotencyFingerprint: string
  payload: unknown
  metadata: unknown
}

export async function create(ctx: app.Ctx, payload: EventCreate): Promise<BrokerEventsRow> {
  return BrokerEvents.create(ctx, payload)
}

export async function findByEventId(
  ctx: app.Ctx,
  eventId: string
): Promise<BrokerEventsRow | null> {
  return BrokerEvents.findOneBy(ctx, { eventId })
}

export async function findByIdempotencyKey(
  ctx: app.Ctx,
  producerModule: string,
  idempotencyKey: string
): Promise<BrokerEventsRow | null> {
  if (!idempotencyKey) return null
  const rows = await BrokerEvents.findAll(ctx, {
    where: { producerModule, idempotencyKey },
    limit: 1
  })
  return rows[0] ?? null
}

export async function findRecent(
  ctx: app.Ctx,
  opts: { producerModule?: string; eventType?: string; eventId?: string; limit?: number } = {}
): Promise<BrokerEventsRow[]> {
  const where: Record<string, unknown> = {}
  if (opts.producerModule) where.producerModule = opts.producerModule
  if (opts.eventType) where.eventType = opts.eventType
  if (opts.eventId) where.eventId = opts.eventId
  return BrokerEvents.findAll(ctx, {
    where: Object.keys(where).length ? where : undefined,
    order: [{ publishedAt: 'desc' }],
    limit: opts.limit ?? 100
  })
}
