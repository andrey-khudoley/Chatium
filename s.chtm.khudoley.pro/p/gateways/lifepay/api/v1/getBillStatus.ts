/**
 * GET /v1/getBillStatus (контур bills_v1) — operation-manual §2, §4.5, §9.
 *
 * Контракт: query `billNumber`; на выходе `data: { billNumber, status, msg? }`, где `status` —
 * имя состояния по справочнику LifePay (`initiated`/`success`/`pending`/`failed`/`cancelled`),
 * `msg` — сопровождающее сообщение от LifePay (например, «Ожидает подтверждения»).
 *
 * Маппинг: `GET https://api.life-pay.ru/v1/bill/status?apikey=...&login=...&number=...`.
 * LifePay возвращает `data` как словарь `{ [billNumber]: { status: number, msg: string } }` —
 * gateway разворачивает в плоскую форму.
 *
 * Секреты `apikey`/`login` берутся из заголовков gateway (§4.5) и подставляются в query
 * исходящего вызова внутри `lifePayGetJson` — в `args` они не попадают.
 */

import { LP_BILLS_V1_BASE_URL } from '../../lib/gateway/constants'
import { handleV1Op } from '../../lib/gateway/handleV1Op'
import { lifePayGetJson } from '../../lib/gateway/lifePayClient'
import {
  classifyGetBillStatusResponse,
  extractGetBillStatusSuccess
} from '../../lib/gateway/billsV1Semantic'

const LP_URL = `${LP_BILLS_V1_BASE_URL}/v1/bill/status`

type Args = { billNumber: string }

export const getBillStatusRoute = app.get('/', async (ctx, req) => {
  return handleV1Op<Args>(ctx, req, 'getBillStatus', async (_ctx, { credentials, args }) => {
    const lp = await lifePayGetJson(LP_URL, credentials, { number: args.billNumber })

    if (lp.kind !== 'json_ok') {
      return { kind: 'lp_result', lp }
    }

    const semantic = classifyGetBillStatusResponse(lp.lpJson)
    if (semantic) {
      return { kind: 'lp_result', lp, semantic }
    }

    const success = extractGetBillStatusSuccess(lp.lpJson)
    if (!success) {
      // defensive: classifyGetBillStatusResponse(null) ⇒ extractGetBillStatusSuccess ≠ null
      // (обе функции читают одну и ту же первую запись `data`). Ветка не достижима при
      // текущих инвариантах; на случай рассинхрона — мапим в `bills_v1_code_error` без кода.
      return { kind: 'lp_result', lp, semantic: { rule: 'bills_v1_code_error' } }
    }

    return { kind: 'lp_result', lp, semantic: null, successData: success }
  })
})

export default getBillStatusRoute
