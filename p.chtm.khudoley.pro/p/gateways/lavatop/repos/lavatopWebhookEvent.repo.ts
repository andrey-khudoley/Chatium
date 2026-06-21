/**
 * Репозиторий журнала входящих вебхуков Lava.Top (lavatopWebhookEvent.table).
 * Слой работы с БД: только Heap-операции, без бизнес-логики.
 */

import LavatopWebhookEvent, {
  type LavatopWebhookEventRow
} from '../tables/lavatopWebhookEvent.table'
import * as loggerLib from '../lib/logger.lib'

const LOG_MODULE = 'repos/lavatopWebhookEvent.repo'

export type LavatopWebhookEventCreatePayload = {
  event_type: string
  lava_contract_id: string
  payload_json: string
  dedupe_key: string
  processed: boolean
  processed_at: number
  processing_error: string
  forward_url: string
  forward_status_code: number
  forward_error: string
  created_at: number
}

export async function create(
  ctx: app.Ctx,
  data: LavatopWebhookEventCreatePayload
): Promise<LavatopWebhookEventRow> {
  await loggerLib.writeServerLog(ctx, {
    severity: 6,
    message: `[${LOG_MODULE}] create entry`,
    // payload вебхука не пишем (PII), только ключи
    payload: { dedupe_key: data.dedupe_key, lava_contract_id: data.lava_contract_id }
  })
  const row = await LavatopWebhookEvent.create(ctx, data)
  await loggerLib.writeServerLog(ctx, {
    severity: 6,
    message: `[${LOG_MODULE}] create exit`,
    payload: { id: row.id }
  })
  return row
}

export async function findByDedupeKey(
  ctx: app.Ctx,
  dedupeKey: string
): Promise<LavatopWebhookEventRow | null> {
  return LavatopWebhookEvent.findOneBy(ctx, { dedupe_key: dedupeKey })
}

export async function findById(ctx: app.Ctx, id: string): Promise<LavatopWebhookEventRow | null> {
  return LavatopWebhookEvent.findById(ctx, id)
}

/** Пометить событие обработанным (`processing_error` пуст при успехе). */
export async function markProcessed(ctx: app.Ctx, id: string, error?: string): Promise<void> {
  await LavatopWebhookEvent.update(ctx, {
    id,
    processed: true,
    processed_at: Date.now(),
    processing_error: error ?? ''
  })
  await loggerLib.writeServerLog(ctx, {
    severity: 6,
    message: `[${LOG_MODULE}] markProcessed`,
    payload: { id, hasError: Boolean(error) }
  })
}

/** Записать результат форварда payload на клиентский callback. */
export async function updateForwardResult(
  ctx: app.Ctx,
  id: string,
  forwardUrl: string,
  forwardStatusCode: number,
  forwardError: string
): Promise<void> {
  await LavatopWebhookEvent.update(ctx, {
    id,
    forward_url: forwardUrl,
    forward_status_code: forwardStatusCode,
    forward_error: forwardError
  })
  await loggerLib.writeServerLog(ctx, {
    severity: 6,
    message: `[${LOG_MODULE}] updateForwardResult`,
    payload: { id, forwardStatusCode, hasError: Boolean(forwardError) }
  })
}

export async function findRecent(ctx: app.Ctx, limit: number): Promise<LavatopWebhookEventRow[]> {
  return LavatopWebhookEvent.findAll(ctx, {
    order: [{ created_at: 'desc' }],
    limit
  })
}

/** Последние N событий с опциональным фильтром по `created_at` (Unix ms). */
export async function findRecentFiltered(
  ctx: app.Ctx,
  limit: number,
  dateFrom?: number,
  dateTo?: number
): Promise<LavatopWebhookEventRow[]> {
  if (dateFrom === undefined && dateTo === undefined) {
    return findRecent(ctx, limit)
  }
  const created_at =
    dateFrom !== undefined && dateTo !== undefined
      ? { $gte: dateFrom, $lte: dateTo }
      : dateFrom !== undefined
        ? { $gte: dateFrom }
        : { $lte: dateTo as number }
  return LavatopWebhookEvent.findAll(ctx, {
    where: { created_at },
    order: [{ created_at: 'desc' }],
    limit
  })
}

/** Диапазон `created_at` для countBy. Отсутствующая нижняя граница → с начала времён (0). */
function rangeFilter(dateFrom?: number, dateTo?: number): { $gte: number; $lte?: number } {
  const from = dateFrom ?? 0
  return dateTo !== undefined ? { $gte: from, $lte: dateTo } : { $gte: from }
}

/** Всего принятых вебхуков в диапазоне [from?, to?]. */
export async function countInRange(
  ctx: app.Ctx,
  dateFrom?: number,
  dateTo?: number
): Promise<number> {
  return LavatopWebhookEvent.countBy(ctx, {
    created_at: rangeFilter(dateFrom, dateTo)
  })
}

/** Вебхуков, успешно форварднутых клиенту (HTTP 2xx) в диапазоне [from?, to?]. */
export async function countForwardedOkInRange(
  ctx: app.Ctx,
  dateFrom?: number,
  dateTo?: number
): Promise<number> {
  return LavatopWebhookEvent.countBy(ctx, {
    created_at: rangeFilter(dateFrom, dateTo),
    forward_status_code: { $gte: 200, $lte: 299 }
  })
}

/** Вебхуков с проваленным форвардом (HTTP ≥ 400) в диапазоне [from?, to?]. */
export async function countForwardFailedInRange(
  ctx: app.Ctx,
  dateFrom?: number,
  dateTo?: number
): Promise<number> {
  return LavatopWebhookEvent.countBy(ctx, {
    created_at: rangeFilter(dateFrom, dateTo),
    forward_status_code: { $gte: 400 }
  })
}
