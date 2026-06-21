/**
 * POST /v1/updateOfferPrice (контур invoices_v1) → `PATCH /api/v2/products/{productId}` Lava.Top.
 *
 * Метод gateway — POST (тело с args), к Lava.Top уходит PATCH (внутри handler). Секрет
 * `X-Lava-Apikey` проксируется в `X-Api-Key`. Тело PATCH — `{ offers: [...] }` (ProductUpdateRequest).
 * На выходе `data: { success: true, raw }`.
 */

import * as settingsLib from '../../lib/settings.lib'
import { handleV1Op } from '../../lib/gateway/handleV1Op'
import { lavaTopPatchJson } from '../../lib/gateway/lavaTopClient'
import {
  classifyUpdateOfferPriceResponse,
  extractUpdateOfferPriceSuccess
} from '../../lib/gateway/invoicesV1Semantic'

type OfferInput = {
  id: string
  prices: Array<{ amount: number; currency: string }>
  name?: string
  description?: string
}
type Args = { productId: string; offers: OfferInput[] }

export const updateOfferPriceRoute = app.post('/', async (ctx, req) => {
  return handleV1Op<Args>(
    ctx,
    req,
    'updateOfferPrice',
    async (handlerCtx, { credentials, args }) => {
      const baseUrl = await settingsLib.getLavaBaseUrl(handlerCtx)
      const url = `${baseUrl}/api/v2/products/${encodeURIComponent(args.productId)}`

      const lp = await lavaTopPatchJson(url, credentials.apikey, { offers: args.offers })
      if (lp.kind !== 'json_ok') {
        return { kind: 'lp_result', lp }
      }

      const semantic = classifyUpdateOfferPriceResponse(lp.lpJson)
      if (semantic) {
        return { kind: 'lp_result', lp, semantic }
      }

      const success = extractUpdateOfferPriceSuccess(lp.lpJson)
      return { kind: 'lp_result', lp, semantic: null, successData: success }
    }
  )
})

export default updateOfferPriceRoute
