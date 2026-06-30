// @shared-route
import * as wheelLib from '../../lib/wheel.lib'
import * as loggerLib from '../../lib/logger.lib'

const LOG_PATH = 'api/wheel/segments'

/**
 * GET /api/wheel/segments — список эффективных сегментов для рендеринга колеса.
 * Guest (без auth). Публичный endpoint.
 * Возвращает публичную форму сегментов БЕЗ id.
 */
export const wheelSegmentsRoute = app.get('/', async (ctx, _req) => {
  await loggerLib.writeServerLog(ctx, {
    severity: 6,
    message: `[${LOG_PATH}] Запрос сегментов колеса`,
    payload: {}
  })

  try {
    const result = await wheelLib.loadEffectiveSegments(ctx)

    if (!result.success) {
      await loggerLib.writeServerLog(ctx, {
        severity: 5,
        message: `[${LOG_PATH}] Колесо настроено некорректно`,
        payload: { error: result.error }
      })
      return { success: false, error: result.error }
    }

    // Маппинг в публичную форму без id (§11.5)
    const publicSegments = result.segments.map((seg) => {
      const pub: {
        order: number
        label: string
        weight: number
        isAutoRetry?: true
        redirectUrl?: string
      } = {
        order: seg.order,
        label: seg.label,
        weight: seg.weight
      }
      if (seg.isAutoRetry) {
        pub.isAutoRetry = true
      }
      if (seg.redirectUrl) {
        pub.redirectUrl = seg.redirectUrl
      }
      return pub
    })

    await loggerLib.writeServerLog(ctx, {
      severity: 6,
      message: `[${LOG_PATH}] Сегменты получены`,
      payload: { count: publicSegments.length, nEff: result.nEff }
    })

    return { success: true, segments: publicSegments, nEff: result.nEff }
  } catch (error) {
    await loggerLib.writeServerLog(ctx, {
      severity: 3,
      message: `[${LOG_PATH}] Необработанная ошибка`,
      payload: { error: String(error) }
    })
    return { success: false, error: String(error) }
  }
})
