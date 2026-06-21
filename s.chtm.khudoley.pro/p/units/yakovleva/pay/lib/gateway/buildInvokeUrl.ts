/**
 * Сборка URL исходящего вызова payments-gateway (implementation-plan §1.8.2).
 *
 * URL: <gateway_base_url><GATEWAY_API_PREFIX>/<op>. Метод выбирается по
 * shared/gatewayContract.
 */

import { GATEWAY_API_PREFIX } from '../../config/gatewayUrls'
import { findOperationInCatalog } from '../../shared/gatewayContract'
import type { GatewayHttpMethod } from '../../shared/gatewayContract'

export type BuiltInvokeUrl =
  | { kind: 'ok'; url: string; method: GatewayHttpMethod }
  | { kind: 'op_unknown' }
  | { kind: 'base_url_invalid' }

/**
 * Собрать URL запроса к gateway. baseUrl должен быть нормализован (без trailing slash).
 */
export function buildInvokeUrl(baseUrl: string, op: string): BuiltInvokeUrl {
  const entry = findOperationInCatalog(op)
  if (!entry) return { kind: 'op_unknown' }
  const trimmed = (baseUrl || '').trim()
  if (!trimmed) return { kind: 'base_url_invalid' }
  const noTrailing = trimmed.endsWith('/') ? trimmed.slice(0, -1) : trimmed
  return {
    kind: 'ok',
    url: `${noTrailing}${GATEWAY_API_PREFIX}/${op}`,
    method: entry.httpMethod
  }
}
