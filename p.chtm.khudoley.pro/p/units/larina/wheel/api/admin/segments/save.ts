// @shared-route
import { requireAccountRole } from '@app/auth'
import * as segmentsRepo from '../../../repos/segments.repo'
import * as loggerLib from '../../../lib/logger.lib'

const LOG_PATH = 'api/admin/segments/save'

/**
 * POST /api/admin/segments/save — создание или обновление сегмента.
 * Body: { id?, label, full, weight, maxWins?, enabled, prizeOfferID?, redirectUrl?, order }
 * Только Admin.
 */
export const adminSaveSegmentRoute = app.post('/', async (ctx, req) => {
  requireAccountRole(ctx, 'Admin')

  await loggerLib.writeServerLog(ctx, {
    severity: 6,
    message: `[${LOG_PATH}] Запрос сохранения сегмента`,
    payload: { bodyKeys: req.body ? Object.keys(req.body as object) : [] }
  })

  const body = req.body as {
    id?: unknown
    label?: unknown
    full?: unknown
    weight?: unknown
    maxWins?: unknown
    enabled?: unknown
    prizeOfferID?: unknown
    redirectUrl?: unknown
    order?: unknown
  }

  const id = typeof body?.id === 'string' && body.id.trim() ? body.id.trim() : undefined
  const label = typeof body?.label === 'string' ? body.label : ''
  const full = typeof body?.full === 'string' ? body.full : ''
  const weightRaw = typeof body?.weight === 'number' ? body.weight : Number(body?.weight ?? 0)
  const orderRaw = typeof body?.order === 'number' ? body.order : Number(body?.order ?? 0)
  const enabled = body?.enabled === true || body?.enabled === 'true' || body?.enabled === 1

  // Числовые поля: проверка Number.isFinite (§11.4) — NaN/Infinity запрещены
  if (!Number.isFinite(weightRaw)) {
    await loggerLib.writeServerLog(ctx, {
      severity: 6,
      message: `[${LOG_PATH}] Валидация: weight не является конечным числом`,
      payload: { weight: body?.weight }
    })
    return { success: false, error: 'Поле weight должно быть конечным числом ≥ 0' }
  }
  if (!Number.isFinite(orderRaw)) {
    await loggerLib.writeServerLog(ctx, {
      severity: 6,
      message: `[${LOG_PATH}] Валидация: order не является конечным числом`,
      payload: { order: body?.order }
    })
    return { success: false, error: 'Поле order должно быть конечным числом ≥ 0' }
  }

  const weight = weightRaw
  const order = orderRaw

  const maxWinsRaw =
    body?.maxWins != null && body.maxWins !== ''
      ? typeof body.maxWins === 'number'
        ? body.maxWins
        : parseInt(String(body.maxWins), 10)
      : null

  // maxWins: если задан — должен быть конечным числом ≥ 0 (§11.4)
  if (maxWinsRaw !== null && !Number.isFinite(maxWinsRaw)) {
    await loggerLib.writeServerLog(ctx, {
      severity: 6,
      message: `[${LOG_PATH}] Валидация: maxWins не является конечным числом`,
      payload: { maxWins: body?.maxWins }
    })
    return { success: false, error: 'Поле maxWins должно быть конечным числом ≥ 0 либо null' }
  }
  const maxWins = maxWinsRaw

  const prizeOfferID =
    typeof body?.prizeOfferID === 'string' && body.prizeOfferID.trim()
      ? body.prizeOfferID.trim()
      : null
  const redirectUrl =
    typeof body?.redirectUrl === 'string' && body.redirectUrl.trim()
      ? body.redirectUrl.trim()
      : null

  // Валидация
  if (!label) {
    await loggerLib.writeServerLog(ctx, {
      severity: 6,
      message: `[${LOG_PATH}] Валидация: label обязателен`,
      payload: {}
    })
    return { success: false, error: 'Поле label обязательно' }
  }

  if (weight < 0) {
    await loggerLib.writeServerLog(ctx, {
      severity: 6,
      message: `[${LOG_PATH}] Валидация: weight должен быть ≥ 0`,
      payload: { weight }
    })
    return { success: false, error: 'Поле weight должно быть ≥ 0' }
  }

  if (order < 0) {
    await loggerLib.writeServerLog(ctx, {
      severity: 6,
      message: `[${LOG_PATH}] Валидация: order должен быть ≥ 0`,
      payload: { order }
    })
    return { success: false, error: 'Поле order должно быть ≥ 0' }
  }

  try {
    let segment

    if (id) {
      await loggerLib.writeServerLog(ctx, {
        severity: 6,
        message: `[${LOG_PATH}] Обновление сегмента`,
        payload: { id }
      })
      segment = await segmentsRepo.update(ctx, id, {
        label,
        full,
        weight,
        maxWins,
        enabled,
        prizeOfferID,
        redirectUrl,
        order
      })
    } else {
      await loggerLib.writeServerLog(ctx, {
        severity: 6,
        message: `[${LOG_PATH}] Создание нового сегмента`,
        payload: { label, order }
      })
      segment = await segmentsRepo.create(ctx, {
        label,
        full,
        weight,
        maxWins,
        enabled,
        prizeOfferID,
        redirectUrl,
        order
      })
    }

    await loggerLib.writeServerLog(ctx, {
      severity: 6,
      message: `[${LOG_PATH}] Сегмент сохранён`,
      payload: { id: segment.id }
    })

    return { success: true, segment }
  } catch (error) {
    await loggerLib.writeServerLog(ctx, {
      severity: 3,
      message: `[${LOG_PATH}] Ошибка сохранения сегмента`,
      payload: { error: String(error) }
    })
    return { success: false, error: String(error) }
  }
})
