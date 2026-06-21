import LavaWebhookEvent, { type LavaWebhookEventRow } from '../tables/lava_webhook_event.table'
import type { HeapCreateInput } from '../lib/heap-create-input.lib'
import * as loggerLib from '../lib/logger.lib'

const LOG = 'repos/lava_webhook_event.repo'

export type LavaWebhookEventCreateInput = HeapCreateInput<LavaWebhookEventRow>

/**
 * Репозиторий событий webhook Lava — слой работы с Heap.
 * Только CRUD-операции, без бизнес-логики.
 */
export async function create(
  ctx: app.Ctx,
  data: LavaWebhookEventCreateInput
): Promise<LavaWebhookEventRow> {
  await loggerLib.writeServerLog(ctx, {
    severity: 7,
    message: `[${LOG}] create`,
    payload: { dedupe_key: data.dedupe_key, lava_contract_id: data.lava_contract_id }
  })
  const row = await LavaWebhookEvent.create(
    ctx,
    data as Parameters<typeof LavaWebhookEvent.create>[1]
  )
  await loggerLib.writeServerLog(ctx, {
    severity: 7,
    message: `[${LOG}] create: ok`,
    payload: { id: row.id }
  })
  return row
}

export async function findByDedupeKey(
  ctx: app.Ctx,
  dedupeKey: string
): Promise<LavaWebhookEventRow | null> {
  await loggerLib.writeServerLog(ctx, {
    severity: 7,
    message: `[${LOG}] findByDedupeKey`,
    payload: { dedupeKey }
  })
  const row = await LavaWebhookEvent.findOneBy(ctx, { dedupe_key: dedupeKey })
  await loggerLib.writeServerLog(ctx, {
    severity: 7,
    message: `[${LOG}] findByDedupeKey: результат`,
    payload: { found: Boolean(row), id: row?.id }
  })
  return row
}

export async function markProcessed(ctx: app.Ctx, id: string, error?: string): Promise<void> {
  await loggerLib.writeServerLog(ctx, {
    severity: 7,
    message: `[${LOG}] markProcessed`,
    payload: {
      id,
      hasError: Boolean(error),
      errorPreview: error ? String(error).slice(0, 200) : ''
    }
  })
  await LavaWebhookEvent.update(ctx, {
    id,
    processed: true,
    processed_at: Date.now(),
    processing_error: error ?? ''
  })
  await loggerLib.writeServerLog(ctx, {
    severity: 7,
    message: `[${LOG}] markProcessed: ok`,
    payload: { id }
  })
}

export async function findUnprocessed(ctx: app.Ctx): Promise<LavaWebhookEventRow[]> {
  await loggerLib.writeServerLog(ctx, {
    severity: 7,
    message: `[${LOG}] findUnprocessed`,
    payload: {}
  })
  const rows = await LavaWebhookEvent.findAll(ctx, {
    where: { processed: false },
    order: [{ created_at: 'asc' }]
  })
  await loggerLib.writeServerLog(ctx, {
    severity: 7,
    message: `[${LOG}] findUnprocessed: результат`,
    payload: { count: rows.length }
  })
  return rows
}
