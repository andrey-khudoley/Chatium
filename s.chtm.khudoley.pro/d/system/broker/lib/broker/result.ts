import { AccessDeniedError } from '@app/errors'
import { writeServerLog } from '../log/logger'

/**
 * Коды ошибок брокера (§5.9.5) — внутренний контракт волны 2, потребители свои;
 * внешняя заморозка — при консолидации §4 (волна 3). 4 pull-кода + 8 реестра/
 * публикации/админ-операций.
 */
export type BrokerErrorCode =
  // pull-API (§5.9.5)
  | 'module_not_active'
  | 'delivery_unavailable'
  | 'invalid_claim_token'
  | 'delivery_not_claimed'
  // реестр/публикация/админ (§5.2–5.5, §5.7, §5.8, §5.9.5 «тот же конверт — у всех операций»)
  | 'module_already_exists'
  | 'invalid_pattern'
  | 'reserved_module_key'
  | 'reserved_namespace'
  | 'payload_too_large'
  | 'publish_not_allowed'
  | 'module_not_found'
  | 'invalid_status'

export type BrokerErrorResult = {
  success: false
  code: BrokerErrorCode
  error: string
  details?: Record<string, unknown>
}

export type BrokerResult<T> = ({ success: true } & T) | BrokerErrorResult

/** Семантическое исключение операции гейтвея — граница операции переводит его в конверт. */
export class BrokerOpError extends Error {
  readonly code: BrokerErrorCode
  readonly details?: Record<string, unknown>

  constructor(code: BrokerErrorCode, message: string, details?: Record<string, unknown>) {
    super(message)
    this.code = code
    this.details = details
  }
}

/** Утверждение: бросает BrokerOpError при ложном условии. Узнаёт cond по ссылке — не оборачивайте в !!. */
export function assertCondition(
  cond: unknown,
  code: BrokerErrorCode,
  message: string,
  details?: Record<string, unknown>
): asserts cond {
  if (!cond) {
    throw new BrokerOpError(code, message, details)
  }
}

/**
 * Граница операции гейтвея (§5.9.5): BrokerOpError → конверт { success: false, ... };
 * AccessDeniedError (аутентификация по токену, §5.1) — единственное исключение,
 * пробрасывается наружу и обрабатывается платформой (403) единообразно со всеми
 * прочими роутами; неожиданное исключение — логируется как error и пробрасывается
 * (не маскируется конвертом — платформа вернёт свою 500, а не наш success:false).
 */
export async function runOperation<T extends Record<string, unknown>>(
  ctx: RichUgcCtx,
  fn: () => Promise<T>
): Promise<BrokerResult<T>> {
  try {
    const result = await fn()
    return { success: true, ...result }
  } catch (e) {
    if (e instanceof AccessDeniedError) throw e
    if (e instanceof BrokerOpError) {
      return { success: false, code: e.code, error: e.message, details: e.details }
    }
    const message = e instanceof Error ? e.message : String(e)
    await writeServerLog(ctx, {
      level: 'error',
      message: `broker: неожиданная ошибка операции гейтвея: ${message}`,
      payload: { stack: e instanceof Error ? e.stack : undefined }
    })
    throw e
  }
}
