/**
 * Разбор ответа GC createDeal (сырой ответ GetCourse из data конверта гейтвея).
 * HTTP 200 при ошибке — норма для GC. Успех = body.success && result.success.
 */

export type ParseGcDealsOk = {
  ok: true
  paymentLink: string | undefined
  dealId: string | undefined
  dealNumber: string | undefined
  userId: string | undefined
}

export type ParseGcDealsError = {
  ok: false
  detail: string
  errorMessage: string
}

export type ParseGcDealsResult = ParseGcDealsOk | ParseGcDealsError

export function parseGcDealsResponse(body: unknown): ParseGcDealsResult {
  if (typeof body !== 'object' || body === null) {
    return { ok: false, detail: 'invalid_body', errorMessage: 'Некорректный ответ GC: не объект' }
  }
  const b = body as Record<string, unknown>

  const topOk = b.success === true || b.success === 'true'
  if (!topOk) {
    const detail = `success=${String(b.success)}`
    return {
      ok: false,
      detail,
      errorMessage: `GetCourse вернул success=${String(b.success)}`
    }
  }

  const result = b.result
  if (typeof result !== 'object' || result === null) {
    // top_only: success=true, но result отсутствует
    return {
      ok: false,
      detail: 'top_only',
      errorMessage: 'GetCourse вернул success=true, но result отсутствует'
    }
  }

  const r = result as Record<string, unknown>

  if (r.error === true || r.error === 'true') {
    const msg = r.error_message != null ? String(r.error_message) : 'result.error'
    return { ok: false, detail: msg, errorMessage: msg }
  }

  const innerOk = r.success === true || r.success === 'true'
  if (!innerOk) {
    const msg = r.error_message != null ? String(r.error_message) : 'result.success=false'
    return { ok: false, detail: msg, errorMessage: msg }
  }

  return {
    ok: true,
    paymentLink: typeof r.payment_link === 'string' ? r.payment_link : undefined,
    dealId: r.deal_id != null ? String(r.deal_id) : undefined,
    dealNumber: r.deal_number != null ? String(r.deal_number) : undefined,
    userId: r.user_id != null ? String(r.user_id) : undefined
  }
}
