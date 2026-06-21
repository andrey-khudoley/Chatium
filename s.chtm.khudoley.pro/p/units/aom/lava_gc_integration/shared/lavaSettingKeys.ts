// @shared
/**
 * Ключи Heap-настроек Lava для клиента (@shared-route) и сервера.
 * Должны совпадать с полями в `lib/settings.lib` / `SETTING_KEYS`.
 */
export const LAVA_SETTING_KEYS = {
  LAVA_API_KEY: 'lava_api_key',
  LAVA_BASE_URL: 'lava_base_url',
  LAVA_PRODUCT_ID: 'lava_product_id',
  LAVA_OFFER_ID: 'lava_offer_id',
  LAVA_WEBHOOK_SECRET: 'lava_webhook_secret'
} as const
