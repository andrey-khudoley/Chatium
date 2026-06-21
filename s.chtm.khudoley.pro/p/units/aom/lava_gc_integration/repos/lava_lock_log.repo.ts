import LavaLockLog, { type LavaLockLogRow } from '../tables/lava_lock_log.table'
import type { HeapCreateInput } from '../lib/heap-create-input.lib'
import * as loggerLib from '../lib/logger.lib'

const LOG = 'repos/lava_lock_log.repo'

export type LavaLockLogCreateInput = HeapCreateInput<LavaLockLogRow>

/**
 * Репозиторий журнала блокировок шаблона оплаты — слой работы с Heap.
 * Только CRUD-операции, без бизнес-логики.
 */
export async function create(ctx: app.Ctx, data: LavaLockLogCreateInput): Promise<LavaLockLogRow> {
  await loggerLib.writeServerLog(ctx, {
    severity: 7,
    message: `[${LOG}] create`,
    payload: { lock_key: data.lock_key, gc_order_id: data.gc_order_id }
  })
  const row = await LavaLockLog.create(ctx, data as Parameters<typeof LavaLockLog.create>[1])
  await loggerLib.writeServerLog(ctx, {
    severity: 7,
    message: `[${LOG}] create: ok`,
    payload: { id: row.id }
  })
  return row
}

export async function updateReleased(
  ctx: app.Ctx,
  id: string,
  result: string,
  errorMessage?: string
): Promise<void> {
  await loggerLib.writeServerLog(ctx, {
    severity: 7,
    message: `[${LOG}] updateReleased`,
    payload: { id, result, hasErrorMessage: Boolean(errorMessage) }
  })
  await LavaLockLog.update(ctx, {
    id,
    released_at: Date.now(),
    result,
    error_message: errorMessage ?? ''
  })
  await loggerLib.writeServerLog(ctx, {
    severity: 7,
    message: `[${LOG}] updateReleased: ok`,
    payload: { id }
  })
}

/** Время получения эксклюзивной блокировки (Unix ms) — после проверки идемпотентности под lock. */
export async function updateAcquiredAt(
  ctx: app.Ctx,
  id: string,
  acquiredAt: number
): Promise<void> {
  await loggerLib.writeServerLog(ctx, {
    severity: 7,
    message: `[${LOG}] updateAcquiredAt`,
    payload: { id, acquiredAt }
  })
  await LavaLockLog.update(ctx, { id, acquired_at: acquiredAt })
  await loggerLib.writeServerLog(ctx, {
    severity: 7,
    message: `[${LOG}] updateAcquiredAt: ok`,
    payload: { id }
  })
}
