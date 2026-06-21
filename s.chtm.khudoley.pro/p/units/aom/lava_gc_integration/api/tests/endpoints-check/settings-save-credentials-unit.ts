// @shared-route
import { requireAnyUser } from '@app/auth'
import { GC_SETTING_KEYS } from '../../../shared/gcSettingKeys'
import { LAVA_SETTING_KEYS } from '../../../shared/lavaSettingKeys'
import * as saveCredsLib from '../../../lib/settings-save-credentials.lib'
import * as loggerLib from '../../../lib/logger.lib'

const LOG_PATH = 'api/tests/endpoints-check/settings-save-credentials-unit'

type TestResult = { id: string; title: string; passed: boolean; error?: string }

const TEST_IDS = [
  'gc_merge_save_key_only',
  'gc_merge_save_domain_only',
  'gc_verify_when_both_nonempty',
  'gc_no_verify_when_one_empty',
  'gc_wrong_key_null',
  'lava_merge_save_key_only',
  'lava_merge_save_url_normalizes_host',
  'lava_verify_when_both_nonempty',
  'lava_no_verify_empty_api_key',
  'lava_wrong_key_null'
] as const

function runAssertions(): TestResult[] {
  const results: TestResult[] = []

  const check = (id: (typeof TEST_IDS)[number], title: string, fn: () => boolean) => {
    try {
      results.push({ id, title, passed: fn() })
    } catch (e) {
      results.push({
        id,
        title,
        passed: false,
        error: (e as Error)?.message ?? String(e)
      })
    }
  }

  check('gc_merge_save_key_only', 'GC: сохраняется только gc_api_key — домен из Heap', () => {
    const r = saveCredsLib.resolveGcCredentialsForSave(
      GC_SETTING_KEYS.GC_API_KEY,
      'new-secret',
      '',
      'school.getcourse.ru'
    )
    return r !== null && r.nextApiKey === 'new-secret' && r.nextDomain === 'school.getcourse.ru'
  })

  check(
    'gc_merge_save_domain_only',
    'GC: сохраняется только gc_account_domain — ключ из Heap',
    () => {
      const r = saveCredsLib.resolveGcCredentialsForSave(
        GC_SETTING_KEYS.GC_ACCOUNT_DOMAIN,
        'other.domain.ru',
        'heap-key',
        ''
      )
      return r !== null && r.nextApiKey === 'heap-key' && r.nextDomain === 'other.domain.ru'
    }
  )

  check('gc_verify_when_both_nonempty', 'GC: shouldVerify=true, если оба поля непусты', () => {
    const r = saveCredsLib.resolveGcCredentialsForSave(GC_SETTING_KEYS.GC_API_KEY, 'k', '', 'd')!
    return saveCredsLib.shouldVerifyCredentialPair(r.nextApiKey, r.nextDomain)
  })

  check('gc_no_verify_when_one_empty', 'GC: shouldVerify=false, если один из пары пустой', () => {
    const r = saveCredsLib.resolveGcCredentialsForSave(
      GC_SETTING_KEYS.GC_API_KEY,
      '',
      '',
      'domain.only'
    )!
    return !saveCredsLib.shouldVerifyCredentialPair(r.nextApiKey, r.nextDomain)
  })

  check('gc_wrong_key_null', 'GC: чужой ключ настройки → null', () => {
    return saveCredsLib.resolveGcCredentialsForSave('project_name', 'x', 'a', 'b') === null
  })

  check(
    'lava_merge_save_key_only',
    'Lava: только lava_api_key — URL из Heap (нормализован)',
    () => {
      const r = saveCredsLib.resolveLavaCredentialsForSave(
        LAVA_SETTING_KEYS.LAVA_API_KEY,
        'token',
        '',
        'gate.lava.top'
      )
      return (
        r !== null && r.nextApiKey === 'token' && r.nextBaseNormalized === 'https://gate.lava.top'
      )
    }
  )

  check(
    'lava_merge_save_url_normalizes_host',
    'Lava: только lava_base_url — нормализация host → https',
    () => {
      const r = saveCredsLib.resolveLavaCredentialsForSave(
        LAVA_SETTING_KEYS.LAVA_BASE_URL,
        'api.lava.example',
        'saved-key',
        ''
      )
      return (
        r !== null &&
        r.nextApiKey === 'saved-key' &&
        r.nextBaseNormalized === 'https://api.lava.example'
      )
    }
  )

  check('lava_verify_when_both_nonempty', 'Lava: shouldVerify при непустом ключе и URL', () => {
    const r = saveCredsLib.resolveLavaCredentialsForSave(
      LAVA_SETTING_KEYS.LAVA_API_KEY,
      'k',
      '',
      'https://gate.lava.top'
    )!
    return saveCredsLib.shouldVerifyCredentialPair(r.nextApiKey, r.nextBaseNormalized)
  })

  check('lava_no_verify_empty_api_key', 'Lava: пустой API-ключ — verify не нужен', () => {
    const r = saveCredsLib.resolveLavaCredentialsForSave(
      LAVA_SETTING_KEYS.LAVA_BASE_URL,
      'gate.lava.top',
      '',
      ''
    )!
    return !saveCredsLib.shouldVerifyCredentialPair(r.nextApiKey, r.nextBaseNormalized)
  })

  check('lava_wrong_key_null', 'Lava: чужой ключ → null', () => {
    return saveCredsLib.resolveLavaCredentialsForSave('log_level', 1, 'a', 'b') === null
  })

  return results
}

/**
 * GET …/settings-save-credentials-unit — юнит-проверки слияния ключей для POST /api/settings/save (без сети и Heap).
 * Query testId — только указанный кейс.
 */
export const settingsSaveCredentialsUnitTestRoute = app.get('/', async (ctx, req) => {
  requireAnyUser(ctx)

  const testId = typeof req.query?.testId === 'string' ? req.query.testId : undefined
  if (testId && !TEST_IDS.includes(testId as (typeof TEST_IDS)[number])) {
    return {
      success: false,
      test: 'settings-save-credentials-unit',
      error: `Неизвестный testId: ${testId}`,
      results: [] as TestResult[],
      at: Date.now()
    }
  }

  await loggerLib.writeServerLog(ctx, {
    severity: 7,
    message: `[${LOG_PATH}] Запуск юнит-тестов слияния ключей`,
    payload: testId ? { testId } : {}
  })

  const all = runAssertions()
  const results = testId ? all.filter((r) => r.id === testId) : all

  const passed = results.length > 0 && results.every((r) => r.passed)
  await loggerLib.writeServerLog(ctx, {
    severity: passed ? 6 : 4,
    message: `[${LOG_PATH}] ${passed ? 'все ок' : 'есть провалы'}`,
    payload: { count: results.length, failed: results.filter((r) => !r.passed).map((r) => r.id) }
  })

  return {
    success: passed,
    test: 'settings-save-credentials-unit',
    results,
    at: Date.now()
  }
})
