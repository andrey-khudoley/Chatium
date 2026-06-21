import { requireAnyUser } from '@app/auth'
import { request } from '@app/request'
import * as loggerLib from '../../../lib/logger.lib'
import * as appPublicUrl from '../../../lib/app-public-url.lib'

const LOG_PATH = 'api/tests/endpoints-check/payment-link-http-integration'

enum OverrideCurrency {
  RUB = 'RUB',
  USD = 'USD',
  EUR = 'EUR'
}

/**
 * POST /api/tests/endpoints-check/payment-link-http-integration — интеграция: HTTP POST
 * на `…/api/integrations/lava/payment-link` через `request()` (как внешний клиент).
 * Тело по умолчанию с `integrationTestDryRun: true`; `paymentLinkOverrides` — частичное переопределение.
 */
export const paymentLinkHttpIntegrationRoute = app
  .body((s) => ({
    paymentLinkOverrides: s.optional(
      s.object({
        gcOrderId: s.optional(s.string()),
        buyerEmail: s.optional(s.string()),
        amount: s.optional(s.number()),
        currency: s.optional(s.enum(OverrideCurrency)),
        gcUserId: s.optional(s.string()),
        description: s.optional(s.string()),
        requestId: s.optional(s.string())
      })
    )
  }))
  .post('/', async (ctx, req) => {
    requireAnyUser(ctx)

    const url = appPublicUrl.getAbsoluteUrlForAppPath(ctx, 'api/integrations/lava/payment-link')
    if (!url) {
      await loggerLib.writeServerLog(ctx, {
        severity: 6,
        message: `[${LOG_PATH}] Пропуск: нет абсолютного URL (host/origin)`,
        payload: {}
      })
      return {
        success: true,
        test: 'payment-link-http-integration',
        skipped: true,
        reason: 'cannot_build_absolute_url',
        hint: 'Вызовите из браузера (есть Host/Origin) или передайте заголовки в запросе к API.'
      }
    }

    const baseJson: Record<string, unknown> = {
      gcOrderId: `http-int-${Date.now()}`,
      buyerEmail: 'integration-test@example.com',
      amount: 50,
      currency: 'RUB',
      integrationTestDryRun: true
    }
    const merged = { ...baseJson, ...(req.body.paymentLinkOverrides ?? {}) }
    merged.integrationTestDryRun = true

    await loggerLib.writeServerLog(ctx, {
      severity: 7,
      message: `[${LOG_PATH}] HTTP POST payment-link`,
      payload: { url, gcOrderId: merged.gcOrderId }
    })

    try {
      const response = await request({
        url,
        method: 'post',
        json: merged,
        responseType: 'json',
        throwHttpErrors: false
      })

      const body = response.body as Record<string, unknown>
      const ok =
        response.statusCode === 200 &&
        body?.success === true &&
        body?.integrationTestDryRun === true

      await loggerLib.writeServerLog(ctx, {
        severity: ok ? 6 : 4,
        message: `[${LOG_PATH}] Ответ HTTP ${response.statusCode}`,
        payload: { ok, hasDryRunFlag: body?.integrationTestDryRun === true }
      })

      return {
        success: ok,
        test: 'payment-link-http-integration',
        requestUrl: url,
        statusCode: response.statusCode,
        responseBody: body,
        requestJson: merged
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
        test: 'payment-link-http-integration',
        requestUrl: url,
        error: message
      }
    }
  })
