// @shared
/**
 * Типы запроса/ответа клиентской прокладки `POST /api/gateways/invoke`.
 * Смысл роута — универсальная диспетчеризация к payments-gateway,
 * см. `docs/architecture.md`.
 *
 * С версии 2026-05-28 проект поддерживает несколько платёжных гейтвеев. Тело
 * запроса обязано содержать `gatewayId` — идентификатор upstream-гейтвея,
 * к которому маршрутизируется операция.
 */

/** Идентификаторы поддерживаемых платёжных гейтвеев. */
export const SUPPORTED_GATEWAYS = ['lifepay', 'lavatop', 'gc'] as const
export type GatewayId = (typeof SUPPORTED_GATEWAYS)[number]

export function isGatewayId(value: unknown): value is GatewayId {
  return typeof value === 'string' && (SUPPORTED_GATEWAYS as readonly string[]).includes(value)
}

/**
 * Валидатор имени операции GC. Каталог GC динамический (приходит с
 * `GET /v1/operations`), поэтому в `api/gateways/invoke.ts` для `gatewayId: 'gc'`
 * нельзя сверяться со статическим списком — операцию мы проверяем
 * синтаксически и далее доверяем валидации самого GC-гейтвея.
 */
export function validateGcOpName(op: string): boolean {
  return typeof op === 'string' && /^[a-zA-Z][a-zA-Z0-9]*$/.test(op)
}

export type InvokeRequest = {
  /**
   * Идентификатор upstream-гейтвея. Обязательно. Допустимые значения —
   * `SUPPORTED_GATEWAYS`. При отсутствии или неизвестном значении сервер
   * вернёт 400 (`INVOKE_GATEWAY_REQUIRED` / `INVOKE_GATEWAY_UNKNOWN`).
   */
  gatewayId: GatewayId
  /** Операция в каталоге выбранного гейтвея. */
  op: string
  /** Аргументы операции (зависят от пары gatewayId+op). */
  args: Record<string, unknown>
  /**
   * HTTP-метод upstream-запроса. Обязателен для `gatewayId: 'gc'`
   * (динамический каталог не известен на сервере прокладки). Для остальных
   * гейтвеев игнорируется — метод берётся из локального каталога.
   */
  httpMethod?: 'GET' | 'POST'
}

export type GatewayWarning = { code: string; message: string }

export type LpInvokeResponseOk = {
  ok: true
  data: unknown
  requestId: string
  warnings?: GatewayWarning[]
}

export type GatewayErrorBody = {
  code: string
  message: string
  details?: Record<string, unknown>
}

export type LpInvokeResponseError = {
  ok: false
  error: GatewayErrorBody
  requestId: string | null
}

export type LpInvokeResponse = LpInvokeResponseOk | LpInvokeResponseError

/** Локальные коды ошибок прокладки (не от gateway, а от самого invoke-роута). */
export const INVOKE_PROXY_ERROR_CODES = {
  SETTINGS_MISSING: 'INVOKE_SETTINGS_MISSING',
  OP_UNKNOWN: 'INVOKE_OP_UNKNOWN',
  BODY_INVALID: 'INVOKE_PROXY_BODY_INVALID',
  /** В payload отсутствует поле `gatewayId`. */
  GATEWAY_REQUIRED: 'INVOKE_GATEWAY_REQUIRED',
  /** `gatewayId` указан, но не входит в `SUPPORTED_GATEWAYS`. */
  GATEWAY_UNKNOWN: 'INVOKE_GATEWAY_UNKNOWN'
} as const
