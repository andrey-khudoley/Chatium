/**
 * Жёсткие константы payments-gateway. SSOT — operation-manual §8.1, §8.7, §12.2, §12.3.
 * Не конфигурируются через Heap или админку: одинаковые значения для всех `op` обоих контуров.
 */

/** Таймаут исходящего вызова к LifePay (operation-manual §8.1). */
export const GW_OUTBOUND_TIMEOUT_MS = 10_000

/** Лимит размера тела входящего POST /v1/{op} (operation-manual §8.7). */
export const GW_MAX_REQUEST_BODY_BYTES = 1_048_576

/** Базовый URL контура bills_v1 LifePay (см. api-contracts.md, operation-manual §4.5). */
export const LP_BILLS_V1_BASE_URL = 'https://api.life-pay.ru'

/**
 * Верхний предел сканирования журнала при расчёте метрик дашборда
 * (avg/p95 latency, top errorCode). Тоталы считаются точно через countBy,
 * а для производных метрик берётся срез последних N записей диапазона.
 *
 * Не выше 1000 — платформенный максимум `limit` для `findAll` (008-heap.md): при большем
 * значении `queryHeapRecords` бросает ошибку «maximum allowed limit ... is 1000».
 */
export const DASHBOARD_SCAN_LIMIT = 1000
