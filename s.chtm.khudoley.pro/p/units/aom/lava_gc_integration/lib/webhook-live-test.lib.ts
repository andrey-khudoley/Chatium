/**
 * Сессия лайв-проверки webhook на странице тестов: ожидаемый `lava_contract_id`,
 * первый «зелёный» payment.success + completed по этому id, прочие события — в otherEvents.
 * Хранение: Heap settings (служебный ключ, напрямую через `settings.repo`, не через `setSetting`).
 */
import type { LavaWebhookPayload } from './lava-types'
import * as settingsRepo from '../repos/settings.repo'
import type { LavaPaymentContractRow } from '../tables/lava_payment_contract.table'

const STATE_KEY = '__lava_webhook_live_test_state_v1__'

const MAX_OTHER_EVENTS = 30

export type WebhookLiveTestState = {
  expectedLavaContractId: string
  /** Ссылка на оплату Lava для отображения на странице тестов (передаётся при arm). */
  paymentUrl?: string
  armedAt: number
  status: 'armed' | 'success'
  successAt?: number
  /** События, не засчитанные как зелёный успех (сырой JSON тела). */
  otherEvents: Array<{ at: number; reason: string; payloadJson: string }>
}

function parseState(raw: unknown): WebhookLiveTestState | null {
  if (!raw || typeof raw !== 'object') return null
  const o = raw as Record<string, unknown>
  const expectedLavaContractId =
    typeof o.expectedLavaContractId === 'string' ? o.expectedLavaContractId.trim() : ''
  const armedAt = typeof o.armedAt === 'number' ? o.armedAt : 0
  const status = o.status === 'success' || o.status === 'armed' ? o.status : null
  const otherEvents = Array.isArray(o.otherEvents) ? o.otherEvents : []
  if (!expectedLavaContractId || !status) return null
  const paymentUrl =
    typeof o.paymentUrl === 'string' && o.paymentUrl.trim() ? o.paymentUrl.trim() : undefined
  const cleaned: WebhookLiveTestState['otherEvents'] = []
  for (const e of otherEvents) {
    if (!e || typeof e !== 'object') continue
    const r = e as Record<string, unknown>
    if (typeof r.payloadJson !== 'string') continue
    cleaned.push({
      at: typeof r.at === 'number' ? r.at : Date.now(),
      reason: typeof r.reason === 'string' ? r.reason : 'event',
      payloadJson: r.payloadJson
    })
    if (cleaned.length >= MAX_OTHER_EVENTS) break
  }
  return {
    expectedLavaContractId,
    paymentUrl,
    armedAt,
    status,
    successAt: typeof o.successAt === 'number' ? o.successAt : undefined,
    otherEvents: cleaned
  }
}

export async function getWebhookLiveTestState(ctx: app.Ctx): Promise<WebhookLiveTestState | null> {
  const row = await settingsRepo.findByKey(ctx, STATE_KEY)
  return parseState(row?.value)
}

export async function armWebhookLiveTest(
  ctx: app.Ctx,
  expectedLavaContractId: string,
  paymentUrl?: string
): Promise<void> {
  const trimmed = expectedLavaContractId.trim()
  if (!trimmed) {
    throw new Error('expectedLavaContractId пуст')
  }
  const pu = typeof paymentUrl === 'string' ? paymentUrl.trim() : ''
  const next: WebhookLiveTestState = {
    expectedLavaContractId: trimmed,
    paymentUrl: pu || undefined,
    armedAt: Date.now(),
    status: 'armed',
    otherEvents: []
  }
  await settingsRepo.upsert(ctx, STATE_KEY, next)
}

async function saveState(ctx: app.Ctx, state: WebhookLiveTestState): Promise<void> {
  await settingsRepo.upsert(ctx, STATE_KEY, state)
}

function payloadJson(payload: LavaWebhookPayload): string {
  try {
    return JSON.stringify(payload)
  } catch {
    return '{}'
  }
}

async function appendOther(
  ctx: app.Ctx,
  state: WebhookLiveTestState,
  reason: string,
  payload: LavaWebhookPayload
): Promise<void> {
  const otherEvents = [
    ...state.otherEvents,
    { at: Date.now(), reason, payloadJson: payloadJson(payload) }
  ]
  await saveState(ctx, {
    ...state,
    otherEvents: otherEvents.slice(-MAX_OTHER_EVENTS)
  })
}

/** Дубликат dedupe (уже обработано ранее). */
export async function recordWebhookLiveTestDuplicate(
  ctx: app.Ctx,
  payload: LavaWebhookPayload
): Promise<void> {
  const state = await getWebhookLiveTestState(ctx)
  if (!state || state.status !== 'armed') return
  await appendOther(ctx, state, 'duplicate_dedupe', payload)
}

/** Контракт в Heap не найден. */
export async function recordWebhookLiveTestContractNotFound(
  ctx: app.Ctx,
  payload: LavaWebhookPayload
): Promise<void> {
  const state = await getWebhookLiveTestState(ctx)
  if (!state || state.status !== 'armed') return
  const reason =
    payload.contractId === state.expectedLavaContractId
      ? 'contract_not_found_expected_id'
      : 'contract_not_found_other_id'
  await appendOther(ctx, state, reason, payload)
}

type MappedForTest = import('./lava-types').LocalContractStatus

/**
 * После нахождения контракта и маппинга статуса: зелёный успех или запись в otherEvents.
 */
export async function recordWebhookLiveTestAfterContract(
  ctx: app.Ctx,
  payload: LavaWebhookPayload,
  contract: LavaPaymentContractRow,
  mappedStatus: MappedForTest
): Promise<void> {
  const state = await getWebhookLiveTestState(ctx)
  if (!state || state.status !== 'armed') return

  const idMatch = payload.contractId === state.expectedLavaContractId
  const isPaidSuccess =
    idMatch &&
    payload.eventType === 'payment.success' &&
    payload.status === 'completed' &&
    mappedStatus === 'paid'

  if (isPaidSuccess) {
    await saveState(ctx, {
      ...state,
      status: 'success',
      successAt: Date.now()
    })
    return
  }

  let reason = 'not_matching_success'
  if (!idMatch) {
    reason = 'wrong_contract_id'
  } else if (payload.eventType !== 'payment.success' || payload.status !== 'completed') {
    reason = 'not_payment_success_completed'
  } else if (mappedStatus !== 'paid') {
    reason = `mapped_${mappedStatus}`
  }
  await appendOther(ctx, state, reason, payload)
}
