/**
 * Общие константы и чтение Heap для лайв-интеграционных тестов payment-link (без dry-run).
 */
import * as settingsLib from './settings.lib'

/** Фиксированный заказ GC для интеграционных прогонов (см. деактивацию контрактов перед тестом). */
export const PAYMENT_LINK_LIVE_TEST_GC_ORDER_ID = 'test'

/** Заказы с этим id не пробрасываются в GetCourse при webhook (лайв-тесты на странице `/web/tests`). */
export function isPaymentLinkLiveTestGcOrderId(gcOrderId: string): boolean {
  return gcOrderId.trim() === PAYMENT_LINK_LIVE_TEST_GC_ORDER_ID
}

export const PAYMENT_LINK_LIVE_TEST_BUYER_EMAIL = 'debug@khudoley.pro'

/** Минимально допустимая для Lava сумма в RUB в ряде сценариев (см. README / docs по тестам). */
export const PAYMENT_LINK_LIVE_TEST_AMOUNT = 50

export const PAYMENT_LINK_LIVE_TEST_CURRENCY = 'RUB' as const

export function maskLavaApiKeyForTests(apiKey: string): string {
  const t = apiKey.trim()
  if (!t) return ''
  if (t.length <= 6) return '******'
  return `${t.slice(0, 4)}…${t.slice(-2)} (${t.length} симв.)`
}

export type LavaPaymentHeapSettingsRead = {
  lava_api_key_masked: string
  lava_base_url: string
  lava_product_id: string
  lava_offer_id: string
  /** Все четыре значения непустые после trim — достаточно для `createPaymentLink`. */
  allRequiredPresent: boolean
}

export async function readLavaPaymentHeapSettings(
  ctx: app.Ctx
): Promise<LavaPaymentHeapSettingsRead> {
  const rawKey = await settingsLib.getLavaApiKey(ctx)
  const lava_base_url = (await settingsLib.getLavaBaseUrl(ctx)).trim()
  const lava_product_id = (await settingsLib.getLavaProductId(ctx)).trim()
  const lava_offer_id = (await settingsLib.getLavaOfferId(ctx)).trim()
  const lava_api_key_masked = maskLavaApiKeyForTests(rawKey)
  const keyOk = rawKey.trim().length > 0
  const allRequiredPresent = keyOk && Boolean(lava_base_url && lava_product_id && lava_offer_id)
  return {
    lava_api_key_masked,
    lava_base_url,
    lava_product_id,
    lava_offer_id,
    allRequiredPresent
  }
}
