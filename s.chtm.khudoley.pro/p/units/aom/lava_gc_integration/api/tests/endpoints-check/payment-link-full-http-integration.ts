import { requireAnyUser } from '@app/auth'
import { request } from '@app/request'
import * as loggerLib from '../../../lib/logger.lib'
import * as appPublicUrl from '../../../lib/app-public-url.lib'
import {
  PAYMENT_LINK_LIVE_TEST_AMOUNT,
  PAYMENT_LINK_LIVE_TEST_BUYER_EMAIL,
  PAYMENT_LINK_LIVE_TEST_CURRENCY,
  PAYMENT_LINK_LIVE_TEST_GC_ORDER_ID,
  readLavaPaymentHeapSettings
} from '../../../lib/payment-link-live-test.lib'
import * as contractRepo from '../../../repos/lava_payment_contract.repo'

const LOG_PATH = 'api/tests/endpoints-check/payment-link-full-http-integration'

/**
 * POST …/payment-link-full-http-integration — чтение Heap, сброс идемпотентности для заказа `test`,
 * HTTP POST на `…/api/integrations/lava/payment-link` без `integrationTestDryRun` (лайв Lava).
 */
export const paymentLinkFullHttpIntegrationRoute = app.post('/', async (ctx, req) => {
  requireAnyUser(ctx)

  await loggerLib.writeServerLog(ctx, {
    severity: 7,
    message: `[${LOG_PATH}] Старт лайв HTTP-интеграции`,
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
      test: 'payment-link-full-http-integration',
      errorCode: 'CONFIG_ERROR',
      settingsRead,
      deactivatedActiveContracts: 0,
      skipped: false
    }
  }

  const url = appPublicUrl.getAbsoluteUrlForAppPath(ctx, 'api/integrations/lava/payment-link')
  if (!url) {
    await loggerLib.writeServerLog(ctx, {
      severity: 6,
      message: `[${LOG_PATH}] Пропуск: нет абсолютного URL`,
      payload: {}
    })
    return {
      success: true,
      test: 'payment-link-full-http-integration',
      settingsRead,
      skipped: true,
      reason: 'cannot_build_absolute_url',
      hint: 'Вызовите из браузера (есть Host/Origin) или передайте заголовки в запросе к API.'
    }
  }

  const deactivatedActiveContracts = await contractRepo.deactivateActiveContractsForGcOrderId(
    ctx,
    PAYMENT_LINK_LIVE_TEST_GC_ORDER_ID
  )

  const jsonBody: Record<string, unknown> = {
    gcOrderId: PAYMENT_LINK_LIVE_TEST_GC_ORDER_ID,
    buyerEmail: PAYMENT_LINK_LIVE_TEST_BUYER_EMAIL,
    amount: PAYMENT_LINK_LIVE_TEST_AMOUNT,
    currency: PAYMENT_LINK_LIVE_TEST_CURRENCY
  }

  await loggerLib.writeServerLog(ctx, {
    severity: 7,
    message: `[${LOG_PATH}] HTTP POST payment-link (лайв)`,
    payload: { url, gcOrderId: jsonBody.gcOrderId }
  })

  try {
    const response = await request({
      url,
      method: 'post',
      json: jsonBody,
      responseType: 'json',
      throwHttpErrors: false
    })

    const body = response.body as Record<string, unknown>
    const ok =
      response.statusCode === 200 &&
      body?.success === true &&
      typeof body?.paymentUrl === 'string' &&
      body.paymentUrl.length > 0

    await loggerLib.writeServerLog(ctx, {
      severity: ok ? 6 : 4,
      message: `[${LOG_PATH}] Ответ HTTP ${response.statusCode}`,
      payload: { ok, errorCode: body?.errorCode }
    })

    return {
      success: ok,
      test: 'payment-link-full-http-integration',
      settingsRead,
      deactivatedActiveContracts,
      requestUrl: url,
      statusCode: response.statusCode,
      responseBody: body,
      requestJson: jsonBody,
      skipped: false
    }
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e)
    await loggerLib.writeServerLog(ctx, {
      severity: 3,
      message: `[${LOG_PATH}] request() исключение`,
      payload: { error: message }
    })
    return {
      success: false,
      test: 'payment-link-full-http-integration',
      settingsRead,
      deactivatedActiveContracts,
      requestUrl: url,
      error: message,
      skipped: false
    }
  }
})
