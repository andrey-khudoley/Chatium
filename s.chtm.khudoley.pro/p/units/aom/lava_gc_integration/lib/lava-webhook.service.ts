import type { LavaWebhookPayload, LocalContractStatus } from './lava-types'
import * as gcApi from './getcourse-api.client'
import * as loggerLib from './logger.lib'
import * as settingsLib from './settings.lib'
import {
  recordWebhookLiveTestAfterContract,
  recordWebhookLiveTestContractNotFound,
  recordWebhookLiveTestDuplicate
} from './webhook-live-test.lib'
import * as contractRepo from '../repos/lava_payment_contract.repo'
import * as webhookRepo from '../repos/lava_webhook_event.repo'
import type { LavaWebhookEventRow } from '../tables/lava_webhook_event.table'

const LOG_MODULE = 'lib/lava-webhook.service'

export type ProcessWebhookResult =
  | { success: true; duplicate?: boolean }
  | { success: false; error: 'Unauthorized'; statusCode: 401 }

function buildDedupeKey(payload: LavaWebhookPayload): string {
  return `${payload.eventType}:${payload.contractId}:${payload.status}`
}

function mapEventToLocalStatus(payload: LavaWebhookPayload): LocalContractStatus {
  const et = payload.eventType
  if (et === 'payment.success' && payload.status === 'completed') {
    return 'paid'
  }
  if (et.startsWith('subscription.')) {
    return 'unknown'
  }
  if (et === 'payment.success') {
    return 'unknown'
  }
  return 'unknown'
}

function shouldRetryAfterContractNotFound(row: LavaWebhookEventRow | null): boolean {
  if (!row || !row.processed) return false
  return (row.processing_error ?? '').trim() === 'contract_not_found'
}

/**
 * Обработка webhook Lava: секрет, дедупликация, маппинг статуса контракта, вызов GetCourse PL API.
 * При `contract_not_found` событие помечается обработанным с ошибкой — повторный webhook с тем же
 * dedupe_key обрабатывается снова (контракт мог появиться в Heap).
 */
export async function processWebhook(
  ctx: app.Ctx,
  payload: LavaWebhookPayload,
  authHeader: string | undefined
): Promise<ProcessWebhookResult> {
  await loggerLib.writeServerLog(ctx, {
    severity: 7,
    message: `[${LOG_MODULE}] processWebhook: вход`,
    payload: {
      eventType: payload.eventType,
      contractId: payload.contractId,
      status: payload.status,
      hasAuthHeader: Boolean((authHeader ?? '').trim())
    }
  })

  const secret = (await settingsLib.getLavaWebhookSecret(ctx)).trim()
  const key = (authHeader ?? '').trim()
  if (!secret || key !== secret) {
    await loggerLib.writeServerLog(ctx, {
      severity: 7,
      message: `[${LOG_MODULE}] processWebhook: проверка секрета не пройдена`,
      payload: { hasSecret: Boolean(secret), hasKey: Boolean(key) }
    })
    return { success: false, error: 'Unauthorized', statusCode: 401 }
  }

  const dedupeKey = buildDedupeKey(payload)
  const existing = await webhookRepo.findByDedupeKey(ctx, dedupeKey)

  await loggerLib.writeServerLog(ctx, {
    severity: 7,
    message: `[${LOG_MODULE}] processWebhook: дедупликация`,
    payload: {
      dedupeKey,
      hasExisting: Boolean(existing),
      processed: existing?.processed,
      retryAfterNotFound: existing ? shouldRetryAfterContractNotFound(existing) : false
    }
  })

  if (existing?.processed && !shouldRetryAfterContractNotFound(existing)) {
    await loggerLib.writeServerLog(ctx, {
      severity: 7,
      message: `[${LOG_MODULE}] processWebhook: дубликат, пропуск`,
      payload: { dedupeKey }
    })
    await recordWebhookLiveTestDuplicate(ctx, payload)
    return { success: true, duplicate: true }
  }

  let webhookRow: LavaWebhookEventRow
  if (existing) {
    webhookRow = existing
    await loggerLib.writeServerLog(ctx, {
      severity: 7,
      message: `[${LOG_MODULE}] processWebhook: повторная обработка (retry)`,
      payload: { webhookRowId: webhookRow.id, dedupeKey }
    })
  } else {
    webhookRow = await webhookRepo.create(ctx, {
      event_type: payload.eventType,
      lava_contract_id: payload.contractId,
      payload_json: JSON.stringify(payload),
      dedupe_key: dedupeKey,
      processed: false,
      processed_at: 0,
      processing_error: '',
      created_at: Date.now()
    })
    await loggerLib.writeServerLog(ctx, {
      severity: 7,
      message: `[${LOG_MODULE}] processWebhook: создана запись webhook`,
      payload: { webhookRowId: webhookRow.id, dedupeKey }
    })
  }

  const contract = await contractRepo.findByLavaContractId(ctx, payload.contractId)
  if (!contract) {
    await loggerLib.writeServerLog(ctx, {
      severity: 7,
      message: `[${LOG_MODULE}] processWebhook: контракт в Heap не найден (ветка contract_not_found)`,
      payload: { contractId: payload.contractId, dedupeKey }
    })
    await loggerLib.writeServerLog(ctx, {
      severity: 4,
      message: `[${LOG_MODULE}] контракт не найден по lava_contract_id, webhook сохранён`,
      payload: { contractId: payload.contractId, dedupeKey }
    })
    await recordWebhookLiveTestContractNotFound(ctx, payload)
    await webhookRepo.markProcessed(ctx, webhookRow.id, 'contract_not_found')
    return { success: true }
  }

  await loggerLib.writeServerLog(ctx, {
    severity: 7,
    message: `[${LOG_MODULE}] processWebhook: контракт найден`,
    payload: {
      heapContractId: contract.id,
      lava_contract_id: payload.contractId,
      gc_order_id: contract.gc_order_id
    }
  })

  const isSuccessfulPayment =
    payload.eventType === 'payment.success' && payload.status === 'completed'
  if (!isSuccessfulPayment) {
    await loggerLib.writeServerLog(ctx, {
      severity: 6,
      message: `[${LOG_MODULE}] processWebhook: неуспешный/нерелевантный webhook пропущен`,
      payload: {
        eventType: payload.eventType,
        contractStatus: payload.status,
        gcOrderId: contract.gc_order_id
      }
    })
    await webhookRepo.markProcessed(ctx, webhookRow.id)
    return { success: true }
  }

  const mappedStatus = mapEventToLocalStatus(payload)

  await loggerLib.writeServerLog(ctx, {
    severity: 7,
    message: `[${LOG_MODULE}] processWebhook: маппинг статуса`,
    payload: { eventType: payload.eventType, contractStatus: payload.status, mappedStatus }
  })

  if (payload.eventType.startsWith('subscription.')) {
    await loggerLib.writeServerLog(ctx, {
      severity: 6,
      message: `[${LOG_MODULE}] событие подписки, локальный статус unknown`,
      payload: { eventType: payload.eventType, contractId: payload.contractId }
    })
  }

  await contractRepo.updateStatus(ctx, contract.id, mappedStatus)

  await loggerLib.writeServerLog(ctx, {
    severity: 7,
    message: `[${LOG_MODULE}] processWebhook: статус контракта в Heap обновлён`,
    payload: { heapContractId: contract.id, mappedStatus }
  })

  await recordWebhookLiveTestAfterContract(ctx, payload, contract, mappedStatus)

  try {
    await loggerLib.writeServerLog(ctx, {
      severity: 7,
      message: `[${LOG_MODULE}] processWebhook: вызов GetCourse (оплата -> В работе)`,
      payload: { gcOrderId: contract.gc_order_id }
    })
    await gcApi.updateDealStatus(ctx, {
      gcOrderId: contract.gc_order_id,
      buyerEmail: contract.buyer_email,
      dealStatus: 'in_work',
      dealIsPaid: 1
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    await loggerLib.writeServerLog(ctx, {
      severity: 7,
      message: `[${LOG_MODULE}] processWebhook: исключение при вызове GetCourse`,
      payload: { error: msg, webhookRowId: webhookRow.id }
    })
    await webhookRepo.markProcessed(ctx, webhookRow.id, msg)
    return { success: true }
  }

  await webhookRepo.markProcessed(ctx, webhookRow.id)
  await loggerLib.writeServerLog(ctx, {
    severity: 7,
    message: `[${LOG_MODULE}] processWebhook: успешное завершение`,
    payload: { webhookRowId: webhookRow.id, mappedStatus }
  })
  return { success: true }
}
