import {
  MaxHistoryRefreshRuns,
  type MaxHistoryRefreshRunsRow
} from '../tables/maxHistoryRefreshRuns.table'
import { stableId } from '../lib/max/safe.lib'

export async function createQueued(
  ctx: app.Ctx,
  data: { scope: string; chatId?: string; batchSize: number }
): Promise<MaxHistoryRefreshRunsRow> {
  const now = Date.now()
  return MaxHistoryRefreshRuns.create(ctx, {
    runId: stableId('mhr'),
    scope: data.scope,
    chatId: data.chatId ?? '',
    status: 'queued',
    phase: 'delete_old_messages',
    requestedAt: now,
    startedAt: 0,
    finishedAt: 0,
    cursorTimestamp: 0,
    batchSize: data.batchSize,
    deleted: 0,
    fetched: 0,
    inserted: 0,
    batches: 0,
    lastJobAt: 0,
    nextJobAt: now,
    lastError: '',
    metadata: {}
  })
}

export async function findByRunId(
  ctx: app.Ctx,
  runId: string
): Promise<MaxHistoryRefreshRunsRow | null> {
  return MaxHistoryRefreshRuns.findOneBy(ctx, { runId })
}

export async function findActiveByChat(
  ctx: app.Ctx,
  chatId: string
): Promise<MaxHistoryRefreshRunsRow | null> {
  const rows = await MaxHistoryRefreshRuns.findAll(ctx, {
    where: { chatId, status: { $in: ['queued', 'deleting', 'fetching'] } },
    order: [{ requestedAt: 'desc' }],
    limit: 1
  } as any)
  return rows[0] ?? null
}

export async function findRunnable(
  ctx: app.Ctx,
  now: number
): Promise<MaxHistoryRefreshRunsRow | null> {
  const rows = await MaxHistoryRefreshRuns.findAll(ctx, {
    where: { status: 'queued', nextJobAt: { $lte: now } },
    order: [{ requestedAt: 'asc' }],
    limit: 1
  } as any)
  if (rows[0]) return rows[0]
  const active = await MaxHistoryRefreshRuns.findAll(ctx, {
    where: { status: 'deleting', nextJobAt: { $lte: now } },
    order: [{ lastJobAt: 'asc' }],
    limit: 1
  } as any)
  if (active[0]) return active[0]
  const fetching = await MaxHistoryRefreshRuns.findAll(ctx, {
    where: { status: 'fetching', nextJobAt: { $lte: now } },
    order: [{ lastJobAt: 'asc' }],
    limit: 1
  } as any)
  return fetching[0] ?? null
}

export async function markProgress(
  ctx: app.Ctx,
  row: MaxHistoryRefreshRunsRow,
  patch: Partial<MaxHistoryRefreshRunsRow>
): Promise<MaxHistoryRefreshRunsRow> {
  return MaxHistoryRefreshRuns.update(ctx, {
    id: row.id,
    ...patch,
    lastJobAt: Date.now()
  } as any)
}

export async function findRecent(
  ctx: app.Ctx,
  opts: { limit?: number } = {}
): Promise<MaxHistoryRefreshRunsRow[]> {
  return MaxHistoryRefreshRuns.findAll(ctx, {
    order: [{ requestedAt: 'desc' }],
    limit: opts.limit ?? 50
  } as any)
}
