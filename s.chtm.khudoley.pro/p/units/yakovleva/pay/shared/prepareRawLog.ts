// @shared
/**
 * Подготовка произвольного JSON-payload к записи в журналы клиента
 * (webhook_log.rawBody/rawQuery, request_log.argsRedacted/rawResponseBody).
 *
 * Только структурная гигиена хранения:
 *   - циклические ссылки → '__circular',
 *   - функции / symbol / bigint / undefined → '__nonSerializable',
 *   - превышение MAX_RAW_BYTES → marker-объект с preview.
 *
 * **PII НЕ маскируется и секреты НЕ удаляются.** Payments Client сам
 * является оператором персональных данных по 152-ФЗ и должен иметь полный
 * доступ к сырым входящим/исходящим данным (email, phone, pan, cardholder,
 * order, purchase[] и т.д.). Маскирующая утилита `shared/redactRaw.redactRawDeep`
 * оставлена в проекте, но в продакшен-пути не используется.
 */

/** Лимит размера сериализованного payload, байт. */
export const MAX_RAW_BYTES = 64 * 1024

function copyValue(value: unknown, seen: WeakSet<object>): unknown {
  if (value === null) return null
  const t = typeof value
  if (t === 'string' || t === 'number' || t === 'boolean') return value
  if (t === 'function' || t === 'symbol' || t === 'undefined' || t === 'bigint') {
    return '__nonSerializable'
  }
  if (typeof value !== 'object') return '__nonSerializable'

  if (seen.has(value as object)) return '__circular'
  seen.add(value as object)

  if (Array.isArray(value)) {
    const out: unknown[] = []
    for (const item of value) {
      out.push(copyValue(item, seen))
    }
    return out
  }

  const src = value as Record<string, unknown>
  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(src)) {
    out[k] = copyValue(v, seen)
  }
  return out
}

/**
 * Подготовить значение к записи в Heap.Any-поле журнала.
 *
 * Возвращает либо исходно-форменное значение (с заменой не-JSON-узлов на
 * маркеры), либо marker-объект `{ __truncated, __originalBytes, __preview }`
 * при превышении `MAX_RAW_BYTES`.
 */
export function prepareRawLog(value: unknown): unknown {
  const seen = new WeakSet<object>()
  const copy = copyValue(value, seen)

  let serialized: string
  try {
    serialized = JSON.stringify(copy)
  } catch {
    return { __truncated: true, __originalBytes: 0, __preview: '<unstringifiable>' }
  }

  if (serialized.length > MAX_RAW_BYTES) {
    return {
      __truncated: true,
      __originalBytes: serialized.length,
      __preview: serialized.slice(0, MAX_RAW_BYTES)
    }
  }

  return copy
}
