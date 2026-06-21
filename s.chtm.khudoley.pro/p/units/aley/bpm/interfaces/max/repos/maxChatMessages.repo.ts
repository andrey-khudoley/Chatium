import { MaxChatMessages, type MaxChatMessagesRow } from '../tables/maxChatMessages.table'
import { externalId, stableHash, sanitizeJson } from '../lib/max/safe.lib'

export async function insertManyForRun(
  ctx: app.Ctx,
  runId: string,
  chatId: string,
  messages: unknown[]
): Promise<number> {
  let inserted = 0
  for (const message of messages) {
    const raw =
      typeof message === 'object' && message !== null ? (message as Record<string, unknown>) : {}
    const messageId = externalId(raw.message_id ?? raw.messageId) || stableHash(raw)
    const fingerprint = stableHash(raw)
    const existing = await MaxChatMessages.findOneBy(ctx, { chatId, messageId })
    if (existing) continue
    await MaxChatMessages.create(ctx, {
      chatId,
      messageId,
      maxTimestamp: typeof raw.timestamp === 'number' ? raw.timestamp : 0,
      fetchedAt: Date.now(),
      source: 'history_refresh',
      refreshRunId: runId,
      senderUserId: externalId((raw.sender as Record<string, unknown> | undefined)?.user_id),
      fingerprint,
      rawMessage: sanitizeJson(raw),
      safePreview: typeof raw.text === 'string' ? raw.text.slice(0, 240) : ''
    })
    inserted++
  }
  return inserted
}

export async function findRecentByChat(
  ctx: app.Ctx,
  chatId: string,
  opts: { limit?: number } = {}
): Promise<MaxChatMessagesRow[]> {
  return MaxChatMessages.findAll(ctx, {
    where: { chatId },
    order: [{ maxTimestamp: 'desc' }],
    limit: opts.limit ?? 100
  } as any)
}

export async function countByChat(ctx: app.Ctx, chatId: string): Promise<number> {
  return MaxChatMessages.countBy(ctx, { chatId })
}

export async function deleteBatchByChat(
  ctx: app.Ctx,
  chatId: string,
  opts: { limit?: number } = {}
): Promise<{ deleted: number; hasMore: boolean }> {
  const rows = await MaxChatMessages.findAll(ctx, {
    where: { chatId },
    order: [{ fetchedAt: 'asc' }],
    limit: opts.limit ?? 500
  } as any)
  for (const row of rows) await MaxChatMessages.delete(ctx, row.id)
  return { deleted: rows.length, hasMore: rows.length === (opts.limit ?? 500) }
}
