import { MaxChats, type MaxChatsRow } from '../tables/maxChats.table'

export async function findByChatId(ctx: app.Ctx, chatId: string): Promise<MaxChatsRow | null> {
  return MaxChats.findOneBy(ctx, { chatId })
}

export async function findRecent(
  ctx: app.Ctx,
  opts: { limit?: number; status?: string; type?: string } = {}
): Promise<MaxChatsRow[]> {
  const where: Record<string, unknown> = {}
  if (opts.status) where.status = opts.status
  if (opts.type) where.chatType = opts.type
  return MaxChats.findAll(ctx, {
    where: Object.keys(where).length ? where : undefined,
    order: [{ updatedAt: 'desc' }],
    limit: opts.limit ?? 100
  } as any)
}

export async function countKnown(ctx: app.Ctx): Promise<number> {
  return MaxChats.countBy(ctx, {})
}

export async function upsert(
  ctx: app.Ctx,
  data: {
    chatId: string
    chatType?: string
    status?: string
    title?: string
    dialogUserId?: string
    lastEventTime?: number
    rawChat?: unknown
  }
): Promise<MaxChatsRow> {
  const now = Date.now()
  const existing = await findByChatId(ctx, data.chatId)
  const payload = {
    chatId: data.chatId,
    chatType: data.chatType ?? existing?.chatType ?? 'unknown',
    status: data.status ?? existing?.status ?? 'unknown',
    title: data.title ?? existing?.title ?? `Chat ${data.chatId}`,
    dialogUserId: data.dialogUserId ?? existing?.dialogUserId ?? '',
    lastEventTime: data.lastEventTime ?? existing?.lastEventTime ?? 0,
    lastMessageAt: existing?.lastMessageAt ?? 0,
    historyMessageCount: existing?.historyMessageCount ?? 0,
    maxMessagesCount: existing?.maxMessagesCount ?? 0,
    lastHistoryRefreshRunId: existing?.lastHistoryRefreshRunId ?? '',
    lastHistoryRefreshStatus: existing?.lastHistoryRefreshStatus ?? 'never',
    discoveredAt: existing?.discoveredAt ?? now,
    updatedAt: now,
    rawChat: data.rawChat ?? existing?.rawChat ?? {},
    lastError: existing?.lastError ?? ''
  }
  if (existing) return MaxChats.update(ctx, { id: existing.id, ...payload })
  return MaxChats.create(ctx, payload)
}

export async function markHistoryRefreshStatus(
  ctx: app.Ctx,
  chatId: string,
  data: { runId: string; status: string; error?: string }
): Promise<MaxChatsRow | null> {
  const row = await findByChatId(ctx, chatId)
  if (!row) return null
  return MaxChats.update(ctx, {
    id: row.id,
    lastHistoryRefreshRunId: data.runId,
    lastHistoryRefreshStatus: data.status,
    lastError: data.error ?? row.lastError,
    updatedAt: Date.now()
  })
}

export async function updateCounters(
  ctx: app.Ctx,
  chatId: string,
  data: { historyMessageCount: number; lastMessageAt: number }
): Promise<MaxChatsRow | null> {
  const row = await findByChatId(ctx, chatId)
  if (!row) return null
  return MaxChats.update(ctx, {
    id: row.id,
    historyMessageCount: data.historyMessageCount,
    lastMessageAt: data.lastMessageAt,
    updatedAt: Date.now()
  })
}
