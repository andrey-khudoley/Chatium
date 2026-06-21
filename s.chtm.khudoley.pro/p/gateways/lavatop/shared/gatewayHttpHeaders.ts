// @shared
/**
 * Имена HTTP-заголовков публичного API Lava.Top-gateway.
 * Только строковые константы, никаких значений секретов.
 *
 *   - `X-Lava-Apikey` — входящий секрет от клиента gateway (API-ключ магазина Lava.Top).
 *     Gateway проксирует его как `X-Api-Key` к Lava.Top (клиент не знает формат upstream).
 *   - `X-Api-Key`     — заголовок авторизации к Lava.Top (схема ApiKeyAuth в OpenAPI Lava.Top).
 *   - `X-Gateway-Request-Id` — корреляционный идентификатор ответа gateway.
 */

export const X_LAVA_APIKEY = 'X-Lava-Apikey'
export const X_API_KEY = 'X-Api-Key'
export const X_GATEWAY_REQUEST_ID = 'X-Gateway-Request-Id'
