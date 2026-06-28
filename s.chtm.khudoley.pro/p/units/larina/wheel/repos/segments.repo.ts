import Segments, { type SegmentsRow } from '../tables/segments.table'
import * as loggerLib from '../lib/logger.lib'

const LOG_MODULE = 'repos/segments.repo'

/**
 * Репозиторий сегментов колеса — слой работы с БД.
 * Только CRUD-операции, без бизнес-логики.
 */

/** Все активные сегменты, отсортированные по order asc. Используется для построения колеса. */
export async function findAllEnabled(ctx: app.Ctx): Promise<SegmentsRow[]> {
  await loggerLib.writeServerLog(ctx, {
    severity: 6,
    message: `[${LOG_MODULE}] findAllEnabled entry`,
    payload: null
  })
  const rows = await Segments.findAll(ctx, {
    where: { enabled: true },
    order: [{ order: 'asc' }]
  })
  await loggerLib.writeServerLog(ctx, {
    severity: 6,
    message: `[${LOG_MODULE}] findAllEnabled exit`,
    payload: { count: rows.length }
  })
  return rows
}

/** Все сегменты включая disabled, отсортированные по order asc. Только для админки. */
export async function findAll(ctx: app.Ctx): Promise<SegmentsRow[]> {
  await loggerLib.writeServerLog(ctx, {
    severity: 6,
    message: `[${LOG_MODULE}] findAll entry`,
    payload: null
  })
  const rows = await Segments.findAll(ctx, {
    order: [{ order: 'asc' }]
  })
  await loggerLib.writeServerLog(ctx, {
    severity: 6,
    message: `[${LOG_MODULE}] findAll exit`,
    payload: { count: rows.length }
  })
  return rows
}

/** Сегмент по id или null. */
export async function findById(ctx: app.Ctx, id: string): Promise<SegmentsRow | null> {
  await loggerLib.writeServerLog(ctx, {
    severity: 6,
    message: `[${LOG_MODULE}] findById entry`,
    payload: { id }
  })
  const row = await Segments.findById(ctx, id)
  await loggerLib.writeServerLog(ctx, {
    severity: 6,
    message: `[${LOG_MODULE}] findById exit`,
    payload: { id, hasRow: !!row }
  })
  return row
}

/** Создаёт сегмент. */
export async function create(
  ctx: app.Ctx,
  data: {
    order: number
    label: string
    prizeOfferID?: string | null
    redirectUrl?: string | null
    full: string
    weight: number
    maxWins?: number | null
    enabled: boolean
  }
): Promise<SegmentsRow> {
  await loggerLib.writeServerLog(ctx, {
    severity: 6,
    message: `[${LOG_MODULE}] create entry`,
    payload: { label: data.label, order: data.order }
  })
  const row = await Segments.create(ctx, data)
  await loggerLib.writeServerLog(ctx, {
    severity: 6,
    message: `[${LOG_MODULE}] create exit`,
    payload: { id: row.id }
  })
  return row
}

/** Обновляет поля сегмента. */
export async function update(
  ctx: app.Ctx,
  id: string,
  data: Partial<{
    order: number
    label: string
    prizeOfferID: string | null
    redirectUrl: string | null
    full: string
    weight: number
    maxWins: number | null
    enabled: boolean
  }>
): Promise<SegmentsRow> {
  await loggerLib.writeServerLog(ctx, {
    severity: 6,
    message: `[${LOG_MODULE}] update entry`,
    payload: { id }
  })
  const row = await Segments.update(ctx, { id, ...data })
  await loggerLib.writeServerLog(ctx, {
    severity: 6,
    message: `[${LOG_MODULE}] update exit`,
    payload: { id }
  })
  return row
}

/** Удаляет сегмент. */
export async function deleteById(ctx: app.Ctx, id: string): Promise<void> {
  await loggerLib.writeServerLog(ctx, {
    severity: 6,
    message: `[${LOG_MODULE}] delete entry`,
    payload: { id }
  })
  await Segments.delete(ctx, id)
  await loggerLib.writeServerLog(ctx, {
    severity: 6,
    message: `[${LOG_MODULE}] delete exit`,
    payload: { id }
  })
}

/** Обновляет поле order сегмента. */
export async function updateOrder(ctx: app.Ctx, id: string, order: number): Promise<SegmentsRow> {
  await loggerLib.writeServerLog(ctx, {
    severity: 6,
    message: `[${LOG_MODULE}] updateOrder entry`,
    payload: { id, order }
  })
  const row = await Segments.update(ctx, { id, order })
  await loggerLib.writeServerLog(ctx, {
    severity: 6,
    message: `[${LOG_MODULE}] updateOrder exit`,
    payload: { id, order }
  })
  return row
}
