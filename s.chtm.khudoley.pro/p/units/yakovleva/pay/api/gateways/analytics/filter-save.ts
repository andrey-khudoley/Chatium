/**
 * POST /api/gateways/analytics/filter-save — сохранить или сбросить глобальный фильтр
 * панели по дате/времени (settings.PANEL_DATE_FILTER). Доступ: requireRealUser +
 * requireInternalAccess (guardInternalApi) — менять фильтр может любой пользователь
 * с доступом к панели.
 *
 * Тело: { from?: number|null, to?: number|null } (Unix ms). Если обе границы
 * отсутствуют или null — фильтр сбрасывается. Валидация: каждая граница — число > 0;
 * при обеих заданных from <= to. Невалидный ввод → 400, фильтр не меняется.
 *
 * Ответ всегда единой формы: { success, filter: null | { from?: number, to?: number } }.
 */

import { guardInternalApi } from '../../../lib/access/apiGuard'
import * as loggerLib from '../../../lib/logger.lib'
import * as settingsLib from '../../../lib/settings.lib'
import * as settingsRepo from '../../../repos/settings.repo'

const LOG_PATH = 'api/gateways/analytics/filter-save'

type FilterSaveRequestBody = {
  from?: unknown
  to?: unknown
}

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

/**
 * Парсит границу фильтра. null/undefined/'' → отсутствует (ok без value).
 * Число или числовая строка > 0 → ok с value (Math.floor). Иначе — невалидно.
 */
function parseBound(value: unknown): { ok: boolean; value?: number } {
  if (value === undefined || value === null || value === '') return { ok: true }
  const n = typeof value === 'number' ? value : typeof value === 'string' ? Number(value) : NaN
  if (!Number.isFinite(n) || n <= 0) return { ok: false }
  return { ok: true, value: Math.floor(n) }
}

export const filterSaveRoute = app.post('/', async (ctx, req) => {
  const denied = await guardInternalApi(ctx)
  if (denied) return denied

  const bodyRaw = req.body as unknown
  if (!isObject(bodyRaw)) {
    return badRequest('Тело запроса должно быть JSON-объектом { from?, to? }.')
  }
  const body = bodyRaw as FilterSaveRequestBody

  const fromParsed = parseBound(body.from)
  const toParsed = parseBound(body.to)
  if (!fromParsed.ok) return badRequest('from должен быть числом > 0 (Unix ms).')
  if (!toParsed.ok) return badRequest('to должен быть числом > 0 (Unix ms).')

  const filter: settingsLib.DateFilter = {}
  if (fromParsed.value !== undefined) filter.from = fromParsed.value
  if (toParsed.value !== undefined) filter.to = toParsed.value

  await loggerLib.writeServerLog(ctx, {
    severity: 6,
    message: `[${LOG_PATH}] entry`,
    payload: { from: filter.from ?? null, to: filter.to ?? null }
  })

  // Обе границы отсутствуют → сброс фильтра (удаляем запись настройки).
  if (filter.from === undefined && filter.to === undefined) {
    await settingsRepo.deleteByKey(ctx, settingsLib.SETTING_KEYS.PANEL_DATE_FILTER)
    await loggerLib.writeServerLog(ctx, {
      severity: 6,
      message: `[${LOG_PATH}] reset`,
      payload: {}
    })
    return { success: true, filter: null }
  }

  if (filter.from !== undefined && filter.to !== undefined && filter.from > filter.to) {
    return badRequest('Дата начала не может быть позже даты окончания.')
  }

  try {
    await settingsLib.setSetting(ctx, settingsLib.SETTING_KEYS.PANEL_DATE_FILTER, filter)
  } catch (e) {
    await loggerLib.writeServerLog(ctx, {
      severity: 4,
      message: `[${LOG_PATH}] save_failed`,
      payload: { error: String((e as Error)?.message ?? e) }
    })
    return badRequest(String((e as Error)?.message ?? 'Не удалось сохранить фильтр.'))
  }

  await loggerLib.writeServerLog(ctx, {
    severity: 6,
    message: `[${LOG_PATH}] exit`,
    payload: { from: filter.from ?? null, to: filter.to ?? null }
  })

  return { success: true, filter }
})

export default filterSaveRoute
