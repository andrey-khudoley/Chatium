// @shared

/**
 * Имена ключей настроек тонкого клиента (Heap), которые относятся к подключению к gateway.
 * Здесь только идентификаторы строк настроек — сами значения секретов в shared/ не попадают.
 *
 * Соответствие со спекой gateway:
 * - GATEWAY_URL — базовый URL gateway-приложения (без хвостового `/`), к которому SDK
 *   обращается по обычному HTTP, например `https://s.chtm.khudoley.pro/p/saas/gw/gc`.
 *   Полный URL операции: `${GATEWAY_URL}/api/v1/{op}`.
 * - GC_SCHOOL_HOST — значение для заголовка `X-Gc-School-Host` (manual §2.2, §2.5).
 * - GC_SCHOOL_API_KEY — значение для заголовка `X-Gc-School-Api-Key` (manual §2.2, §5.6).
 *   Это секрет конкретной школы; gateway его в Heap не хранит, ответственность — на SDK.
 */
export const SDK_GATEWAY_SETTING_KEYS = {
  GATEWAY_URL: 'gateway_url',
  GC_SCHOOL_HOST: 'gc_school_host',
  GC_SCHOOL_API_KEY: 'gc_school_api_key'
} as const

export type SdkGatewaySettingKey =
  (typeof SDK_GATEWAY_SETTING_KEYS)[keyof typeof SDK_GATEWAY_SETTING_KEYS]
