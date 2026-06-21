import { MaxRawUpdates, type MaxRawUpdatesRow } from '../tables/maxRawUpdates.table'

export type MaxRawUpdateCreate = {
  source: string
  updateType: string
  maxTimestamp: number
  receivedAt: number
  chatId: string
  userId: string
  fingerprint: string
  rawUpdate: unknown
  rawMeta: unknown
  brokerEventType: string
  brokerPublishStatus: string
}

export async function create(ctx: app.Ctx, data: MaxRawUpdateCreate): Promise<MaxRawUpdatesRow> {
  return MaxRawUpdates.create(ctx, {
    ...data,
    brokerEventId: '',
    brokerPublishedAt: 0,
    brokerPublishError: ''
  })
}

export async function findById(ctx: app.Ctx, id: string): Promise<MaxRawUpdatesRow | null> {
  return MaxRawUpdates.findById(ctx, id)
}

export async function findByFingerprint(
  ctx: app.Ctx,
  fingerprint: string
): Promise<MaxRawUpdatesRow | null> {
  return MaxRawUpdates.findOneBy(ctx, { fingerprint })
}

export async function findRecent(
  ctx: app.Ctx,
  opts: { limit?: number; updateTypes?: string[] } = {}
): Promise<MaxRawUpdatesRow[]> {
  const where = opts.updateTypes?.length ? { updateType: { $in: opts.updateTypes } } : undefined
  return MaxRawUpdates.findAll(ctx, {
    where,
    order: [{ receivedAt: 'desc' }],
    limit: opts.limit ?? 100
  } as any)
}

export async function findBrokerPublishPending(
  ctx: app.Ctx,
  opts: { limit?: number } = {}
): Promise<MaxRawUpdatesRow[]> {
  const rows = await MaxRawUpdates.findAll(ctx, {
    where: { brokerPublishStatus: 'not_published' },
    order: [{ receivedAt: 'asc' }],
    limit: opts.limit ?? 100
  } as any)
  if (rows.length >= (opts.limit ?? 100)) return rows
  const failed = await MaxRawUpdates.findAll(ctx, {
    where: { brokerPublishStatus: 'failed' },
    order: [{ receivedAt: 'asc' }],
    limit: (opts.limit ?? 100) - rows.length
  } as any)
  return [...rows, ...failed]
}

export async function markBrokerPublished(
  ctx: app.Ctx,
  row: MaxRawUpdatesRow,
  data: { eventId: string; eventType: string; publishedAt: number }
): Promise<MaxRawUpdatesRow> {
  return MaxRawUpdates.update(ctx, {
    id: row.id,
    brokerEventType: data.eventType,
    brokerEventId: data.eventId,
    brokerPublishStatus: 'published',
    brokerPublishedAt: data.publishedAt,
    brokerPublishError: ''
  })
}

export async function markBrokerPublishFailed(
  ctx: app.Ctx,
  row: MaxRawUpdatesRow,
  data: { eventType: string; error: string }
): Promise<MaxRawUpdatesRow> {
  return MaxRawUpdates.update(ctx, {
    id: row.id,
    brokerEventType: data.eventType,
    brokerPublishStatus: 'failed',
    brokerPublishError: data.error
  })
}
