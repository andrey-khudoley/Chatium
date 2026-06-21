/**
 * GET /v1/getInvoiceStatus (контур invoices_v1) → `GET /api/v2/invoices/{id}` Lava.Top.
 *
 * Query `id` — contractId/ID счёта. Секрет `X-Lava-Apikey` проксируется в `X-Api-Key`.
 * На выходе `data: { contractId, status, raw }`.
 */

import * as settingsLib from '../../lib/settings.lib'
import { handleV1Op } from '../../lib/gateway/handleV1Op'
import { lavaTopGetJson } from '../../lib/gateway/lavaTopClient'
import {
  classifyGetInvoiceStatusResponse,
  extractGetInvoiceStatusSuccess
} from '../../lib/gateway/invoicesV1Semantic'

type Args = { id: string }

export const getInvoiceStatusRoute = app.get('/', async (ctx, req) => {
  return handleV1Op<Args>(
    ctx,
    req,
    'getInvoiceStatus',
    async (handlerCtx, { credentials, args }) => {
      const baseUrl = await settingsLib.getLavaBaseUrl(handlerCtx)
      const url = `${baseUrl}/api/v2/invoices/${encodeURIComponent(args.id)}`

      const lp = await lavaTopGetJson(url, credentials.apikey)
      if (lp.kind !== 'json_ok') {
        return { kind: 'lp_result', lp }
      }

      const semantic = classifyGetInvoiceStatusResponse(lp.lpJson)
      if (semantic) {
        return { kind: 'lp_result', lp, semantic }
      }

      const success = extractGetInvoiceStatusSuccess(lp.lpJson)
      if (!success) {
        return { kind: 'lp_result', lp, semantic: { rule: 'invoices_v1_error_response' } }
      }

      return { kind: 'lp_result', lp, semantic: null, successData: success }
    }
  )
})

export default getInvoiceStatusRoute
