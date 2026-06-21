/**
 * POST /v1/cancelBill (контур bills_v1) — operation-manual §2, §4.5, §9.
 *
 * Контракт: body `{ billNumber }`; на выходе `data: { status: 'cancelled' }` — LifePay при
 * успехе возвращает пустой `data: {}`, поэтому gateway отдаёт синтетический статус факту
 * успешной отмены. Повторный вызов на уже отменённый счёт → `INVOKE_LP_SEMANTIC_ERROR` с
 * `lpRule: 'bills_v1_code_error'` и `lpNumericCode` из ответа LifePay.
 *
 * Маппинг: `POST https://api.life-pay.ru/v1/bill/cancellation` с телом
 * `{ apikey, login, number }`. Секреты — из заголовков gateway (§4.5), не из `args`.
 */

import { LP_BILLS_V1_BASE_URL } from '../../lib/gateway/constants'
import { handleV1Op } from '../../lib/gateway/handleV1Op'
import { lifePayPostJson } from '../../lib/gateway/lifePayClient'
import {
  classifyCancelBillResponse,
  extractCancelBillSuccess
} from '../../lib/gateway/billsV1Semantic'

const LP_URL = `${LP_BILLS_V1_BASE_URL}/v1/bill/cancellation`

type Args = { billNumber: string }

export const cancelBillRoute = app.post('/', async (ctx, req) => {
  return handleV1Op<Args>(ctx, req, 'cancelBill', async (_ctx, { credentials, args }) => {
    const lpBody = {
      apikey: credentials.apikey,
      login: credentials.login,
      number: args.billNumber
    }
    const lp = await lifePayPostJson(LP_URL, lpBody)

    if (lp.kind !== 'json_ok') {
      return { kind: 'lp_result', lp }
    }

    const semantic = classifyCancelBillResponse(lp.lpJson)
    if (semantic) {
      return { kind: 'lp_result', lp, semantic }
    }

    // LifePay при `code === 0` возвращает `data: {}` — отдельных полей нет;
    // `extractCancelBillSuccess` отдаёт синтетический `{ status: 'cancelled' }`.
    return {
      kind: 'lp_result',
      lp,
      semantic: null,
      successData: extractCancelBillSuccess(lp.lpJson)
    }
  })
})

export default cancelBillRoute
