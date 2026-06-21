/** Сервер-only: импорт `lavaPaymentLinkRoute` тянет `app.body` со схемой — не помечать @shared-route (иначе падение при сборке shared). */
import { requireAnyUser } from '@app/auth'
import { lavaPaymentLinkRoute } from '../../../api/integrations/lava/payment-link/index'
import * as paymentService from '../../../lib/lava-payment.service'
import * as loggerLib from '../../../lib/logger.lib'

const LOG_PATH = 'api/tests/endpoints-check/lava-payment-link-route'

type TestResult = { id: string; title: string; passed: boolean; error?: string }

/**
 * GET /api/tests/endpoints-check/lava-payment-link-route — POST payment-link через route.run: VALIDATION_ERROR и dry-run;
 * плюс createPaymentLink: сумма ниже минимума Lava для RUB → AMOUNT_OUT_OF_RANGE с непустым message.
 */
export const lavaPaymentLinkRouteTestRoute = app.get('/', async (ctx, req) => {
  requireAnyUser(ctx)

  await loggerLib.writeServerLog(ctx, {
    severity: 7,
    message: `[${LOG_PATH}] Тесты роута payment-link`,
    payload: {}
  })

  const results: TestResult[] = []

  const check = async (id: string, title: string, fn: () => Promise<boolean>) => {
    try {
      const passed = await fn()
      results.push({ id, title, passed })
    } catch (e) {
      results.push({
        id,
        title,
        passed: false,
        error: (e as Error)?.message ?? String(e)
      })
    }
  }

  await check(
    'validation_empty_order',
    'payment-link: пустой gcOrderId → VALIDATION_ERROR',
    async () => {
      const res = (await lavaPaymentLinkRoute.run(ctx, {
        gcOrderId: '   ',
        buyerEmail: 'a@b.c',
        amount: 50,
        currency: 'RUB'
      })) as { success?: boolean; errorCode?: string }
      return res.success === false && res.errorCode === 'VALIDATION_ERROR'
    }
  )

  await check('dry_run_ok', 'payment-link: integrationTestDryRun → успех без Lava', async () => {
    const gcOrderId = `route-dry-${Date.now()}`
    const res = (await lavaPaymentLinkRoute.run(ctx, {
      gcOrderId,
      buyerEmail: 'dry@example.com',
      amount: 50,
      currency: 'RUB',
      integrationTestDryRun: true
    })) as { success?: boolean; integrationTestDryRun?: boolean; gcOrderId?: string }
    return res.success === true && res.integrationTestDryRun === true && res.gcOrderId === gcOrderId
  })

  await check(
    'gc_payload_aliases',
    'payment-link: orderNumber+email+offer+product, валюта rub',
    async () => {
      const orderNumber = `gc-alias-${Date.now()}`
      const res = (await lavaPaymentLinkRoute.run(ctx, {
        orderNumber,
        email: 'gc@example.com',
        amount: 50,
        currency: 'rub',
        offer: 'Предложение',
        product: 'Пакет',
        integrationTestDryRun: true
      })) as { success?: boolean; gcOrderId?: string }
      return res.success === true && res.gcOrderId === orderNumber
    }
  )

  await check(
    'service_amount_rub_below_lava_min',
    'createPaymentLink: 49 RUB → AMOUNT_OUT_OF_RANGE, message не пустой',
    async () => {
      const res = await paymentService.createPaymentLink(ctx, {
        gcOrderId: `rub-min-${Date.now()}`,
        buyerEmail: 'limits@example.com',
        amount: 49,
        currency: 'RUB'
      })
      return (
        res.success === false &&
        res.errorCode === 'AMOUNT_OUT_OF_RANGE' &&
        typeof res.message === 'string' &&
        res.message.length > 0 &&
        res.gcOrderId != null &&
        res.amountMin === 50
      )
    }
  )

  return { success: true, test: 'lava-payment-link-route', results, at: Date.now() }
})
