/** Сервер-only: импорт `lavaPaymentLinkRoute` — не помечать @shared-route. */
import { requireAnyUser } from '@app/auth'
import { lavaPaymentLinkRoute } from '../../../api/integrations/lava/payment-link/index'
import * as loggerLib from '../../../lib/logger.lib'

const LOG_PATH = 'api/tests/endpoints-check/payment-link-dry-run-unit'

/**
 * GET /api/tests/endpoints-check/payment-link-dry-run-unit — быстрый юнит: `lavaPaymentLinkRoute.run`
 * с `integrationTestDryRun: true` (без HTTP, без Lava).
 */
export const paymentLinkDryRunUnitRoute = app.get('/', async (ctx, req) => {
  requireAnyUser(ctx)

  const gcOrderId = `dry-run-unit-${Date.now()}`
  /** Поля тела POST — в `.run` передаются на верхнем уровне (не `{ body: { … } }`), см. `lavaCatalogRoute.run` в AdminPage. */
  const res = (await lavaPaymentLinkRoute.run(ctx, {
    gcOrderId,
    buyerEmail: 'dry-run-unit@example.com',
    amount: 50,
    currency: 'RUB',
    integrationTestDryRun: true
  })) as {
    success?: boolean
    integrationTestDryRun?: boolean
    gcOrderId?: string
    paymentUrl?: string
    errorCode?: string
  }

  const passed =
    res.success === true &&
    res.integrationTestDryRun === true &&
    res.gcOrderId === gcOrderId &&
    typeof res.paymentUrl === 'string' &&
    res.paymentUrl.includes('integration-test.invalid')

  await loggerLib.writeServerLog(ctx, {
    severity: passed ? 6 : 4,
    message: `[${LOG_PATH}] ${passed ? 'OK' : 'FAIL'}`,
    payload: { gcOrderId, passed, errorCode: res.errorCode }
  })

  return {
    success: passed,
    test: 'payment-link-dry-run-unit',
    skipped: false,
    gcOrderId,
    routeResult: res
  }
})
