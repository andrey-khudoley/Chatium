// @shared-route
import { requireAnyUser } from '@app/auth'
import * as loggerLib from '../../../lib/logger.lib'
import { computeFingerprint } from '../../../lib/core/fingerprint'

const LOG_PATH = 'api/tests/endpoints-check/fingerprint'

type TestResult = { id: string; title: string; passed: boolean; error?: string }

/** Мок req с заголовками для тестов */
function mockReq(headers: Record<string, string>): app.Req {
  return { headers } as app.Req
}

const BASE36_REGEX = /^[a-z0-9]+$/

/**
 * GET /api/tests/endpoints-check/fingerprint — тесты lib/core/fingerprint (computeFingerprint).
 */
export const fingerprintTestRoute = app.get('/', async (ctx, req) => {
  requireAnyUser(ctx)

  await loggerLib.writeServerLog(ctx, {
    severity: 7,
    message: `[${LOG_PATH}] Запрос проверки fingerprint`,
    payload: {}
  })

  const results: TestResult[] = []

  try {
    const r = mockReq({
      'x-forwarded-for': '192.168.1.1',
      'user-agent': 'Mozilla/5.0 Test',
      'accept-language': 'ru-RU,ru;q=0.9'
    })
    const out = computeFingerprint(r)
    const hasHash = typeof out.hash === 'string' && out.hash.length > 0
    const hashBase36 = BASE36_REGEX.test(out.hash)
    const partsOk =
      out.parts.ip === '192.168.1.1' &&
      out.parts.userAgent === 'mozilla/5.0 test' &&
      out.parts.acceptLanguage === 'ru-ru,ru;q=0.9'
    results.push({
      id: 'computeFingerprint-basic',
      title: 'computeFingerprint — hash и parts по заголовкам (нормализация lowercase)',
      passed: hasHash && hashBase36 && partsOk
    })
    if (!results[results.length - 1].passed) {
      results[results.length - 1].error = hasHash
        ? partsOk
          ? 'hash не base36'
          : 'parts не совпадают'
        : 'hash пустой'
    }
  } catch (e) {
    results.push({
      id: 'computeFingerprint-basic',
      title: 'computeFingerprint — hash и parts по заголовкам',
      passed: false,
      error: (e as Error)?.message ?? String(e)
    })
  }

  try {
    const r = mockReq({
      'x-forwarded-for': '10.0.0.1, 10.0.0.2',
      'user-agent': 'Bot',
      'accept-language': 'en'
    })
    const out = computeFingerprint(r)
    const firstIp = out.parts.ip === '10.0.0.1'
    results.push({
      id: 'computeFingerprint-x-forwarded-for-first',
      title: 'X-Forwarded-For только приватные — берётся первый валидный',
      passed: firstIp
    })
    if (!firstIp) {
      results[results.length - 1].error = `Ожидалось 10.0.0.1, получено: ${out.parts.ip}`
    }
  } catch (e) {
    results.push({
      id: 'computeFingerprint-x-forwarded-for-first',
      title: 'IP из X-Forwarded-For — берётся первый адрес',
      passed: false,
      error: (e as Error)?.message ?? String(e)
    })
  }

  try {
    const r = mockReq({
      'x-forwarded-for': '10.0.0.1, 203.0.113.50',
      'user-agent': 'Test',
      'accept-language': 'en'
    })
    const out = computeFingerprint(r)
    const preferPublic = out.parts.ip === '203.0.113.50'
    results.push({
      id: 'computeFingerprint-x-forwarded-for-prefer-public',
      title: 'X-Forwarded-For: при наличии публичного IP берётся он',
      passed: preferPublic
    })
    if (!preferPublic) {
      results[results.length - 1].error = `Ожидалось 203.0.113.50, получено: ${out.parts.ip}`
    }
  } catch (e) {
    results.push({
      id: 'computeFingerprint-x-forwarded-for-prefer-public',
      title: 'X-Forwarded-For: при наличии публичного IP берётся он',
      passed: false,
      error: (e as Error)?.message ?? String(e)
    })
  }

  try {
    const r = mockReq({
      'x-real-ip': '172.16.0.1',
      'user-agent': '',
      'accept-language': ''
    })
    const out = computeFingerprint(r)
    const ipOk = out.parts.ip === '172.16.0.1'
    results.push({
      id: 'computeFingerprint-x-real-ip',
      title: 'IP из X-Real-IP при отсутствии X-Forwarded-For',
      passed: ipOk
    })
    if (!ipOk) {
      results[results.length - 1].error = `Ожидалось 172.16.0.1, получено: ${out.parts.ip}`
    }
  } catch (e) {
    results.push({
      id: 'computeFingerprint-x-real-ip',
      title: 'IP из X-Real-IP при отсутствии X-Forwarded-For',
      passed: false,
      error: (e as Error)?.message ?? String(e)
    })
  }

  try {
    const r = mockReq({})
    const out = computeFingerprint(r)
    const unknownOk =
      out.parts.ip === 'unknown' && out.parts.userAgent === '' && out.parts.acceptLanguage === ''
    results.push({
      id: 'computeFingerprint-empty-headers',
      title: 'Пустые заголовки — ip unknown, строки пустые',
      passed: unknownOk
    })
    if (!unknownOk) {
      results[results.length - 1].error =
        `ip=${out.parts.ip}, ua=${out.parts.userAgent}, lang=${out.parts.acceptLanguage}`
    }
  } catch (e) {
    results.push({
      id: 'computeFingerprint-empty-headers',
      title: 'Пустые заголовки — ip unknown, строки пустые',
      passed: false,
      error: (e as Error)?.message ?? String(e)
    })
  }

  try {
    const r = mockReq({
      'user-agent': 'Same',
      'accept-language': 'en',
      'x-real-ip': '1.2.3.4'
    })
    const a = computeFingerprint(r)
    const b = computeFingerprint(r)
    const deterministic = a.hash === b.hash
    results.push({
      id: 'computeFingerprint-deterministic',
      title: 'Один и тот же запрос — один и тот же hash (детерминированность)',
      passed: deterministic
    })
    if (!deterministic) {
      results[results.length - 1].error = `hash1=${a.hash}, hash2=${b.hash}`
    }
  } catch (e) {
    results.push({
      id: 'computeFingerprint-deterministic',
      title: 'Один и тот же запрос — один и тот же hash',
      passed: false,
      error: (e as Error)?.message ?? String(e)
    })
  }

  try {
    const r = mockReq({
      'user-agent': 'Ua',
      'accept-language': 'de',
      'sec-ch-ua-platform': 'Windows',
      'sec-ch-timezone': 'Europe/Moscow',
      'x-real-ip': '127.0.0.1'
    })
    const out = computeFingerprint(r)
    const optionalOk = out.parts.platform === 'windows' && out.parts.timezone === 'Europe/Moscow'
    results.push({
      id: 'computeFingerprint-optional-fields',
      title: 'Опциональные поля platform (нормализация) и timezone',
      passed: optionalOk
    })
    if (!optionalOk) {
      results[results.length - 1].error =
        `platform=${out.parts.platform}, timezone=${out.parts.timezone}`
    }
  } catch (e) {
    results.push({
      id: 'computeFingerprint-optional-fields',
      title: 'Опциональные поля platform и timezone',
      passed: false,
      error: (e as Error)?.message ?? String(e)
    })
  }

  return { success: true, test: 'fingerprint', results, at: Date.now() }
})
