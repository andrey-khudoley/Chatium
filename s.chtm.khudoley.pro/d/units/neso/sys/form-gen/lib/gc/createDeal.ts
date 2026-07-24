/**
 * ВОЛНА 1 — временный дубль обвязки Legacy-импорта GetCourse (§5.2, §0.1
 * спеки form-gen). Удаляется в MVP при переходе на getcourse-гейтвей —
 * форма зовёт createDeal через гейтвей (p/gateways/getcourse/api/v1/createDeal.ts),
 * своего GC-клиента у form-gen не остаётся.
 *
 * Источник ссылки на оплату — Legacy-импорт `deals`, `action=add`,
 * `return_payment_link` → `result.payment_link` (§5.2, §5.4 спеки).
 */

import { GC_LEGACY_DEALS_PATH, GC_LEGACY_ACTION } from '../../config/constants'
import { buildLegacyImportFormBody } from './legacyGcFormBody'
import { invokeLegacyGcImportPost } from './legacyGcImportClient'

export type CreateDealProtoResult = { ok: true; redirectUrl: string } | { ok: false; error: string }

/**
 * Создаёт заказ в GC Legacy-импортом и возвращает ссылку на оплату.
 * Сетевые ошибки/таймауты и невалидный ответ GC — перехватываются, наружу
 * НЕ пробрасывается необработанное исключение (дельта 9 плана реализации).
 */
export async function createDealProto(
  ctx: RichUgcCtx,
  input: { host: string; schoolKey: string; paramsPayload: Record<string, unknown> }
): Promise<CreateDealProtoResult> {
  const form = buildLegacyImportFormBody(input.schoolKey, GC_LEGACY_ACTION, input.paramsPayload)

  ctx.account.log('form-gen: gc.request', {
    level: 'debug',
    json: { host: input.host, action: GC_LEGACY_ACTION, path: GC_LEGACY_DEALS_PATH }
  })

  let gc: Awaited<ReturnType<typeof invokeLegacyGcImportPost>>
  try {
    gc = await invokeLegacyGcImportPost({
      host: input.host,
      path: GC_LEGACY_DEALS_PATH,
      form
    })
  } catch (e: unknown) {
    const code = e instanceof Error ? e.message : 'INVOKE_GC_NETWORK_ERROR'
    ctx.account.log('form-gen: gc.error', { level: 'error', json: { code, gcStatus: null } })
    return { ok: false, error: code }
  }

  if (gc.gcStatus !== 200) {
    ctx.account.log('form-gen: gc.response', {
      level: 'debug',
      json: { gcStatus: gc.gcStatus, hasPaymentLink: false }
    })
    const code = `GC_HTTP_${gc.gcStatus}`
    ctx.account.log('form-gen: gc.error', { level: 'error', json: { code, gcStatus: gc.gcStatus } })
    return { ok: false, error: code }
  }

  let parsed: unknown
  try {
    parsed = JSON.parse(gc.gcBodyText)
  } catch {
    ctx.account.log('form-gen: gc.response', {
      level: 'debug',
      json: { gcStatus: gc.gcStatus, hasPaymentLink: false }
    })
    ctx.account.log('form-gen: gc.error', {
      level: 'error',
      json: { code: 'GC_BAD_RESPONSE', gcStatus: gc.gcStatus }
    })
    return { ok: false, error: 'GC_BAD_RESPONSE' }
  }

  const p = (typeof parsed === 'object' && parsed !== null ? parsed : {}) as Record<string, unknown>
  const pResult = (typeof p.result === 'object' && p.result !== null ? p.result : undefined) as
    | Record<string, unknown>
    | undefined

  // GC вернул 200, но импорт отклонён (result.success:false) — например неверный
  // offer_id, невалидные данные. Пробрасываем сообщение GC, чтобы причина была
  // видна в форме, а не маскировалась под GC_NO_PAYMENT_LINK (§5.4).
  if (pResult && pResult.success === false) {
    const gcMsg = typeof pResult.error_message === 'string' ? pResult.error_message : 'unknown'
    ctx.account.log('form-gen: gc.error', {
      level: 'error',
      json: { code: 'GC_DEAL_REJECTED', gcStatus: gc.gcStatus }
    })
    return { ok: false, error: `GC_DEAL_REJECTED: ${gcMsg}` }
  }

  const paymentLink =
    typeof parsed === 'object' && parsed !== null
      ? (parsed as { result?: { payment_link?: unknown } }).result?.payment_link
      : undefined

  const hasPaymentLink = typeof paymentLink === 'string' && paymentLink.length > 0

  ctx.account.log('form-gen: gc.response', {
    level: 'debug',
    json: { gcStatus: gc.gcStatus, hasPaymentLink }
  })

  if (!hasPaymentLink) {
    ctx.account.log('form-gen: gc.error', {
      level: 'error',
      json: { code: 'GC_NO_PAYMENT_LINK', gcStatus: gc.gcStatus }
    })
    return { ok: false, error: 'GC_NO_PAYMENT_LINK' }
  }

  return { ok: true, redirectUrl: paymentLink as string }
}
