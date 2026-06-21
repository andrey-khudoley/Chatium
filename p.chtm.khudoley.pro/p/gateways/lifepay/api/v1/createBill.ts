/**
 * POST /v1/createBill (контур bills_v1) — operation-manual §2, §4.5, §9; implementation-plan §1.4-§1.6.
 *
 * Обязательные заголовки: X-Lp-Apikey, X-Lp-Login (§2.2). `apikey` / `login` подставляются в тело
 * исходящего запроса к LifePay из заголовков, а не из `args` (§4.5).
 * Один входящий → ровно один исходящий вызов к LifePay; серверные ретраи запрещены (§8.6, §12.4).
 *
 * Цепочка §2.6 (валидация заголовков, body, args через каталог, классификация транспорта)
 * инкапсулирована в `handleV1Op`. Здесь — только семантика контура `bills_v1`.
 */

import * as loggerLib from '../../lib/logger.lib'
import { LP_BILLS_V1_BASE_URL } from '../../lib/gateway/constants'
import { handleV1Op } from '../../lib/gateway/handleV1Op'
import {
  buildCreateBillBody,
  redactCreateBillBodyForLog
} from '../../lib/gateway/buildCreateBillBody'
import type { CreateBillArgs } from '../../lib/gateway/buildCreateBillBody'
import { lifePayPostJson } from '../../lib/gateway/lifePayClient'
import {
  classifyCreateBillResponse,
  extractCreateBillSuccess
} from '../../lib/gateway/billsV1Semantic'

const LP_URL = `${LP_BILLS_V1_BASE_URL}/v1/bill`
const LOG_PATH = 'api/v1/createBill'

export const createBillRoute = app.post('/', async (ctx, req) => {
  return handleV1Op<CreateBillArgs>(
    ctx,
    req,
    'createBill',
    async (handlerCtx, { requestId, credentials, args }) => {
      const lpBody = buildCreateBillBody(credentials, args)

      await loggerLib.writeServerLog(handlerCtx, {
        severity: 6,
        message: `[${LOG_PATH}] lp_outbound_body`,
        payload: { requestId, body: redactCreateBillBodyForLog(lpBody) }
      })

      const lp = await lifePayPostJson(LP_URL, lpBody)

      if (lp.kind !== 'json_ok') {
        return { kind: 'lp_result', lp }
      }

      const semantic = classifyCreateBillResponse(lp.lpJson)
      if (semantic) {
        return { kind: 'lp_result', lp, semantic }
      }

      const success = extractCreateBillSuccess(lp.lpJson)
      if (!success) {
        return {
          kind: 'lp_result',
          lp,
          semantic: { rule: 'bills_v1_missing_payment_url' }
        }
      }

      return { kind: 'lp_result', lp, semantic: null, successData: success }
    }
  )
})

export default createBillRoute
