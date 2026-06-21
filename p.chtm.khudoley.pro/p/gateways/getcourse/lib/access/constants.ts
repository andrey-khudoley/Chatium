/**
 * Константы внутренней системы прав доступа панели GetCourse Gateway.
 */

/** Срок жизни пригласительной ссылки в днях. */
export const INVITE_TTL_DAYS = 7

/** TTL инвайта в миллисекундах (для `expiresAt = issuedAt + INVITE_TTL_MS`). */
export const INVITE_TTL_MS = INVITE_TTL_DAYS * 24 * 60 * 60 * 1000

/** Код ошибки отказа во внутреннем доступе. */
export const INTERNAL_ACCESS_DENIED = 'INTERNAL_ACCESS_DENIED'

/**
 * Префикс ключа эксклюзивной блокировки при потреблении инвайта
 * (runWithExclusiveLock). Полный ключ: `<prefix><token>`.
 * Уникален для проекта, чтобы не пересекаться с другими приложениями аккаунта.
 */
export const INVITE_CONSUME_LOCK_PREFIX = 'saas-gw-gc:invite-consume:'
