/**
 * Константы тонкого клиента (SDK) при обращении к gateway.
 * SSOT по поведению gateway — `p/saas/gw/gc/docs/gateway/gateway-operation-manual.md`.
 */

/**
 * Префикс публичных HTTP-эндпоинтов gateway относительно `gateway_url`.
 * Полный URL операции: `${gateway_url}${SDK_GATEWAY_API_V1_PREFIX}/{op}`.
 *
 * Префикс `/api/v1` — потому что gateway-приложение исполняется как Chatium-проект
 * с `PROJECT_ROOT = 'p/saas/gw/gc'` и file-based роутингом из `api/v1/{op}.ts`,
 * см. manual §2.1 и `p/saas/gw/gc/api/v1`.
 */
export const SDK_GATEWAY_API_V1_PREFIX = '/api/v1'

/**
 * Полный путь каталога операций (manual §3.3): `${gateway_url}${SDK_GATEWAY_OPERATIONS_PATH}`.
 */
export const SDK_GATEWAY_OPERATIONS_PATH = `${SDK_GATEWAY_API_V1_PREFIX}/operations`

/**
 * Максимальное время ожидания ответа от gateway (мс). Берётся с запасом
 * над `GW_OUTBOUND_TIMEOUT_MS = 10_000` из gateway, чтобы клиент успел получить
 * структурированный ответ `INVOKE_GC_TIMEOUT` от gateway, а не свой собственный
 * сетевой таймаут до того.
 */
export const SDK_GATEWAY_REQUEST_TIMEOUT_MS = 15_000
