/**
 * Константы внутренней системы прав доступа панели (ADR 0003, implementation-plan §1.11).
 */

/** Срок жизни пригласительной ссылки в днях (§1.11.1, §1.11.3). */
export const INVITE_TTL_DAYS = 7

/** TTL инвайта в миллисекундах (для `expiresAt = issuedAt + INVITE_TTL_MS`). */
export const INVITE_TTL_MS = INVITE_TTL_DAYS * 24 * 60 * 60 * 1000

/** Код ошибки отказа во внутреннем доступе (§1.11.2). */
export const INTERNAL_ACCESS_DENIED = 'INTERNAL_ACCESS_DENIED'

/**
 * Префикс ключа эксклюзивной блокировки при потреблении инвайта
 * (§1.11.3, runWithExclusiveLock). Полный ключ: `<prefix><token>`.
 * Зеркало паттерна из `repos/webhookIdempotency.repo.ts`.
 */
export const INVITE_CONSUME_LOCK_PREFIX = 'yakovleva-pay:invite-consume:'
