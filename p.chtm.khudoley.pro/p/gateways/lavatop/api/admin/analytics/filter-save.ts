/**
 * POST /api/admin/analytics/filter-save — сохранить/сбросить глобальный фильтр панели по дате
 * (`panel_date_filter`). Доступ: `guardInternalApi` (любой пользователь с доступом к панели).
 *
 * Тело: `{ from?: number|null, to?: number|null }` (Unix ms). Обе границы пусты/null → сброс.
 * Каждая граница — число > 0; при обеих заданных from <= to. Невалидно → 400, фильтр не меняется.
 */

import { guardInternalApi } from '../../../lib/access/apiGuard'
import * as loggerLib from '../../../lib/logger.lib'
import * as settingsLib from '../../../lib/settings.lib'

const LOG_PATH = 'api/admin/analytics/filter-save'

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v)
}

function badRequest(message: string) {
  return {
    statusCode: 400,
    rawHttpBody: JSON.stringify({ success: false, error: message }),
    headers: { 'Content-Type': 'application/json' }
  }
}

/** null/undefined/'' → отсутствует; число/числовая строка > 0 → значение; иначе невалидно. */
function parseBound(value: unknown): { ok: boolean; value?: number } {
  if (value === undefined || value === null || value === '') return { ok: true }
  const n = typeof value === 'number' ? value : typeof value === 'string' ? Number(value) : NaN
  if (!Number.isFinite(n) || n <= 0) return { ok: false }
  return { ok: true, value: Math.floor(n) }
}

export const filterSaveRoute = app.post('/', async (ctx, req) => {
  const denied = await guardInternalApi(ctx)
  if (denied) return denied

  const body = req.body
  if (!isObject(body)) {
    return badRequest('Тело запроса должно быть JSON-объектом { from?, to? }.')
  }

  const fromParsed = parseBound(body.from)
  const toParsed = parseBound(body.to)
  if (!fromParsed.ok) return badRequest('from должен быть числом > 0 (Unix ms).')
  if (!toParsed.ok) return badRequest('to должен быть числом > 0 (Unix ms).')

  if (
    fromParsed.value !== undefined &&
    toParsed.value !== undefined &&
    fromParsed.value > toParsed.value
  ) {
    return badRequest('Дата начала не может быть позже даты окончания.')
  }

  const from = fromParsed.value ?? null
  const to = toParsed.value ?? null

  await loggerLib.writeServerLog(ctx, {
    severity: 6,
    message: `[${LOG_PATH}] entry`,
    payload: { from, to }
  })

  try {
    await settingsLib.setPanelDateFilter(ctx, from, to)
  } catch (e) {
    await loggerLib.writeServerLog(ctx, {
      severity: 4,
      message: `[${LOG_PATH}] save_failed`,
      payload: { error: String((e as Error)?.message ?? e) }
    })
    return badRequest(String((e as Error)?.message ?? 'Не удалось сохранить фильтр.'))
  }

  const filter = from === null && to === null ? null : { from, to }
  return { success: true, filter }
})

export default filterSaveRoute
