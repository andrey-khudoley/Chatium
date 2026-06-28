// @shared-route
import * as wheelLib from '../../lib/wheel.lib'
import * as getcourseLib from '../../lib/getcourse.lib'
import * as settingsLib from '../../lib/settings.lib'
import * as loggerLib from '../../lib/logger.lib'

const LOG_PATH = 'api/wheel/authorize'

/**
 * POST /api/wheel/authorize — проверка email и gating GetCourse.
 * Body: { email: string }
 * Guest (без auth). Публичный endpoint.
 * Возвращает { success:true, locked:boolean } — locked=true если применялся gating.
 */
export const wheelAuthorizeRoute = app.post('/', async (ctx, req) => {
  await loggerLib.writeServerLog(ctx, {
    severity: 6,
    message: `[${LOG_PATH}] Запрос авторизации`,
    payload: {}
  })

  const body = req.body as { email?: unknown }
  const rawEmail = typeof body?.email === 'string' ? body.email : ''
  const email = wheelLib.normalizeEmail(rawEmail)

  if (!wheelLib.isValidEmail(email)) {
    await loggerLib.writeServerLog(ctx, {
      severity: 6,
      message: `[${LOG_PATH}] Невалидный email`,
      payload: {}
    })
    return { success: false, error: 'Некорректный email' }
  }

  await loggerLib.writeServerLog(ctx, {
    severity: 6,
    message: `[${LOG_PATH}] Email валидирован`,
    payload: { hasEmail: true }
  })

  // Получаем настройки gating
  const gating = await settingsLib.getGetcourseGating(ctx)
  const locked = gating.requireUser || gating.requireGroup

  if (!locked) {
    await loggerLib.writeServerLog(ctx, {
      severity: 6,
      message: `[${LOG_PATH}] Gating выключен, успех`,
      payload: {}
    })
    return { success: true, locked: false }
  }

  // Gating включён — проверяем GetCourse (порядок: user раньше group, §16.5)
  if (gating.requireUser) {
    const userCheck = await getcourseLib.passesGcUserCheck(ctx, email)

    if (!userCheck.allowed) {
      const errorMsg = userCheck.transient
        ? 'Сервис временно недоступен, попробуйте позже'
        : 'Вам недоступен этот розыгрыш'

      await loggerLib.writeServerLog(ctx, {
        severity: 5,
        message: `[${LOG_PATH}] Gating user: не пройден`,
        payload: { transient: userCheck.transient }
      })
      return { success: false, error: errorMsg }
    }

    await loggerLib.writeServerLog(ctx, {
      severity: 6,
      message: `[${LOG_PATH}] Gating user: пройден`,
      payload: {}
    })
  }

  if (gating.requireGroup) {
    const groupCheck = await getcourseLib.passesGcGroupCheck(ctx, email, gating.requiredGroupIds)

    if (!groupCheck.allowed) {
      const errorMsg = groupCheck.transient
        ? 'Сервис временно недоступен, попробуйте позже'
        : 'Вам недоступен этот розыгрыш'

      await loggerLib.writeServerLog(ctx, {
        severity: 5,
        message: `[${LOG_PATH}] Gating group: не пройден`,
        payload: { transient: groupCheck.transient }
      })
      return { success: false, error: errorMsg }
    }

    await loggerLib.writeServerLog(ctx, {
      severity: 6,
      message: `[${LOG_PATH}] Gating group: пройден`,
      payload: {}
    })
  }

  await loggerLib.writeServerLog(ctx, {
    severity: 6,
    message: `[${LOG_PATH}] Авторизация успешна`,
    payload: { locked }
  })

  return { success: true, locked }
})
