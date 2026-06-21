// @shared-route
import { requireAnyUser } from '@app/auth'
import * as loggerLib from '../../../lib/logger.lib'
import * as contractRepo from '../../../repos/lava_payment_contract.repo'
import * as lockLogRepo from '../../../repos/lava_lock_log.repo'
import * as webhookRepo from '../../../repos/lava_webhook_event.repo'

const LOG_PATH = 'api/tests/endpoints-check/lava-repos'

type TestResult = { id: string; title: string; passed: boolean; error?: string }

/**
 * GET /api/tests/endpoints-check/lava-repos — CRUD-операции репозиториев lava_* (Heap).
 */
export const lavaReposTestRoute = app.get('/', async (ctx, req) => {
  requireAnyUser(ctx)

  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
  await loggerLib.writeServerLog(ctx, {
    severity: 7,
    message: `[${LOG_PATH}] Запуск тестов репозиториев`,
    payload: { suffix }
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

  const gcOrderId = `test-repo-order-${suffix}`
  const lavaContractId = `test-repo-lava-${suffix}`
  const dedupeKey = `payment.success:${lavaContractId}:completed`
  const lockKey = `test-repo-lock-${suffix}`

  await check(
    'contract_create_find',
    'lava_payment_contract: create, findByGcOrderId, findByLavaContractId',
    async () => {
      const now = Date.now()
      const row = await contractRepo.create(ctx, {
        gc_order_id: gcOrderId,
        gc_user_id: '',
        lava_contract_id: lavaContractId,
        lava_product_id: 'p-test',
        lava_offer_id: 'o-test',
        amount: 100,
        currency: 'RUB',
        buyer_email: 'repo-test@example.com',
        gc_offer_title: '',
        gc_product_title: '',
        payment_url: 'https://example.com/pay',
        status: 'created',
        request_id: `req-${suffix}`,
        created_at: now,
        updated_at: now
      })
      const byOrder = await contractRepo.findByGcOrderId(ctx, gcOrderId)
      const byLava = await contractRepo.findByLavaContractId(ctx, lavaContractId)
      return Boolean(row.id && byOrder?.id === row.id && byLava?.id === row.id)
    }
  )

  await check(
    'contract_findActive_update',
    'lava_payment_contract: findActiveByGcOrderAmountAndCurrency, updateStatus',
    async () => {
      const active = await contractRepo.findActiveByGcOrderAmountAndCurrency(ctx, {
        gcOrderId,
        amount: 100,
        currency: 'RUB'
      })
      if (!active) return false
      await contractRepo.updateStatus(ctx, active.id, 'paid')
      const after = await contractRepo.findActiveByGcOrderAmountAndCurrency(ctx, {
        gcOrderId,
        amount: 100,
        currency: 'RUB'
      })
      return after === null
    }
  )

  await check(
    'webhook_create_find_mark',
    'lava_webhook_event: create, findByDedupeKey, markProcessed',
    async () => {
      const row = await webhookRepo.create(ctx, {
        event_type: 'payment.success',
        lava_contract_id: lavaContractId,
        payload_json: '{}',
        dedupe_key: dedupeKey,
        processed: false,
        processed_at: 0,
        processing_error: '',
        created_at: Date.now()
      })
      const found = await webhookRepo.findByDedupeKey(ctx, dedupeKey)
      if (!found || found.id !== row.id) return false
      await webhookRepo.markProcessed(ctx, row.id)
      const after = await webhookRepo.findByDedupeKey(ctx, dedupeKey)
      return after?.processed === true
    }
  )

  await check(
    'webhook_findUnprocessed',
    'lava_webhook_event: findUnprocessed (массив)',
    async () => {
      const rows = await webhookRepo.findUnprocessed(ctx)
      return Array.isArray(rows)
    }
  )

  await check(
    'lock_create_update',
    'lava_lock_log: create, updateAcquiredAt, updateReleased',
    async () => {
      const row = await lockLogRepo.create(ctx, {
        lock_key: lockKey,
        request_id: `r-${suffix}`,
        gc_order_id: gcOrderId,
        acquired_at: 0,
        released_at: 0,
        result: 'pending',
        error_message: ''
      })
      await lockLogRepo.updateAcquiredAt(ctx, row.id, Date.now())
      await lockLogRepo.updateReleased(ctx, row.id, 'success')
      return Boolean(row.id)
    }
  )

  return { success: true, test: 'lava-repos', results, at: Date.now() }
})
