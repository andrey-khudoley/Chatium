// @shared

/**
 * Канонические имена заголовков, на которых построен публичный контракт gateway
 * (см. manual §2.2, §2.3, §5.6 и `p/saas/gw/gc/shared/gatewayHttpHeaders.ts`).
 * SDK здесь обязан совпадать с gateway по символьному значению.
 */

/** Заголовок хоста школы без схемы — обязателен на каждом запросе к `/v1/{op}`. */
export const GW_HEADER_SCHOOL_HOST = 'X-Gc-School-Host'

/** Заголовок API-ключа школы GetCourse — обязателен на каждом запросе к `/v1/{op}`. */
export const GW_HEADER_SCHOOL_API_KEY = 'X-Gc-School-Api-Key'

/** Заголовок корреляции в ответе gateway, дублирует `requestId` из JSON. */
export const GW_HEADER_GATEWAY_REQUEST_ID = 'X-Gateway-Request-Id'
