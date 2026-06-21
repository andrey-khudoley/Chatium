import {
  BrokerNotificationAttempts,
  type BrokerNotificationAttemptsRow
} from '../tables/brokerNotificationAttempts.table'

export type NotificationCreate = {
  notificationId: string
  consumerModule: string
  subscriptionKey: string
  deliveryIds: string[]
  mode: 'internal' | 'socket'
  handlerKey: string
  nextAttemptAt: number
}

function uniqueStrings(items: string[]): string[] {
  return Array.from(new Set(items.filter(Boolean)))
}

export async function create(
  ctx: app.Ctx,
  payload: NotificationCreate
): Promise<BrokerNotificationAttemptsRow> {
  const now = Date.now()
  return BrokerNotificationAttempts.create(ctx, {
    ...payload,
    deliveryIds: uniqueStrings(payload.deliveryIds),
    status: 'pending',
    attempts: 0,
    lastError: '',
    createdAt: now,
    updatedAt: now
  })
}

export async function findByNotificationId(
  ctx: app.Ctx,
  notificationId: string
): Promise<BrokerNotificationAttemptsRow | null> {
  return BrokerNotificationAttempts.findOneBy(ctx, { notificationId })
}

export async function findCoalescable(
  ctx: app.Ctx,
  opts: {
    consumerModule: string
    subscriptionKey: string
    mode: 'internal' | 'socket'
    handlerKey: string
    now: number
    maxBatchSize: number
  }
): Promise<BrokerNotificationAttemptsRow | null> {
  const rows = await BrokerNotificationAttempts.findAll(ctx, {
    where: {
      consumerModule: opts.consumerModule,
      subscriptionKey: opts.subscriptionKey,
      mode: opts.mode,
      handlerKey: opts.handlerKey,
      status: 'pending',
      nextAttemptAt: { $gt: opts.now }
    },
    order: [{ createdAt: 'desc' }],
    limit: 10
  } as any)
  return (
    rows.find((row) => uniqueStrings(row.deliveryIds as string[]).length < opts.maxBatchSize) ??
    null
  )
}

export async function appendDeliveries(
  ctx: app.Ctx,
  row: BrokerNotificationAttemptsRow,
  deliveryIds: string[]
): Promise<BrokerNotificationAttemptsRow> {
  return BrokerNotificationAttempts.update(ctx, {
    id: row.id,
    deliveryIds: uniqueStrings([...(row.deliveryIds as string[]), ...deliveryIds]),
    updatedAt: Date.now()
  })
}

export async function findPending(
  ctx: app.Ctx,
  opts: { limit?: number; now?: number } = {}
): Promise<BrokerNotificationAttemptsRow[]> {
  const now = opts.now ?? Date.now()
  const pending = await BrokerNotificationAttempts.findAll(ctx, {
    where: { status: 'pending', nextAttemptAt: { $lte: now } },
    order: [{ nextAttemptAt: 'asc' }, { createdAt: 'asc' }],
    limit: opts.limit ?? 100
  } as any)
  if (pending.length >= (opts.limit ?? 100)) return pending
  const failed = await BrokerNotificationAttempts.findAll(ctx, {
    where: { status: 'failed', nextAttemptAt: { $lte: now } },
    order: [{ nextAttemptAt: 'asc' }, { createdAt: 'asc' }],
    limit: (opts.limit ?? 100) - pending.length
  } as any)
  return [...pending, ...failed]
}

export async function findRetryable(
  ctx: app.Ctx,
  opts: {
    consumerModule?: string
    subscriptionKey?: string
    mode?: 'internal' | 'socket'
    status?: Array<'failed' | 'skipped'>
    limit?: number
  } = {}
): Promise<BrokerNotificationAttemptsRow[]> {
  const limit = opts.limit ?? 50
  const statuses = opts.status?.length ? opts.status : ['failed', 'skipped']
  const rows: BrokerNotificationAttemptsRow[] = []
  for (const status of statuses) {
    const where: Record<string, unknown> = { status }
    if (opts.consumerModule) where.consumerModule = opts.consumerModule
    if (opts.subscriptionKey) where.subscriptionKey = opts.subscriptionKey
    if (opts.mode) where.mode = opts.mode
    const part = await BrokerNotificationAttempts.findAll(ctx, {
      where,
      order: [{ updatedAt: 'asc' }, { createdAt: 'asc' }],
      limit: Math.max(0, limit - rows.length)
    } as any)
    rows.push(...part)
    if (rows.length >= limit) break
  }
  return rows
}

export async function findRecent(
  ctx: app.Ctx,
  opts: { limit?: number; consumerModule?: string; status?: string } = {}
): Promise<BrokerNotificationAttemptsRow[]> {
  const where: Record<string, unknown> = {}
  if (opts.consumerModule) where.consumerModule = opts.consumerModule
  if (opts.status) where.status = opts.status
  return BrokerNotificationAttempts.findAll(ctx, {
    where: Object.keys(where).length ? where : undefined,
    order: [{ updatedAt: 'desc' }],
    limit: opts.limit ?? 100
  } as any)
}

export async function markSent(
  ctx: app.Ctx,
  row: BrokerNotificationAttemptsRow
): Promise<BrokerNotificationAttemptsRow> {
  return BrokerNotificationAttempts.update(ctx, {
    id: row.id,
    status: 'sent',
    attempts: row.attempts + 1,
    lastError: '',
    updatedAt: Date.now()
  })
}

export async function markFailed(
  ctx: app.Ctx,
  row: BrokerNotificationAttemptsRow,
  error: string,
  nextAttemptAt: number,
  exhausted: boolean
): Promise<BrokerNotificationAttemptsRow> {
  return BrokerNotificationAttempts.update(ctx, {
    id: row.id,
    status: exhausted ? 'skipped' : 'failed',
    attempts: row.attempts + 1,
    nextAttemptAt,
    lastError: error,
    updatedAt: Date.now()
  })
}

export async function markSkipped(
  ctx: app.Ctx,
  row: BrokerNotificationAttemptsRow,
  reason: string
): Promise<BrokerNotificationAttemptsRow> {
  return BrokerNotificationAttempts.update(ctx, {
    id: row.id,
    status: 'skipped',
    lastError: reason,
    updatedAt: Date.now()
  })
}

export async function resetToPending(
  ctx: app.Ctx,
  row: BrokerNotificationAttemptsRow
): Promise<BrokerNotificationAttemptsRow> {
  return BrokerNotificationAttempts.update(ctx, {
    id: row.id,
    status: 'pending',
    attempts: 0,
    nextAttemptAt: Date.now(),
    lastError: '',
    updatedAt: Date.now()
  })
}
