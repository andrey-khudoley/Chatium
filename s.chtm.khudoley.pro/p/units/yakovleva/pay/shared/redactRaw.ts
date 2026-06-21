// @shared
/**
 * Глубокая (рекурсивная) маскировка PII и удаление секретов для записи
 * сырых payload в журналы (requestLog.rawResponseBody, webhookLog.rawBody/rawQuery).
 *
 * В отличие от `redactArgsForLog` (shared/redact.ts), который обходит только верхний
 * уровень args, эта утилита рекурсивно проходит JSON-дерево произвольной глубины.
 *
 * Контракт:
 *   - Ключи из SECRET_KEYS_DEEP — удаляются полностью (значение не сохраняется ни в каком виде).
 *   - Ключи из PII_KEYS_DEEP:
 *       email-семейство → `redactEmail`,
 *       phone-семейство → `redactPhone`,
 *       прочие (паспорт, ИНН, ФИО, адрес) → `'***'`.
 *   - Массивы — обходятся поэлементно.
 *   - Циклические ссылки / функции / не-JSON-сериализуемые — заменяются на `'__nonSerializable'`.
 *   - Если итоговый JSON > MAX_RAW_BYTES — возвращается обрезанный объект-маркер.
 *
 * Файл синхронизирован с gateway-версией `shared/redactRaw.ts`; при изменении
 * одного обновлять оба (gateway и client — независимые проекты).
 */

import { redactEmail, redactPhone } from './redact'

/** Лимит размера сериализованного payload, байт. */
export const MAX_RAW_BYTES = 64 * 1024

/** Ключи-секреты, которые удаляются на любом уровне вложенности (case-insensitive). */
const SECRET_KEYS_DEEP = new Set<string>([
  'apikey',
  'login',
  'token',
  'lp_apikey',
  'lp_login',
  'lp_webhook_token',
  'authorization',
  'x-lp-apikey',
  'x-lp-login',
  'cookie',
  'set-cookie'
])

/** Ключи персональных данных, значения которых маскируются (case-insensitive). */
const PII_KEYS_DEEP = new Set<string>([
  // email-семейство → redactEmail
  'email',
  'customeremail',
  'useremail',
  // phone-семейство → redactPhone
  'phone',
  'customerphone',
  'userphone',
  'tel',
  // остальное → '***'
  'passport',
  'inn',
  'snils',
  'card',
  'cardnumber',
  'birthday',
  'birthdate',
  'dob',
  'fio',
  'fullname',
  'firstname',
  'lastname',
  'middlename',
  'address'
])

const EMAIL_KEYS = new Set<string>(['email', 'customeremail', 'useremail'])
const PHONE_KEYS = new Set<string>(['phone', 'customerphone', 'userphone', 'tel'])

/**
 * Рекурсивная маскировка с защитой от циклов. Возвращает новое JSON-совместимое
 * значение (объект/массив/строка/число/булево/null) без секретов и с маскированным PII.
 */
function redactValue(value: unknown, seen: WeakSet<object>): unknown {
  if (value === null) return null
  const t = typeof value
  if (t === 'string' || t === 'number' || t === 'boolean') return value
  if (t === 'function' || t === 'symbol' || t === 'undefined' || t === 'bigint') {
    return '__nonSerializable'
  }
  if (typeof value !== 'object') return '__nonSerializable'

  // Защита от циклов.
  if (seen.has(value as object)) return '__circular'
  seen.add(value as object)

  if (Array.isArray(value)) {
    const out: unknown[] = []
    for (const item of value) {
      out.push(redactValue(item, seen))
    }
    return out
  }

  const src = value as Record<string, unknown>
  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(src)) {
    const lk = k.toLowerCase()
    if (SECRET_KEYS_DEEP.has(lk)) continue
    if (PII_KEYS_DEEP.has(lk)) {
      if (EMAIL_KEYS.has(lk)) {
        out[k] = typeof v === 'string' ? redactEmail(v) : '***'
        continue
      }
      if (PHONE_KEYS.has(lk)) {
        out[k] = typeof v === 'string' ? redactPhone(v) : '***'
        continue
      }
      out[k] = typeof v === 'string' || typeof v === 'number' ? '***' : `***(${typeof v})`
      continue
    }
    out[k] = redactValue(v, seen)
  }
  return out
}

/**
 * Глубокая маскировка JSON-payload + усечение по размеру.
 *
 * Возвращает либо отредактированное значение того же типа (объект/массив/...),
 * либо marker-объект `{ __truncated: true, __originalBytes, __preview }`,
 * если итоговый JSON-сериализованный размер > MAX_RAW_BYTES.
 *
 * Для не-объектных входов (null/string/number/...) возвращается отредактированное значение
 * как есть (маскирование возможно только для объектов с ключами).
 */
export function redactRawDeep(value: unknown): unknown {
  const seen = new WeakSet<object>()
  const redacted = redactValue(value, seen)

  let serialized: string
  try {
    serialized = JSON.stringify(redacted)
  } catch {
    // Что-то осталось не-сериализуемым после redactValue — крайне маловероятно.
    return { __truncated: true, __originalBytes: 0, __preview: '<unstringifiable>' }
  }

  if (serialized.length > MAX_RAW_BYTES) {
    // Усечение префиксом строки JSON. Это даёт «человекочитаемый» preview для UI.
    return {
      __truncated: true,
      __originalBytes: serialized.length,
      __preview: serialized.slice(0, MAX_RAW_BYTES)
    }
  }

  return redacted
}
