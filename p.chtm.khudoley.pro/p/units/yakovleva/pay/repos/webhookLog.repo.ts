/**
 * Репозиторий журнала входящих webhook от LifePay (implementation-plan §1.8.1).
 */

import { WebhookLog } from '../tables/webhookLog.table'
import type { WebhookLogRow } from '../tables/webhookLog.table'
import * as loggerLib from '../lib/logger.lib'

const LOG_MODULE = 'repos/webhookLog.repo'

export type WebhookLogCreatePayload = {
  number: string
  /** Идентификатор гейтвея (`'lifepay' | 'lavatop'`); опциональное legacy-поле. */
  gatewayId?: string
  /**
   * Внешний ID события со стороны гейтвея (например, `contractId` Lava.Top).
   * Для LifePay-webhook эквивалент несёт `correlationId`.
   */
  gatewayExternalId?: string
  type: string
  status: string
  method: string
  amount: string
  orderNumber: string
  correlationId?: string
  tokenValid: boolean
  duplicate: boolean
  processedAt: number
  email: string
  rawBody: unknown
  rawQuery: unknown
}

export async function create(ctx: app.Ctx, data: WebhookLogCreatePayload): Promise<WebhookLogRow> {
  await loggerLib.writeServerLog(ctx, {
    severity: 6,
    message: `[${LOG_MODULE}] create entry`,
    payload: {
      number: data.number,
      gatewayId: data.gatewayId ?? null,
      gatewayExternalId: data.gatewayExternalId ?? null,
      orderNumber: data.orderNumber,
      correlationId: data.correlationId || null,
      tokenValid: data.tokenValid,
      duplicate: data.duplicate
    }
  })
  const row = await WebhookLog.create(ctx, {
    ...data,
    correlationId: data.correlationId || undefined,
    gatewayId: data.gatewayId || undefined,
    gatewayExternalId: data.gatewayExternalId || undefined
  })
  await loggerLib.writeServerLog(ctx, {
    severity: 6,
    message: `[${LOG_MODULE}] create exit`,
    payload: { number: data.number }
  })
  return row
}

/** @deprecated используйте findInRange (учитывает фильтр по дате/времени). */
export async function findRecent(ctx: app.Ctx, limit: number): Promise<WebhookLogRow[]> {
  await loggerLib.writeServerLog(ctx, {
    severity: 6,
    message: `[${LOG_MODULE}] findRecent entry`,
    payload: { limit }
  })
  const rows = await WebhookLog.findAll(ctx, {
    order: [{ processedAt: 'desc' }],
    limit
  })
  await loggerLib.writeServerLog(ctx, {
    severity: 6,
    message: `[${LOG_MODULE}] findRecent exit`,
    payload: { count: rows.length }
  })
  return rows
}

export async function findById(ctx: app.Ctx, id: string): Promise<WebhookLogRow | null> {
  await loggerLib.writeServerLog(ctx, {
    severity: 6,
    message: `[${LOG_MODULE}] findById entry`,
    payload: { id }
  })
  const rows = await WebhookLog.findAll(ctx, {
    where: { id },
    limit: 1
  })
  const row = rows[0] ?? null
  await loggerLib.writeServerLog(ctx, {
    severity: 6,
    message: `[${LOG_MODULE}] findById exit`,
    payload: { id, found: !!row }
  })
  return row
}

export async function findByOrderNumber(
  ctx: app.Ctx,
  orderNumber: string
): Promise<WebhookLogRow[]> {
  await loggerLib.writeServerLog(ctx, {
    severity: 6,
    message: `[${LOG_MODULE}] findByOrderNumber entry`,
    payload: { orderNumber }
  })
  const rows = await WebhookLog.findAll(ctx, {
    where: { orderNumber },
    order: [{ processedAt: 'desc' }],
    limit: 100
  })
  await loggerLib.writeServerLog(ctx, {
    severity: 6,
    message: `[${LOG_MODULE}] findByOrderNumber exit`,
    payload: { orderNumber, count: rows.length }
  })
  return rows
}

/**
 * Возвращает webhook-записи с `processedAt >= sinceTimestamp`, свежие первыми.
 * Внутри cursor-пагинация по 1000 (HARD_BATCH — кэп Heap.findAll). Используется
 * аналитикой для сумм/счётчиков оплат (поле amount недоступно через countBy).
 */
const HARD_BATCH = 1000

/** @deprecated используйте findInRange(ctx, from, to) — обобщённый диапазон. */
export async function findRecentSince(
  ctx: app.Ctx,
  sinceTimestamp: number,
  limit: number = 5000
): Promise<WebhookLogRow[]> {
  await loggerLib.writeServerLog(ctx, {
    severity: 6,
    message: `[${LOG_MODULE}] findRecentSince entry`,
    payload: { sinceTimestamp, limit }
  })

  const result: WebhookLogRow[] = []
  let cursor: number | null = null

  while (result.length < limit) {
    const where: Record<string, unknown> =
      cursor === null
        ? { processedAt: { $gte: sinceTimestamp } }
        : { processedAt: { $gte: sinceTimestamp, $lt: cursor } }

    const remaining = limit - result.length
    const batchSize = Math.min(HARD_BATCH, remaining)

    const rows = await WebhookLog.findAll(ctx, {
      where,
      order: [{ processedAt: 'desc' }],
      limit: batchSize
    })

    const last = rows[rows.length - 1]
    if (!last) break
    result.push(...rows)
    cursor = last.processedAt
    if (rows.length < batchSize) break
  }

  await loggerLib.writeServerLog(ctx, {
    severity: 6,
    message: `[${LOG_MODULE}] findRecentSince exit`,
    payload: { sinceTimestamp, count: result.length }
  })
  return result
}

export async function countSince(ctx: app.Ctx, sinceTimestamp: number): Promise<number> {
  return WebhookLog.countBy(ctx, { processedAt: { $gte: sinceTimestamp } })
}

export async function countStatusSuccessSince(
  ctx: app.Ctx,
  sinceTimestamp: number
): Promise<number> {
  return WebhookLog.countBy(ctx, {
    processedAt: { $gte: sinceTimestamp },
    status: 'success'
  })
}

export async function countTokenValidSince(ctx: app.Ctx, sinceTimestamp: number): Promise<number> {
  return WebhookLog.countBy(ctx, {
    processedAt: { $gte: sinceTimestamp },
    tokenValid: true
  })
}

/**
 * Условие по `processedAt` для диапазона [from?, to?]. Любая граница необязательна.
 * Возвращает `{}` если границ нет.
 */
function rangeWhere(from?: number, to?: number): Record<string, unknown> {
  const cond: Record<string, number> = {}
  if (from !== undefined) cond.$gte = from
  if (to !== undefined) cond.$lt = to
  return Object.keys(cond).length > 0 ? { processedAt: cond } : {}
}

/**
 * Webhook-записи в диапазоне дат [from?, to?] (Unix ms), свежие первыми. Любая
 * граница необязательна; без границ — «последние limit записей». Cursor-пагинация
 * по 1000 (один findAll не запрашивает > 1000). См. requestLog.repo.findInRange.
 */
export async function findInRange(
  ctx: app.Ctx,
  from?: number,
  to?: number,
  limit: number = 5000
): Promise<WebhookLogRow[]> {
  await loggerLib.writeServerLog(ctx, {
    severity: 6,
    message: `[${LOG_MODULE}] findInRange entry`,
    payload: { from: from ?? null, to: to ?? null, limit }
  })

  const result: WebhookLogRow[] = []
  let cursor: number | null = null

  while (result.length < limit) {
    const cond: Record<string, number> = {}
    if (from !== undefined) cond.$gte = from
    const upper = cursor !== null ? cursor : to
    if (upper !== undefined) cond.$lt = upper
    const where: Record<string, unknown> = Object.keys(cond).length > 0 ? { processedAt: cond } : {}

    const remaining = limit - result.length
    const batchSize = Math.min(HARD_BATCH, remaining)

    const rows = await WebhookLog.findAll(ctx, {
      where,
      order: [{ processedAt: 'desc' }],
      limit: batchSize
    })

    const last = rows[rows.length - 1]
    if (!last) break
    result.push(...rows)
    cursor = last.processedAt
    if (rows.length < batchSize) break
  }

  await loggerLib.writeServerLog(ctx, {
    severity: 6,
    message: `[${LOG_MODULE}] findInRange exit`,
    payload: { from: from ?? null, to: to ?? null, count: result.length }
  })
  return result
}

export async function countInRange(ctx: app.Ctx, from?: number, to?: number): Promise<number> {
  return WebhookLog.countBy(ctx, rangeWhere(from, to))
}

export async function countStatusSuccessInRange(
  ctx: app.Ctx,
  from?: number,
  to?: number
): Promise<number> {
  return WebhookLog.countBy(ctx, { ...rangeWhere(from, to), status: 'success' })
}

export async function countTokenValidInRange(
  ctx: app.Ctx,
  from?: number,
  to?: number
): Promise<number> {
  return WebhookLog.countBy(ctx, { ...rangeWhere(from, to), tokenValid: true })
}

/**
 * Webhook по orderNumber в пределах диапазона дат [from?, to?]. Без границ —
 * как findByOrderNumber. Лимит 100 (один findAll, не превышает кэп 1000).
 */
export async function findByOrderNumberInRange(
  ctx: app.Ctx,
  orderNumber: string,
  from?: number,
  to?: number,
  limit: number = 100
): Promise<WebhookLogRow[]> {
  await loggerLib.writeServerLog(ctx, {
    severity: 6,
    message: `[${LOG_MODULE}] findByOrderNumberInRange entry`,
    payload: { orderNumber, from: from ?? null, to: to ?? null, limit }
  })
  const where: Record<string, unknown> = { orderNumber, ...rangeWhere(from, to) }
  const rows = await WebhookLog.findAll(ctx, {
    where,
    order: [{ processedAt: 'desc' }],
    limit
  })
  await loggerLib.writeServerLog(ctx, {
    severity: 6,
    message: `[${LOG_MODULE}] findByOrderNumberInRange exit`,
    payload: { orderNumber, count: rows.length }
  })
  return rows
}

/**
 * Webhook по correlationId в пределах диапазона дат [from?, to?]. Основной путь
 * связки с request_log (LifePay не возвращает наш orderNumber в теле webhook).
 * Без границ — как поиск по всему журналу. Лимит 100 (один findAll, не > кэп 1000).
 *
 * Поле `correlationId` намеренно объявлено без `searchable`: `searchable` нужен
 * только для полнотекстового `searchBy` (008-heap.md §«Полнотекстовый поиск»), а
 * точный `where`-матч работает по любому полю — ср. фильтры по `requestedAt`,
 * `status`, `tokenValid` в этом же репозитории, тоже без `searchable`.
 */
export async function findByCorrelationIdInRange(
  ctx: app.Ctx,
  correlationId: string,
  from?: number,
  to?: number,
  limit: number = 100
): Promise<WebhookLogRow[]> {
  await loggerLib.writeServerLog(ctx, {
    severity: 6,
    message: `[${LOG_MODULE}] findByCorrelationIdInRange entry`,
    payload: { correlationId, from: from ?? null, to: to ?? null, limit }
  })
  const where: Record<string, unknown> = { correlationId, ...rangeWhere(from, to) }
  const rows = await WebhookLog.findAll(ctx, {
    where,
    order: [{ processedAt: 'desc' }],
    limit
  })
  await loggerLib.writeServerLog(ctx, {
    severity: 6,
    message: `[${LOG_MODULE}] findByCorrelationIdInRange exit`,
    payload: { correlationId, count: rows.length }
  })
  return rows
}
