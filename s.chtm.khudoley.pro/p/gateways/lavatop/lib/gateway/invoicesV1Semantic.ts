/**
 * Классификация успешных (HTTP 2xx) ответов Lava.Top и извлечение полезных payload'ов.
 * Возвращает `null`, если тело корректно (успех), либо `InvoicesV1SemanticResult` при
 * семантической ошибке (поля отсутствуют) — тогда handleV1Op вернёт `INVOKE_LP_SEMANTIC_ERROR`.
 *
 * В отличие от LifePay (где признак ошибки — `code !== 0`), Lava.Top использует HTTP-статусы,
 * поэтому семантика проверяет лишь наличие ожидаемых полей в успешном теле.
 */

export type InvoicesV1SemanticRule =
  | 'invoices_v1_missing_contract_id'
  | 'invoices_v1_missing_payment_url'
  | 'invoices_v1_error_response'

export type InvoicesV1SemanticResult = {
  rule: InvoicesV1SemanticRule
}

type LpObject = Record<string, unknown>

function isObject(v: unknown): v is LpObject {
  return typeof v === 'object' && v !== null && !Array.isArray(v)
}

function readString(obj: LpObject | null, key: string): string | undefined {
  if (!obj) return undefined
  const v = obj[key]
  return typeof v === 'string' && v.trim() !== '' ? v : undefined
}

// --- createInvoice (POST /api/v3/invoice → InvoicePaymentParamsResponse) ---

/**
 * Успешный ответ должен содержать `id` (→ contractId) и `paymentUrl`.
 * Lava.Top отдаёт `id`/`contractId` и `paymentUrl`/`payment_url` — учитываем оба варианта.
 */
export function classifyCreateInvoiceResponse(lpJson: unknown): InvoicesV1SemanticResult | null {
  const root = isObject(lpJson) ? lpJson : null
  if (!root) return { rule: 'invoices_v1_error_response' }
  const contractId = readString(root, 'id') ?? readString(root, 'contractId')
  if (!contractId) return { rule: 'invoices_v1_missing_contract_id' }
  const paymentUrl = readString(root, 'paymentUrl') ?? readString(root, 'payment_url')
  if (!paymentUrl) return { rule: 'invoices_v1_missing_payment_url' }
  return null
}

export function extractCreateInvoiceSuccess(
  lpJson: unknown
): { contractId: string; paymentUrl: string; status: string } | null {
  const root = isObject(lpJson) ? lpJson : null
  const contractId = readString(root, 'id') ?? readString(root, 'contractId')
  const paymentUrl = readString(root, 'paymentUrl') ?? readString(root, 'payment_url')
  if (!contractId || !paymentUrl) return null
  const status = readString(root, 'status') ?? ''
  return { contractId, paymentUrl, status }
}

// --- getInvoiceStatus (GET /api/v2/invoices/{id}) ---

/** Минимальная проверка: ответ — объект (статус инвойса). */
export function classifyGetInvoiceStatusResponse(lpJson: unknown): InvoicesV1SemanticResult | null {
  return isObject(lpJson) ? null : { rule: 'invoices_v1_error_response' }
}

export function extractGetInvoiceStatusSuccess(
  lpJson: unknown
): { contractId: string; status: string; raw: unknown } | null {
  const root = isObject(lpJson) ? lpJson : null
  if (!root) return null
  const contractId = readString(root, 'id') ?? readString(root, 'contractId') ?? ''
  const status = readString(root, 'status') ?? ''
  return { contractId, status, raw: lpJson }
}

// --- listProducts (GET /api/v2/products → лента { items, nextPage }) ---

/** Лента продуктов — объект с `items` (массив). Пустой список — не ошибка. */
export function classifyListProductsResponse(lpJson: unknown): InvoicesV1SemanticResult | null {
  if (!isObject(lpJson)) return { rule: 'invoices_v1_error_response' }
  const items = (lpJson as LpObject).items
  if (items !== undefined && !Array.isArray(items)) {
    return { rule: 'invoices_v1_error_response' }
  }
  return null
}

export function extractListProductsSuccess(lpJson: unknown): {
  items: unknown[]
  nextPage: string | null
} {
  const root = isObject(lpJson) ? lpJson : null
  const items = Array.isArray(root?.items) ? (root?.items as unknown[]) : []
  const nextPage = readString(root, 'nextPage') ?? null
  return { items, nextPage }
}

// --- updateOfferPrice (PATCH /api/v2/products/{productId}) ---

/** Lava.Top на успешный PATCH отдаёт 2xx; отдельной семантической проверки тела нет. */
export function classifyUpdateOfferPriceResponse(
  _lpJson: unknown
): InvoicesV1SemanticResult | null {
  return null
}

export function extractUpdateOfferPriceSuccess(lpJson: unknown): { success: true; raw: unknown } {
  return { success: true, raw: lpJson }
}
