/**
 * Юнит-набор клиентской панели Lava.Top (многогейтвейная архитектура, 2026-05-28).
 *
 * Без Heap и сети: проверки каталога операций Lava.Top, диспатча по `gatewayId`,
 * валидации `lava_test_apikey` / `lava_base_url` / `lava_webhook_secret`,
 * структуры invoke-API (наличие `gatewayId`, `SUPPORTED_GATEWAYS`, типы ошибок).
 */

import { tryPush, type LifepayUnitTestResult } from './lifepayUnitHelpers'
import {
  findOperationInGateway,
  findOperationInAnyGateway,
  LAVATOP_OPERATIONS,
  LIFEPAY_OPERATIONS,
  OPERATIONS_BY_GATEWAY,
  FULL_OPERATIONS_CATALOG,
  X_LAVA_APIKEY,
  X_LP_APIKEY,
  X_LP_LOGIN
} from '../../shared/gatewayContract'
import { SUPPORTED_GATEWAYS, INVOKE_PROXY_ERROR_CODES, isGatewayId } from '../../shared/invokeApi'
import {
  LAVA_WEBHOOK_SECRET_MIN_LENGTH,
  isValidLavaBaseUrl,
  normalizeLavaBaseUrl
} from '../settings.lib'
import {
  getLavatopOfferAmountLimits,
  isAmountWithinLavatopOfferLimits
} from '../gateway/lavatopAmountLimits'
import { DIRECT_GATEWAY_HOST_ALIASES } from '../../config/gatewayUrls'

export type { LifepayUnitTestResult } from './lifepayUnitHelpers'

function runLavatopChecks(results: LifepayUnitTestResult[]): void {
  // --- SUPPORTED_GATEWAYS ---
  tryPush(
    results,
    'lavatop_supported_gateways_list',
    'SUPPORTED_GATEWAYS содержит lifepay, lavatop и gc',
    () =>
      SUPPORTED_GATEWAYS.length === 3 &&
      SUPPORTED_GATEWAYS.includes('lifepay') &&
      SUPPORTED_GATEWAYS.includes('lavatop') &&
      SUPPORTED_GATEWAYS.includes('gc')
  )

  tryPush(
    results,
    'lavatop_isGatewayId_ok',
    'isGatewayId принимает lifepay/lavatop/gc, отвергает прочее',
    () =>
      isGatewayId('lifepay') &&
      isGatewayId('lavatop') &&
      isGatewayId('gc') &&
      !isGatewayId('unknown') &&
      !isGatewayId('') &&
      !isGatewayId(undefined)
  )

  tryPush(
    results,
    'lavatop_proxy_codes_present',
    'INVOKE_PROXY_ERROR_CODES содержит GATEWAY_REQUIRED и GATEWAY_UNKNOWN',
    () =>
      INVOKE_PROXY_ERROR_CODES.GATEWAY_REQUIRED === 'INVOKE_GATEWAY_REQUIRED' &&
      INVOKE_PROXY_ERROR_CODES.GATEWAY_UNKNOWN === 'INVOKE_GATEWAY_UNKNOWN'
  )

  // --- LAVATOP_OPERATIONS каталог ---
  tryPush(
    results,
    'lavatop_catalog_size',
    'LAVATOP_OPERATIONS содержит минимум 4 операции',
    () => LAVATOP_OPERATIONS.length >= 4
  )

  tryPush(
    results,
    'lavatop_catalog_createInvoice',
    'createInvoice найдена в каталоге Lava.Top как POST',
    () => {
      const entry = findOperationInGateway('lavatop', 'createInvoice')
      return !!entry && entry.httpMethod === 'POST'
    }
  )

  tryPush(
    results,
    'lavatop_catalog_getInvoiceStatus',
    'getInvoiceStatus найдена в каталоге Lava.Top как GET',
    () => {
      const entry = findOperationInGateway('lavatop', 'getInvoiceStatus')
      return !!entry && entry.httpMethod === 'GET'
    }
  )

  tryPush(
    results,
    'lavatop_catalog_listProducts',
    'listProducts найдена в каталоге Lava.Top как GET',
    () => {
      const entry = findOperationInGateway('lavatop', 'listProducts')
      return !!entry && entry.httpMethod === 'GET'
    }
  )

  tryPush(
    results,
    'lavatop_catalog_updateOfferPrice',
    'updateOfferPrice найдена в каталоге Lava.Top как POST',
    () => {
      const entry = findOperationInGateway('lavatop', 'updateOfferPrice')
      return !!entry && entry.httpMethod === 'POST'
    }
  )

  // --- кросс-каталог: LifePay-операция не входит в Lava.Top и наоборот ---
  tryPush(
    results,
    'lavatop_no_lifepay_ops',
    'createBill отсутствует в каталоге Lava.Top',
    () => findOperationInGateway('lavatop', 'createBill') === null
  )

  tryPush(
    results,
    'lifepay_no_lavatop_ops',
    'createInvoice отсутствует в каталоге LifePay',
    () => findOperationInGateway('lifepay', 'createInvoice') === null
  )

  tryPush(
    results,
    'gateway_catalog_total',
    'FULL_OPERATIONS_CATALOG = sum(LIFEPAY) + sum(LAVATOP) (GC — динамический каталог, пустой)',
    () => FULL_OPERATIONS_CATALOG.length === LIFEPAY_OPERATIONS.length + LAVATOP_OPERATIONS.length
  )

  tryPush(
    results,
    'gc_static_catalog_empty',
    'OPERATIONS_BY_GATEWAY.gc пуст (динамический каталог приходит с GET /v1/operations)',
    () => Array.isArray(OPERATIONS_BY_GATEWAY.gc) && OPERATIONS_BY_GATEWAY.gc.length === 0
  )

  tryPush(
    results,
    'lavatop_operations_by_gateway',
    'OPERATIONS_BY_GATEWAY.lavatop ссылается на LAVATOP_OPERATIONS',
    () => OPERATIONS_BY_GATEWAY.lavatop === LAVATOP_OPERATIONS
  )

  // --- findOperationInAnyGateway ---
  tryPush(
    results,
    'lavatop_any_gateway_lookup',
    'findOperationInAnyGateway(createInvoice) → lavatop',
    () => {
      const entry = findOperationInAnyGateway('createInvoice')
      return !!entry && entry.gatewayId === 'lavatop'
    }
  )

  tryPush(
    results,
    'lifepay_any_gateway_lookup',
    'findOperationInAnyGateway(createBill) → lifepay',
    () => {
      const entry = findOperationInAnyGateway('createBill')
      return !!entry && entry.gatewayId === 'lifepay'
    }
  )

  // --- заголовки ---
  tryPush(
    results,
    'lavatop_header_X_Lava_Apikey',
    'X-Lava-Apikey === "X-Lava-Apikey"',
    () => X_LAVA_APIKEY === 'X-Lava-Apikey'
  )

  tryPush(
    results,
    'lifepay_headers_unchanged',
    'X-Lp-Apikey и X-Lp-Login сохранены',
    () => X_LP_APIKEY === 'X-Lp-Apikey' && X_LP_LOGIN === 'X-Lp-Login'
  )

  // --- валидация lava_base_url ---
  tryPush(
    results,
    'lavatop_base_url_validates_https',
    'isValidLavaBaseUrl("https://<direct-api-host>") === true',
    () => isValidLavaBaseUrl(`https://${DIRECT_GATEWAY_HOST_ALIASES.lavatop?.[0] ?? ''}`) === true
  )

  tryPush(
    results,
    'lavatop_base_url_rejects_empty',
    'isValidLavaBaseUrl("") === false',
    () => isValidLavaBaseUrl('') === false
  )

  tryPush(
    results,
    'lavatop_base_url_rejects_no_scheme',
    'isValidLavaBaseUrl("<direct-api-host>") === false',
    () => isValidLavaBaseUrl(DIRECT_GATEWAY_HOST_ALIASES.lavatop?.[0] ?? '') === false
  )

  tryPush(
    results,
    'lavatop_base_url_normalize_trailing_slash',
    'normalizeLavaBaseUrl("https://x.com/") === "https://x.com"',
    () => normalizeLavaBaseUrl('https://x.com/') === 'https://x.com'
  )

  // --- LAVA_WEBHOOK_SECRET_MIN_LENGTH ---
  tryPush(
    results,
    'lavatop_webhook_secret_min_length',
    'LAVA_WEBHOOK_SECRET_MIN_LENGTH ≥ 16',
    () => LAVA_WEBHOOK_SECRET_MIN_LENGTH >= 16
  )

  // --- лимиты суммы оффера Lava.Top ---
  tryPush(
    results,
    'lavatop_amount_limits_rub_min',
    'RUB: 49 < 50 отклоняется, 50 принимается',
    () =>
      !isAmountWithinLavatopOfferLimits(49, 'RUB') &&
      isAmountWithinLavatopOfferLimits(50, 'RUB') &&
      getLavatopOfferAmountLimits('RUB').min === 50
  )

  tryPush(
    results,
    'lavatop_amount_limits_usd_eur_min',
    'USD/EUR: минимальная сумма 5',
    () =>
      getLavatopOfferAmountLimits('USD').min === 5 &&
      getLavatopOfferAmountLimits('EUR').min === 5 &&
      !isAmountWithinLavatopOfferLimits(4.99, 'USD') &&
      isAmountWithinLavatopOfferLimits(5, 'EUR')
  )
}

export async function runLavatopUnitChecks(): Promise<{
  success: boolean
  results: LifepayUnitTestResult[]
  summary: { total: number; passed: number; failed: number }
}> {
  const results: LifepayUnitTestResult[] = []
  runLavatopChecks(results)
  const passed = results.filter((r) => r.passed).length
  const failed = results.filter((r) => !r.passed).length
  return {
    success: failed === 0,
    results,
    summary: { total: results.length, passed, failed }
  }
}
