/** Сервер-only: Heap repo + PL API — без @shared-route. */
import { requireAnyUser } from '@app/auth'
import * as gcApi from '../../../lib/getcourse-api.client'
import * as loggerLib from '../../../lib/logger.lib'
import { isPaymentLinkLiveTestGcOrderId } from '../../../lib/payment-link-live-test.lib'
import * as contractRepo from '../../../repos/lava_payment_contract.repo'

const LOG_PATH = 'api/tests/endpoints-check/integration-gc-order-pl-api'

/**
 * GET …/integration-gc-order-pl-api — проба PL API GetCourse по номеру заказа.
 * Query: `gcOrderId` (обязательно), `buyerEmail` (опционально: иначе email берётся из контракта Heap с этим `gc_order_id`, если есть).
 */
export const integrationGcOrderPlApiRoute = app.get('/', async (ctx, req) => {
  requireAnyUser(ctx)

  const gcOrderIdRaw = typeof req.query?.gcOrderId === 'string' ? req.query.gcOrderId : ''
  const buyerEmailRaw = typeof req.query?.buyerEmail === 'string' ? req.query.buyerEmail : ''
  const gcOrderId = gcOrderIdRaw.trim()
  const buyerEmailFromQuery = buyerEmailRaw.trim()

  if (!gcOrderId) {
    return {
      success: false,
      test: 'integration-gc-order-pl-api',
      error: 'Укажите query gcOrderId (номер заказа в GetCourse, deal_number).',
      at: Date.now()
    }
  }

  if (isPaymentLinkLiveTestGcOrderId(gcOrderId)) {
    return {
      success: false,
      test: 'integration-gc-order-pl-api',
      error:
        'Для gc_order_id=test вызовы GetCourse в интеграции отключены (лайв Lava). Укажите реальный номер заказа.',
      at: Date.now()
    }
  }

  let buyerEmail = buyerEmailFromQuery
  let buyerEmailSource: 'query' | 'heap' | 'none' = buyerEmail ? 'query' : 'none'

  if (!buyerEmail) {
    const contract = await contractRepo.findByGcOrderId(ctx, gcOrderId)
    const fromHeap = (contract?.buyer_email ?? '').trim()
    if (fromHeap) {
      buyerEmail = fromHeap
      buyerEmailSource = 'heap'
    }
  }

  if (!buyerEmail) {
    return {
      success: false,
      test: 'integration-gc-order-pl-api',
      error:
        'Не удалось определить email покупателя: передайте query buyerEmail или создайте контракт payment-link для этого заказа (email сохранится в Heap).',
      gcOrderId,
      buyerEmailSource: 'none' as const,
      at: Date.now()
    }
  }

  await loggerLib.writeServerLog(ctx, {
    severity: 7,
    message: `[${LOG_PATH}] запрос`,
    payload: { gcOrderId, buyerEmailSource }
  })

  const probe = await gcApi.probeGcOrderPlApi(ctx, { gcOrderId, buyerEmail })

  if (probe.skippedCredentials) {
    return {
      success: true,
      skipped: true,
      test: 'integration-gc-order-pl-api',
      gcOrderId,
      buyerEmailSource,
      message: probe.message,
      probe,
      at: Date.now()
    }
  }

  return {
    success: probe.plApiLogicalSuccess,
    skipped: false,
    test: 'integration-gc-order-pl-api',
    gcOrderId,
    buyerEmailSource,
    probe,
    error: probe.plApiLogicalSuccess ? undefined : probe.message,
    at: Date.now()
  }
})
