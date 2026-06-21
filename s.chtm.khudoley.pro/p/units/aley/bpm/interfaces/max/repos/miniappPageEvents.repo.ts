import { MiniappPageEvents, type MiniappPageEventsRow } from '../tables/miniappPageEvents.table'

export type MiniappPageEventCreate = {
  pageKey: string
  eventType: string
  action: string
  receivedAt: number
  maxUserId: string
  chatId: string
  startParam: string
  initDataHash: string
  payload: unknown
  brokerEventType: string
  brokerTargetModules: string[]
  brokerPublishStatus: string
}

export async function create(
  ctx: app.Ctx,
  data: MiniappPageEventCreate
): Promise<MiniappPageEventsRow> {
  return MiniappPageEvents.create(ctx, {
    ...data,
    brokerEventId: '',
    brokerPublishedAt: 0,
    brokerPublishError: ''
  })
}

export async function findById(ctx: app.Ctx, id: string): Promise<MiniappPageEventsRow | null> {
  return MiniappPageEvents.findById(ctx, id)
}

export async function findRecent(
  ctx: app.Ctx,
  opts: { pageKey?: string; eventType?: string; limit?: number } = {}
): Promise<MiniappPageEventsRow[]> {
  const where: Record<string, unknown> = {}
  if (opts.pageKey) where.pageKey = opts.pageKey
  if (opts.eventType) where.eventType = opts.eventType
  return MiniappPageEvents.findAll(ctx, {
    where: Object.keys(where).length ? where : undefined,
    order: [{ receivedAt: 'desc' }],
    limit: opts.limit ?? 100
  } as any)
}

export async function findBrokerPublishPending(
  ctx: app.Ctx,
  opts: { limit?: number } = {}
): Promise<MiniappPageEventsRow[]> {
  const rows = await MiniappPageEvents.findAll(ctx, {
    where: { brokerPublishStatus: 'not_published' },
    order: [{ receivedAt: 'asc' }],
    limit: opts.limit ?? 100
  } as any)
  if (rows.length >= (opts.limit ?? 100)) return rows
  const failed = await MiniappPageEvents.findAll(ctx, {
    where: { brokerPublishStatus: 'failed' },
    order: [{ receivedAt: 'asc' }],
    limit: (opts.limit ?? 100) - rows.length
  } as any)
  return [...rows, ...failed]
}

export async function markBrokerPublished(
  ctx: app.Ctx,
  row: MiniappPageEventsRow,
  data: { eventId: string; eventType: string; publishedAt: number }
): Promise<MiniappPageEventsRow> {
  return MiniappPageEvents.update(ctx, {
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
  row: MiniappPageEventsRow,
  data: { eventType: string; error: string }
): Promise<MiniappPageEventsRow> {
  return MiniappPageEvents.update(ctx, {
    id: row.id,
    brokerEventType: data.eventType,
    brokerPublishStatus: 'failed',
    brokerPublishError: data.error
  })
}
