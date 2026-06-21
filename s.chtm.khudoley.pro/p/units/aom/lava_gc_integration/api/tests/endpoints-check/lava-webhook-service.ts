// @shared-route
import { requireAnyUser } from '@app/auth'
import * as loggerLib from '../../../lib/logger.lib'
import * as settingsLib from '../../../lib/settings.lib'
import * as webhookRepo from '../../../repos/lava_webhook_event.repo'
import * as webhookService from '../../../lib/lava-webhook.service'
import type { LavaWebhookPayload } from '../../../lib/lava-types'

const LOG_PATH = 'api/tests/endpoints-check/lava-webhook-service'

type TestResult = { id: string; title: string; passed: boolean; error?: string }

function basePayload(overrides: Partial<LavaWebhookPayload> = {}): LavaWebhookPayload {
  return {
    eventType: 'payment.success',
    contractId: `wh-test-contract-${Date.now()}`,
    amount: 100,
    currency: 'RUB',
    status: 'completed',
    timestamp: new Date().toISOString(),
    ...overrides
  }
}

/**
 * GET /api/tests/endpoints-check/lava-webhook-service — processWebhook: 401, contract_not_found, duplicate.
 */
export const lavaWebhookServiceTestRoute = app.get('/', async (ctx, req) => {
  requireAnyUser(ctx)

  await loggerLib.writeServerLog(ctx, {
    severity: 7,
    message: `[${LOG_PATH}] Запуск тестов lava-webhook.service`,
    payload: {}
  })

  const results: TestResult[] = []
  const secret = (await settingsLib.getLavaWebhookSecret(ctx)).trim()

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

  await check('unauthorized_wrong_key', 'processWebhook: неверный X-Api-Key → 401', async () => {
    const r = await webhookService.processWebhook(ctx, basePayload(), 'definitely-not-the-secret')
    return r.success === false && 'statusCode' in r && r.statusCode === 401
  })

  await check(
    'unauthorized_empty_when_secret_set',
    'processWebhook: пустой ключ при заданном секрете → 401',
    async () => {
      if (!secret) {
        return true
      }
      const r = await webhookService.processWebhook(ctx, basePayload(), '')
      return r.success === false && 'statusCode' in r && r.statusCode === 401
    }
  )

  await check(
    'contract_not_found',
    'processWebhook: контракт не в Heap → success (contract_not_found)',
    async () => {
      if (!secret) {
        return true
      }
      const payload = basePayload({ contractId: `missing-${Date.now()}` })
      const r = await webhookService.processWebhook(ctx, payload, secret)
      return r.success === true && r.duplicate !== true
    }
  )

  await check(
    'duplicate_processed',
    'processWebhook: повтор после полной обработки → duplicate',
    async () => {
      if (!secret) {
        return true
      }
      const contractId = `dup-${Date.now()}`
      const dedupeKey = `payment.success:${contractId}:completed`
      await webhookRepo.create(ctx, {
        event_type: 'payment.success',
        lava_contract_id: contractId,
        payload_json: '{}',
        dedupe_key: dedupeKey,
        processed: true,
        processed_at: Date.now(),
        processing_error: '',
        created_at: Date.now()
      })
      const payload = basePayload({ contractId, status: 'completed' })
      const r = await webhookService.processWebhook(ctx, payload, secret)
      return r.success === true && r.duplicate === true
    }
  )

  return { success: true, test: 'lava-webhook-service', results, at: Date.now() }
})
