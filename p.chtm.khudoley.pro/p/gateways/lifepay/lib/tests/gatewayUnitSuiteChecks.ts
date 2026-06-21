/**
 * Проверки маскировки секретов (maskLpLogin), redactRawDeep и синхронизации каталога
 * (часть юнит-набора `lib/gateway/`, см. gatewayUnitSuite.ts). Вынесены в отдельный
 * модуль ради лимита на размер файла; набор проверок не меняется.
 */

import { maskLpLogin } from '../gateway/lpCredentials'
import { UNIT_TEST_BLOCKS, flattenCatalogBlocks } from '../../shared/testCatalog'
import { redactRawDeep, MAX_RAW_BYTES } from '../../shared/redactRaw'
import { type GatewayUnitTestResult, GATEWAY_BLOCK_ID, tryPush } from './gatewayUnitSuiteHelpers'

export function runCredentialsMaskingChecks(results: GatewayUnitTestResult[]): void {
  tryPush(
    results,
    'gw_credentials_not_in_log_payload',
    'maskLpLogin / apikeyLength: секреты не попадают в сериализованный payload лога',
    () => {
      const login = '79161234567'
      const apikey = 'super_secret_apikey_value_long_string'

      const masked = maskLpLogin(login)
      if (masked === login) return false
      if (masked.includes(login)) return false

      const payload: Record<string, unknown> = {
        requestId: 'rid-1',
        op: 'getBillStatus',
        contour: 'bills_v1',
        method: 'GET',
        loginMask: masked,
        apikeyLength: apikey.length
      }
      const serialized = JSON.stringify(payload)
      if (serialized.includes(login)) return false
      if (serialized.includes(apikey)) return false

      const tampered: Record<string, unknown> = { ...payload, apikey, login }
      const tamperedSerialized = JSON.stringify(tampered)
      if (!tamperedSerialized.includes(login)) return false
      if (!tamperedSerialized.includes(apikey)) return false
      return true
    }
  )

  tryPush(results, 'gw_masked_login_short_form', 'maskLpLogin: некорректная длина → +7***', () => {
    if (maskLpLogin('123') !== '+7***') return false
    if (maskLpLogin('') !== '+7***') return false
    const masked = maskLpLogin('79161234567')
    if (!masked.startsWith('+')) return false
    if (!masked.includes('***')) return false
    return true
  })
}

export function runRedactRawDeepChecks(results: GatewayUnitTestResult[]): void {
  tryPush(
    results,
    'gw_redactraw_secrets_top',
    'redactRawDeep удаляет apikey/login/token на верхнем уровне',
    () => {
      const r = redactRawDeep({
        apikey: 'A',
        login: 'L',
        token: 'T',
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
    'gw_redactraw_headers_secrets',
    'redactRawDeep удаляет Authorization / X-Lp-* / Cookie',
    () => {
      const r = redactRawDeep({
        headers: {
          authorization: 'Bearer xx',
          'X-Lp-Apikey': 'A',
          'X-Lp-Login': 'L',
          cookie: 'c=1',
          other: 'ok'
        }
      }) as Record<string, unknown>
      const h = r.headers as Record<string, unknown>
      return (
        !('authorization' in h) &&
        !('X-Lp-Apikey' in h) &&
        !('X-Lp-Login' in h) &&
        !('cookie' in h) &&
        h.other === 'ok'
      )
    }
  )
  tryPush(
    results,
    'gw_redactraw_pii_nested',
    'redactRawDeep маскирует email/phone/passport во вложенных объектах',
    () => {
      const r = redactRawDeep({
        customer: { email: 'a@b.com', phone: '79991234567', passport: '4500123456' },
        data: { '1': { fio: 'X', address: 'Y' } }
      }) as Record<string, unknown>
      const c = r.customer as Record<string, unknown>
      const d = r.data as Record<string, unknown>
      const d1 = d['1'] as Record<string, unknown>
      return (
        typeof c.email === 'string' &&
        c.email !== 'a@b.com' &&
        typeof c.phone === 'string' &&
        c.phone !== '79991234567' &&
        c.passport === '***' &&
        d1.fio === '***' &&
        d1.address === '***'
      )
    }
  )
  tryPush(
    results,
    'gw_redactraw_truncation',
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
  tryPush(results, 'gw_redactraw_circular', 'redactRawDeep заменяет цикл на __circular', () => {
    const obj: Record<string, unknown> = { a: 1 }
    obj.self = obj
    const r = redactRawDeep(obj) as Record<string, unknown>
    return r.a === 1 && r.self === '__circular'
  })
  tryPush(
    results,
    'gw_redactraw_function_nonserializable',
    'redactRawDeep заменяет function на __nonSerializable',
    () => {
      const r = redactRawDeep({ fn: () => 1, ok: 'v' }) as Record<string, unknown>
      return r.fn === '__nonSerializable' && r.ok === 'v'
    }
  )
  tryPush(
    results,
    'gw_redactraw_array_root',
    'redactRawDeep корректно обрабатывает массив-корень',
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
  tryPush(
    results,
    'gw_redactraw_primitive_root',
    'redactRawDeep возвращает примитивы как есть',
    () =>
      redactRawDeep('hello') === 'hello' &&
      redactRawDeep(42) === 42 &&
      redactRawDeep(null) === null &&
      redactRawDeep(true) === true
  )
}

export function runGatewayCatalogSyncCheck(
  results: GatewayUnitTestResult[],
  idsBefore: ReadonlyArray<string>
): void {
  tryPush(
    results,
    'catalog_gateway_ids_match_runner',
    'unit-gateway: каталог содержит все id прогона gateway-набора',
    () => {
      const block = UNIT_TEST_BLOCKS.find((b) => b.id === GATEWAY_BLOCK_ID)
      if (!block) return false
      const fromRunner = new Set(idsBefore)
      const fromCatalog = new Set(flattenCatalogBlocks([block]).map((t) => t.id))
      for (const id of fromRunner) {
        if (!fromCatalog.has(id)) return false
      }
      return true
    }
  )
}
