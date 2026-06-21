/**
 * Жёсткие константы Lava.Top-gateway. Не конфигурируются через Heap: одинаковы для всех `op`.
 */

import { LAVA_DEFAULT_BASE_URL } from '../../shared/gatewaySettingKeys'

/**
 * Таймаут исходящего вызова к Lava.Top, мс. Согласовано с референсом
 * `p/units/aom/lava_gc_integration/lib/lava-api.client.ts` (createContract/updateOfferPrice — 15с).
 */
export const GW_OUTBOUND_TIMEOUT_MS = 15_000

/** Таймаут форварда вебхука на клиентский callback, мс. */
export const GW_FORWARD_TIMEOUT_MS = 10_000

/** Лимит размера тела входящего POST /v1/{op}, байт. */
export const GW_MAX_REQUEST_BODY_BYTES = 1_048_576

/**
 * Верхний предел сканирования журнала при расчёте производных метрик дашборда.
 * Не выше 1000 — платформенный максимум `limit` для `findAll` (inner/docs/008-heap.md).
 */
export const DASHBOARD_SCAN_LIMIT = 1000

export { LAVA_DEFAULT_BASE_URL }
