// @shared-route
/**
 * `GET /api/payment-page/settings-get` — приватный эндпоинт для панели.
 *
 * Возвращает текущие настройки страницы оплаты в типизированном виде:
 *   - general: PaymentPageGeneralConfig
 *   - methods: PaymentPageMethodRecord[] (массив с resolver/offers/isSystem)
 *
 * Используется компонентом `HomePaymentPageTab.vue` через `.run(ctx)` — поэтому
 * файл помечен `// @shared-route`. Доступ — `guardInternalApi`.
 */

import * as loggerLib from '../../lib/logger.lib'
import {
  getPaymentPageGeneral,
  getPaymentPageMethods
} from '../../lib/paymentPage/paymentPageSettings.lib'
import { guardInternalApi } from '../../lib/access/apiGuard'

const LOG_PATH = 'api/payment-page/settings-get'

export const paymentPageSettingsGetRoute = app.get('/', async (ctx) => {
  const denied = await guardInternalApi(ctx)
  if (denied) return denied

  await loggerLib.writeServerLog(ctx, {
    severity: 6,
    message: `[${LOG_PATH}] entry`,
    payload: {}
  })

  try {
    const [general, methods] = await Promise.all([
      getPaymentPageGeneral(ctx),
      getPaymentPageMethods(ctx)
    ])

    await loggerLib.writeServerLog(ctx, {
      severity: 6,
      message: `[${LOG_PATH}] success`,
      payload: {
        generalEnabled: general.enabled,
        methodCount: methods.length
      }
    })

    return { success: true, general, methods }
  } catch (error) {
    try {
      await loggerLib.writeServerLog(ctx, {
        severity: 3,
        message: `[${LOG_PATH}] error`,
        payload: { error: String(error) }
      })
    } catch {
      /* fail-open: ошибка логирования не должна ломать ответ */
    }
    return { success: false, error: String(error) }
  }
})

export default paymentPageSettingsGetRoute
