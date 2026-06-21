import { requireAnyUser } from '@app/auth'
import * as loggerLib from '../../../lib/logger.lib'
import { readLavaPaymentHeapSettings } from '../../../lib/payment-link-live-test.lib'

const LOG_PATH = 'api/tests/endpoints-check/payment-link-heap-settings-read'

/**
 * GET …/payment-link-heap-settings-read — чтение из Heap четырёх полей Lava для payment-link (ключ маскируется).
 */
export const paymentLinkHeapSettingsReadRoute = app.get('/', async (ctx, req) => {
  requireAnyUser(ctx)

  await loggerLib.writeServerLog(ctx, {
    severity: 7,
    message: `[${LOG_PATH}] Чтение настроек Lava для лайв-тестов`,
    payload: {}
  })

  const settingsRead = await readLavaPaymentHeapSettings(ctx)

  const passed = settingsRead.allRequiredPresent

  await loggerLib.writeServerLog(ctx, {
    severity: passed ? 6 : 4,
    message: `[${LOG_PATH}] ${passed ? 'OK' : 'FAIL'} (allRequiredPresent=${settingsRead.allRequiredPresent})`,
    payload: {
      hasBaseUrl: Boolean(settingsRead.lava_base_url),
      hasProductId: Boolean(settingsRead.lava_product_id),
      hasOfferId: Boolean(settingsRead.lava_offer_id),
      hasMaskedKey: Boolean(settingsRead.lava_api_key_masked)
    }
  })

  return {
    success: passed,
    test: 'payment-link-heap-settings-read',
    settingsRead,
    skipped: false
  }
})
