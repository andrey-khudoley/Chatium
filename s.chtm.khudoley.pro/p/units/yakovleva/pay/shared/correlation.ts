// @shared
/**
 * Связка request_log ↔ webhook_log по уникальному `correlationId`.
 *
 * Контекст: LifePay в SBP-webhook не возвращает наш `orderNumber`
 * (`order.number = null`, `orderNumber = ""`), поэтому связать входящий webhook
 * с исходным `createBill` по orderNumber невозможно. Решение — генерировать на
 * клиенте уникальный `correlationId`, зашивать его одновременно в `callbackUrl`
 * (query-параметр, доходит до приёмника — webhook приходит с `tokenValid:true`)
 * и в `args` запроса (сервер сохраняет в `request_log`, НЕ пробрасывает в gateway).
 * Приёмник webhook читает `correlationId` из query и пишет в `webhook_log`.
 * Поиск по requestId связывает записи по этому полю.
 *
 * Модуль чистый (без Heap/сети/ctx): используется и на клиенте (Vue), и на
 * сервере (api/gateways), и в юнит-наборе (`lib/tests/lifepayUnitSuite`).
 */

const CORRELATION_PARAM = 'correlationId'

/**
 * Генерирует уникальный correlationId. Предпочтительно `crypto.randomUUID()`
 * (современные браузеры в защищённом контексте). Фоллбэк — на случай отсутствия
 * Web Crypto: связка не должна теряться даже в старом окружении.
 */
export function generateCorrelationId(): string {
  const g = globalThis as { crypto?: { randomUUID?: () => string } }
  if (g.crypto && typeof g.crypto.randomUUID === 'function') {
    return g.crypto.randomUUID()
  }
  return `cid-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`
}

export type CallbackUrlBuild = { url: string; appended: boolean }

/**
 * Добавляет `correlationId` в query `callbackUrl`, сохраняя существующие
 * параметры (в т.ч. `token`). При невалидном URL или пустых аргументах
 * возвращает исходный URL с `appended:false` — без исключений (деградация
 * без потери возможности создать счёт).
 */
export function appendCorrelationId(callbackUrl: string, correlationId: string): CallbackUrlBuild {
  if (!callbackUrl || !correlationId) return { url: callbackUrl, appended: false }
  try {
    const u = new URL(callbackUrl)
    u.searchParams.set(CORRELATION_PARAM, correlationId)
    return { url: u.toString(), appended: true }
  } catch {
    return { url: callbackUrl, appended: false }
  }
}

/**
 * Извлекает непустой `correlationId` из произвольного объекта (args запроса
 * или query webhook). Возвращает `''`, если значения нет или оно не строка.
 */
export function extractCorrelationId(source: unknown): string {
  if (source && typeof source === 'object' && !Array.isArray(source)) {
    const v = (source as Record<string, unknown>)[CORRELATION_PARAM]
    if (typeof v === 'string' && v.trim()) return v.trim()
  }
  return ''
}

/**
 * Объединяет несколько списков webhook-записей, убирая дубли по `id`
 * (первое вхождение побеждает) и сортируя по убыванию `processedAt`
 * (свежие первыми). Нужно при поиске, когда записи находятся одновременно
 * по `orderNumber` и по `correlationId`.
 */
export function mergeWebhooksById<T extends { id: string; processedAt: number }>(
  ...lists: T[][]
): T[] {
  const byId = new Map<string, T>()
  for (const list of lists) {
    for (const item of list) {
      if (!byId.has(item.id)) byId.set(item.id, item)
    }
  }
  return Array.from(byId.values()).sort((a, b) => b.processedAt - a.processedAt)
}
