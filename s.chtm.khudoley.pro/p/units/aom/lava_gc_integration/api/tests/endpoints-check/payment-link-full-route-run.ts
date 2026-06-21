/** Сервер-only: `lavaPaymentLinkRoute` — не помечать @shared-route. */
import { requireAnyUser } from '@app/auth'
import { lavaPaymentLinkRoute } from '../../../api/integrations/lava/payment-link/index'
import * as loggerLib from '../../../lib/logger.lib'
import {
  PAYMENT_LINK_LIVE_TEST_AMOUNT,
  PAYMENT_LINK_LIVE_TEST_BUYER_EMAIL,
  PAYMENT_LINK_LIVE_TEST_CURRENCY,
  PAYMENT_LINK_LIVE_TEST_GC_ORDER_ID,
  readLavaPaymentHeapSettings
} from '../../../lib/payment-link-live-test.lib'
import * as contractRepo from '../../../repos/lava_payment_contract.repo'

const LOG_PATH = 'api/tests/endpoints-check/payment-link-full-route-run'

/**
 * GET …/payment-link-full-route-run — чтение Heap, сброс идемпотентности для `gcOrderId=test`,
 * затем `lavaPaymentLinkRoute.run` без `integrationTestDryRun` (полный вызов Lava).
 */
export const paymentLinkFullRouteRunRoute = app.get('/', async (ctx, req) => {
  requireAnyUser(ctx)

  await loggerLib.writeServerLog(ctx, {
    severity: 7,
    message: `[${LOG_PATH}] Старт лайв-теста route.run`,
    payload: { gcOrderId: PAYMENT_LINK_LIVE_TEST_GC_ORDER_ID }
  })

  const settingsRead = await readLavaPaymentHeapSettings(ctx)
  if (!settingsRead.allRequiredPresent) {
    await loggerLib.writeServerLog(ctx, {
      severity: 4,
      message: `[${LOG_PATH}] Неполные настройки Heap`,
      payload: {}
    })
    return {
      success: false,
      test: 'payment-link-full-route-run',
      errorCode: 'CONFIG_ERROR',
      settingsRead,
      deactivatedActiveContracts: 0,
      routeResult: null,
      skipped: false
    }
  }

  const deactivatedActiveContracts = await contractRepo.deactivateActiveContractsForGcOrderId(
    ctx,
    PAYMENT_LINK_LIVE_TEST_GC_ORDER_ID
  )

  const routeResult = (await lavaPaymentLinkRoute.run(ctx, {
    gcOrderId: PAYMENT_LINK_LIVE_TEST_GC_ORDER_ID,
    buyerEmail: PAYMENT_LINK_LIVE_TEST_BUYER_EMAIL,
    amount: PAYMENT_LINK_LIVE_TEST_AMOUNT,
    currency: PAYMENT_LINK_LIVE_TEST_CURRENCY
  })) as Record<string, unknown>

  const ok =
    routeResult.success === true &&
    typeof routeResult.paymentUrl === 'string' &&
    routeResult.paymentUrl.length > 0

  await loggerLib.writeServerLog(ctx, {
    severity: ok ? 6 : 4,
    message: `[${LOG_PATH}] ${ok ? 'OK' : 'FAIL'}`,
    payload: {
      gcOrderId: routeResult.gcOrderId,
      errorCode: routeResult.errorCode,
      deactivatedActiveContracts
    }
  })

  return {
    success: ok,
    test: 'payment-link-full-route-run',
    settingsRead,
    deactivatedActiveContracts,
    routeResult,
    skipped: false
  }
})
