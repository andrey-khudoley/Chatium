// @shared-route
import { runWithExclusiveLock } from '@app/sync'
import * as wheelLib from '../../lib/wheel.lib'
import * as getcourseLib from '../../lib/getcourse.lib'
import * as settingsLib from '../../lib/settings.lib'
import * as spinsRepo from '../../repos/spins.repo'
import * as loggerLib from '../../lib/logger.lib'

const LOG_PATH = 'api/wheel/spin'

/**
 * POST /api/wheel/spin — вращение колеса.
 * Body: { email: string }
 * Guest (без auth). Публичный endpoint.
 * Полная логика §16.4: вне блокировки — wheel_enabled, email, gating;
 * внутри runWithExclusiveLock — loadEffectiveSegments, checkSpinLimit, selectTarget, запись, награда.
 */
export const wheelSpinRoute = app.post('/', async (ctx, req) => {
  await loggerLib.writeServerLog(ctx, {
    severity: 6,
    message: `[${LOG_PATH}] Запрос вращения колеса`,
    payload: {}
  })

  // 1. Проверка wheel_enabled (вне блокировки — §16.4)
  const wheelEnabled = await settingsLib.getWheelEnabled(ctx)
  if (!wheelEnabled) {
    await loggerLib.writeServerLog(ctx, {
      severity: 5,
      message: `[${LOG_PATH}] Колесо выключено`,
      payload: {}
    })
    return { success: false, error: 'Колесо временно недоступно' }
  }

  // 2. Валидация и нормализация email (вне блокировки — §16.4)
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

  // 3. Gating GetCourse (вне блокировки, серверная защита — §16.4/§16.8)
  // Выполняется до блокировки и проверки лимита — не расходует попытку
  const gating = await settingsLib.getGetcourseGating(ctx)

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

  // 4. Критическая секция: лимит → выбор → запись победы (§16.4, §2 платформа)
  // Ключ — по нормализованному email, защищает от TOCTOU параллельных запросов
  return await runWithExclusiveLock(ctx, 'wheel:spin:' + email, async () => {
    // 4.1 Загрузка эффективных сегментов (внутри блокировки — §16.4)
    const segmentsResult = await wheelLib.loadEffectiveSegments(ctx)
    if (!segmentsResult.success) {
      await loggerLib.writeServerLog(ctx, {
        severity: 5,
        message: `[${LOG_PATH}] Некорректная конфигурация колеса`,
        payload: { error: segmentsResult.error }
      })
      return { success: false, error: 'Колесо настроено некорректно' }
    }

    const { segments, nEff } = segmentsResult

    // 4.2 Проверка лимита попыток (§16.4)
    const limitResult = await wheelLib.checkSpinLimit(ctx, email)
    if (!limitResult.allowed) {
      await loggerLib.writeServerLog(ctx, {
        severity: 5,
        message: `[${LOG_PATH}] Лимит попыток исчерпан`,
        payload: { used: limitResult.used, maxAllowed: limitResult.maxAllowed }
      })
      return { success: false, error: 'Лимит попыток исчерпан' }
    }

    // 4.3 Выбор целевого сегмента (§16.3)
    const targetResult = await wheelLib.selectTarget(ctx, segments)
    if (!targetResult.success) {
      await loggerLib.writeServerLog(ctx, {
        severity: 5,
        message: `[${LOG_PATH}] Все призы разыграны`,
        payload: {}
      })
      return { success: false, error: targetResult.error }
    }

    const { segment: won, targetIdx } = targetResult
    const isRetry = won.isAutoRetry === true

    await loggerLib.writeServerLog(ctx, {
      severity: 6,
      message: `[${LOG_PATH}] Сегмент выбран`,
      payload: { targetIdx, isRetry }
    })

    // 4.4 Для не-retry: проверить наличие id, записать победу (§16.4, §16.9)
    if (!isRetry) {
      // Защита: если id отсутствует — сегмент исчез между загрузками, не расходуем попытку
      if (!won.id) {
        await loggerLib.writeServerLog(ctx, {
          severity: 3,
          message: `[${LOG_PATH}] Сегмент без id для не-retry — колесо настроено некорректно`,
          payload: { targetIdx }
        })
        return { success: false, error: 'Колесо настроено некорректно' }
      }

      // Запись победы (§16.9): при ошибке — НЕ выдавать награду, вернуть ошибку
      try {
        await spinsRepo.create(ctx, {
          email,
          segment: won.id,
          timestamp: Date.now()
        })
        await loggerLib.writeServerLog(ctx, {
          severity: 6,
          message: `[${LOG_PATH}] Победа зафиксирована`,
          payload: { hasEmail: true, targetIdx }
        })
      } catch (error) {
        await loggerLib.writeServerLog(ctx, {
          severity: 3,
          message: `[${LOG_PATH}] Ошибка записи победы — награда не выдаётся`,
          payload: { error: String(error) }
        })
        return { success: false, error: 'Сервис временно недоступен, попробуйте позже' }
      }

      // 4.5 Выдача награды в GetCourse ТОЛЬКО после успешной записи (§16.9, best-effort)
      const issueRewardsValue = await settingsLib.getSetting(
        ctx,
        settingsLib.SETTING_KEYS.GETCOURSE_ISSUE_REWARDS
      )
      const issueRewards = issueRewardsValue === true

      const prizeOfferID = won.prizeOfferID ?? null

      if (issueRewards && prizeOfferID && prizeOfferID.trim()) {
        if (!Number.isFinite(Number(prizeOfferID))) {
          // prizeOfferID не приводится к конечному числу — пропускаем (§16.7, severity 4)
          await loggerLib.writeServerLog(ctx, {
            severity: 4,
            message: `[${LOG_PATH}] prizeOfferID не является конечным числом — выдача пропущена`,
            payload: { prizeOfferID }
          })
        } else {
          try {
            const dealResult = await getcourseLib.createDeal(ctx, {
              email,
              offerId: prizeOfferID,
              cost: 0,
              status: 'in_work'
            })
            if (!dealResult.ok) {
              await loggerLib.writeServerLog(ctx, {
                severity: 3,
                message: `[${LOG_PATH}] createDeal вернул ошибку (best-effort, не влияет на ответ)`,
                payload: { code: dealResult.error.code, message: dealResult.error.message }
              })
            } else {
              await loggerLib.writeServerLog(ctx, {
                severity: 6,
                message: `[${LOG_PATH}] Награда выдана в GetCourse`,
                payload: {}
              })
            }
          } catch (error) {
            await loggerLib.writeServerLog(ctx, {
              severity: 3,
              message: `[${LOG_PATH}] Необработанная ошибка createDeal (best-effort)`,
              payload: { error: String(error) }
            })
          }
        }
      }
    }

    // 5. Формирование ответа (§16.4, §11.5)
    // spinsRemaining: авто-retry не расходует попытку (§16.1)
    const spinsRemaining = won.isAutoRetry
      ? limitResult.maxAllowed - limitResult.used
      : limitResult.maxAllowed - (limitResult.used + 1)

    // full берётся из LoadedSegment (НЕ повторный findById — §16.1)
    const full = won.full ?? ''

    await loggerLib.writeServerLog(ctx, {
      severity: 6,
      message: `[${LOG_PATH}] Вращение завершено успешно`,
      payload: { targetIdx, isRetry, spinsRemaining, nEff }
    })

    return {
      success: true,
      targetIdx,
      full,
      spinsRemaining,
      nEff
    }
  })
})
