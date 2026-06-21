/**
 * Фаза 2 юнит-сьюта LifePay: маскировка PII и удаление секретов.
 *
 *   - runRedactionChecks: redactEmail / redactPhone / redactArgsForLog / extractOrderNumber;
 *   - runRedactRawDeepChecks: redactRawDeep (секреты, PII, усечение,
 *     не-сериализуемые значения, циклы, массивы/примитивы как корень).
 */

import { redactEmail, redactPhone, redactArgsForLog, extractOrderNumber } from '../../shared/redact'
import { redactRawDeep, MAX_RAW_BYTES } from '../../shared/redactRaw'
import { tryPush, type LifepayUnitTestResult } from './lifepayUnitHelpers'

export function runRedactionChecks(results: LifepayUnitTestResult[]): void {
  tryPush(
    results,
    'lp_redact_email',
    'redactEmail("user@example.com") → "u***@e***.com"',
    () => redactEmail('user@example.com') === 'u***@e***.com'
  )

  tryPush(
    results,
    'lp_redact_email_no_at',
    'redactEmail("not-email") → "***"',
    () => redactEmail('not-email') === '***'
  )

  tryPush(
    results,
    'lp_redact_phone',
    'redactPhone("79991234567") → "+7***4567"',
    () => redactPhone('79991234567') === '+7***4567'
  )

  tryPush(
    results,
    'lp_redact_phone_short',
    'redactPhone("12") → "***"',
    () => redactPhone('12') === '***'
  )

  tryPush(
    results,
    'lp_invoke_redact_email_in_args',
    'redactArgsForLog маскирует customerEmail',
    () => {
      const r = redactArgsForLog({
        orderNumber: 'A1',
        amount: 1.0,
        customerEmail: 'tester@khudoley.pro'
      })
      return r.customerEmail === 't***@k***.pro' && r.orderNumber === 'A1' && r.amount === 1.0
    }
  )

  tryPush(
    results,
    'lp_invoke_redact_phone_in_args',
    'redactArgsForLog маскирует customerPhone',
    () => {
      const r = redactArgsForLog({ customerPhone: '79991234567' })
      return r.customerPhone === '+7***4567'
    }
  )

  tryPush(
    results,
    'lp_invoke_no_secrets_in_args_redacted',
    'redactArgsForLog удаляет apikey/login/token',
    () => {
      const r = redactArgsForLog({
        apikey: 'SECRET',
        login: '79991234567',
        token: 'WEBHOOK_SECRET',
        orderNumber: 'A2'
      }) as Record<string, unknown>
      return !('apikey' in r) && !('login' in r) && !('token' in r) && r.orderNumber === 'A2'
    }
  )

  tryPush(
    results,
    'lp_extract_order_number',
    'extractOrderNumber возвращает строку из args',
    () =>
      extractOrderNumber({ orderNumber: 'A3' }) === 'A3' &&
      extractOrderNumber({ orderNumber: 42 }) === '' &&
      extractOrderNumber(null) === ''
  )
}

export function runRedactRawDeepChecks(results: LifepayUnitTestResult[]): void {
  // 1. Удаление секретов на любом уровне.
  tryPush(
    results,
    'lp_redactraw_secrets_top',
    'redactRawDeep удаляет apikey/login/token на верхнем уровне',
    () => {
      const r = redactRawDeep({
        apikey: 'SECRET',
        login: 'LOGIN',
        token: 'TOK',
        lp_apikey: 'X',
        lp_login: 'Y',
        lp_webhook_token: 'Z',
        keep: 'visible'
      }) as Record<string, unknown>
      return (
        !('apikey' in r) &&
        !('login' in r) &&
        !('token' in r) &&
        !('lp_apikey' in r) &&
        !('lp_login' in r) &&
        !('lp_webhook_token' in r) &&
        r.keep === 'visible'
      )
    }
  )
  tryPush(
    results,
    'lp_redactraw_secrets_nested',
    'redactRawDeep удаляет секреты в вложенных объектах и массивах',
    () => {
      const r = redactRawDeep({
        headers: { authorization: 'Bearer xx', 'X-Lp-Apikey': 'A', other: 'ok' },
        list: [{ apikey: 'S', name: 'n' }]
      }) as Record<string, unknown>
      const h = r.headers as Record<string, unknown>
      const list0 = (r.list as Array<Record<string, unknown>>)[0]
      return (
        !('authorization' in h) &&
        !('X-Lp-Apikey' in h) &&
        h.other === 'ok' &&
        list0 != null &&
        !('apikey' in list0) &&
        list0.name === 'n'
      )
    }
  )

  // 2. Маскирование email/phone (рекурсивно).
  tryPush(
    results,
    'lp_redactraw_email_nested',
    'redactRawDeep маскирует email в customer.email',
    () => {
      const r = redactRawDeep({
        customer: { email: 'user@example.com', phone: '79991234567' }
      }) as Record<string, unknown>
      const c = r.customer as Record<string, unknown>
      return (
        typeof c.email === 'string' &&
        c.email !== 'user@example.com' &&
        typeof c.phone === 'string' &&
        c.phone !== '79991234567'
      )
    }
  )

  // 3. Маскирование прочих PII (passport, inn, fio, address).
  tryPush(
    results,
    'lp_redactraw_pii_other',
    'redactRawDeep маскирует passport/inn/fio/address на ***',
    () => {
      const r = redactRawDeep({
        passport: '1234567890',
        inn: '770101101010',
        fio: 'Иван Иванов',
        address: 'Москва, ул. Ленина 1',
        nested: { fullname: 'Some One' }
      }) as Record<string, unknown>
      const n = r.nested as Record<string, unknown>
      return (
        r.passport === '***' &&
        r.inn === '***' &&
        r.fio === '***' &&
        r.address === '***' &&
        n.fullname === '***'
      )
    }
  )

  // 4. Усечение payload > 64KB.
  tryPush(
    results,
    'lp_redactraw_truncation',
    'redactRawDeep усекает payload > MAX_RAW_BYTES',
    () => {
      const big = { data: 'x'.repeat(MAX_RAW_BYTES + 100) }
      const r = redactRawDeep(big) as Record<string, unknown>
      return (
        r.__truncated === true &&
        typeof r.__originalBytes === 'number' &&
        (r.__originalBytes as number) > MAX_RAW_BYTES &&
        typeof r.__preview === 'string' &&
        (r.__preview as string).length === MAX_RAW_BYTES
      )
    }
  )

  // 5. Не-сериализуемые значения.
  tryPush(
    results,
    'lp_redactraw_non_serializable',
    'redactRawDeep заменяет functions на __nonSerializable',
    () => {
      const r = redactRawDeep({ fn: () => 1, ok: 'v' }) as Record<string, unknown>
      return r.fn === '__nonSerializable' && r.ok === 'v'
    }
  )

  // 6. Циклические ссылки.
  tryPush(results, 'lp_redactraw_circular', 'redactRawDeep ловит циклические ссылки', () => {
    const obj: Record<string, unknown> = { name: 'a' }
    obj.self = obj
    const r = redactRawDeep(obj) as Record<string, unknown>
    return r.name === 'a' && r.self === '__circular'
  })

  // 7. Массивы как корень.
  tryPush(
    results,
    'lp_redactraw_array_root',
    'redactRawDeep корректно обрабатывает массив в корне',
    () => {
      const r = redactRawDeep([{ email: 'a@b.c' }, { passport: '1' }]) as unknown[]
      const r0 = r[0] as Record<string, unknown>
      const r1 = r[1] as Record<string, unknown>
      return (
        Array.isArray(r) &&
        r.length === 2 &&
        typeof r0.email === 'string' &&
        r0.email !== 'a@b.c' &&
        r1.passport === '***'
      )
    }
  )

  // 8. Примитивы как корень — возвращаются как есть.
  tryPush(
    results,
    'lp_redactraw_primitive_root',
    'redactRawDeep возвращает примитивы без изменений',
    () =>
      redactRawDeep('hello') === 'hello' &&
      redactRawDeep(42) === 42 &&
      redactRawDeep(null) === null &&
      redactRawDeep(true) === true
  )
}
