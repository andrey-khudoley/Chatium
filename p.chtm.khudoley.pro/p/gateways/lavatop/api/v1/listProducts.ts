/**
 * GET /v1/listProducts (контур invoices_v1) → `GET /api/v2/products` Lava.Top (лента продуктов).
 *
 * Query `nextPage` (опц.) — URL следующей страницы из предыдущего ответа Lava.Top. Для защиты от
 * SSRF принимается только URL, начинающийся с настроенного `lava_base_url`. На выходе
 * `data: { items, nextPage }` — клиент сам обходит пагинацию, передавая `nextPage` обратно.
 */

import { handleV1Op } from '../../lib/gateway/handleV1Op'
import * as settingsLib from '../../lib/settings.lib'
import { lavaTopGetJson } from '../../lib/gateway/lavaTopClient'
import {
  classifyListProductsResponse,
  extractListProductsSuccess
} from '../../lib/gateway/invoicesV1Semantic'

type Args = { nextPage?: string }

export const listProductsRoute = app.get('/', async (ctx, req) => {
  return handleV1Op<Args>(ctx, req, 'listProducts', async (handlerCtx, { credentials, args }) => {
    const baseUrl = await settingsLib.getLavaBaseUrl(handlerCtx)
    const firstPageUrl = `${baseUrl}/api/v2/products`

    const nextPage = typeof args.nextPage === 'string' ? args.nextPage.trim() : ''
    // SSRF-защита: nextPage должен указывать на тот же base URL Lava.Top.
    if (nextPage && !nextPage.startsWith(baseUrl)) {
      return {
        kind: 'gateway_error',
        code: 'INVOKE_ARGS_SCHEMA_VIOLATION',
        details: { errors: [{ path: 'nextPage', message: `должен начинаться с ${baseUrl}` }] }
      }
    }
    const url = nextPage || firstPageUrl

    const lp = await lavaTopGetJson(url, credentials.apikey)
    if (lp.kind !== 'json_ok') {
      return { kind: 'lp_result', lp }
    }

    const semantic = classifyListProductsResponse(lp.lpJson)
    if (semantic) {
      return { kind: 'lp_result', lp, semantic }
    }

    const success = extractListProductsSuccess(lp.lpJson)
    return { kind: 'lp_result', lp, semantic: null, successData: success }
  })
})

export default listProductsRoute
