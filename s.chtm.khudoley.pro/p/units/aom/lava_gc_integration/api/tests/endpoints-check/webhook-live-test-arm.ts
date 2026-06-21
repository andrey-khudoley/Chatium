import { requireAnyUser } from '@app/auth'
import * as loggerLib from '../../../lib/logger.lib'
import { armWebhookLiveTest } from '../../../lib/webhook-live-test.lib'

const LOG_PATH = 'api/tests/endpoints-check/webhook-live-test-arm'

/**
 * POST …/webhook-live-test-arm — вооружить сессию проверки webhook (ожидаемый lava_contract_id,
 * опционально paymentUrl для отображения на странице тестов).
 */
export const webhookLiveTestArmRoute = app
  .body((s) => ({
    expectedLavaContractId: s.string(),
    paymentUrl: s.optional(s.string())
  }))
  .post('/', async (ctx, req) => {
    requireAnyUser(ctx)

    const expectedLavaContractId = req.body.expectedLavaContractId.trim()
    const paymentUrl = req.body.paymentUrl?.trim()

    await loggerLib.writeServerLog(ctx, {
      severity: 7,
      message: `[${LOG_PATH}] arm`,
      payload: {
        hasExpectedId: Boolean(expectedLavaContractId),
        hasPaymentUrl: Boolean(paymentUrl)
      }
    })

    try {
      await armWebhookLiveTest(ctx, expectedLavaContractId, paymentUrl)
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      await loggerLib.writeServerLog(ctx, {
        severity: 4,
        message: `[${LOG_PATH}] arm error`,
        payload: { error: msg }
      })
      return { success: false, error: msg, test: 'webhook-live-test-arm' }
    }

    return { success: true, test: 'webhook-live-test-arm' }
  })
