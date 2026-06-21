// @shared-route
import { requireAnyUser } from '@app/auth'
import * as loggerLib from '../../../lib/logger.lib'
import * as settingsLib from '../../../lib/settings.lib'
import * as settingsRepo from '../../../repos/settings.repo'

const LOG_PATH = 'api/tests/endpoints-check/settings-repo'
const TEST_KEY = '_test_check_' + Date.now()

type TestResult = { id: string; title: string; passed: boolean; error?: string }

const SETTINGS_REPO_TEST_IDS = ['upsert', 'deleteByKey', 'findByKey', 'findAll'] as const

/**
 * GET /api/tests/endpoints-check/settings-repo — тесты репозитория настроек (по одной проверке на функцию).
 * Опционально: query `testId` — выполнить только указанную проверку.
 */
export const settingsRepoTestRoute = app.get('/', async (ctx, req) => {
  requireAnyUser(ctx)

  const testId = typeof req.query?.testId === 'string' ? req.query.testId : undefined
  if (
    testId &&
    !SETTINGS_REPO_TEST_IDS.includes(testId as (typeof SETTINGS_REPO_TEST_IDS)[number])
  ) {
    return {
      success: false,
      test: 'settings-repo',
      error: `Неизвестный testId: ${testId}`,
      results: [] as TestResult[],
      at: Date.now()
    }
  }
  const shouldRun = (id: string) => !testId || testId === id

  await loggerLib.writeServerLog(ctx, {
    severity: 7,
    message: `[${LOG_PATH}] Запрос проверки settings.repo`,
    payload: testId ? { testId } : {}
  })

  const results: TestResult[] = []

  // Создание до чтения: сначала upsert (создание), затем чтение созданного, затем удаление
  if (shouldRun('upsert')) {
    try {
      await settingsRepo.upsert(ctx, TEST_KEY, 'ok')
      const row = await settingsRepo.findByKey(ctx, TEST_KEY)
      await settingsRepo.deleteByKey(ctx, TEST_KEY)
      results.push({
        id: 'upsert',
        title: 'upsert',
        passed: row !== null && (row as any).value === 'ok'
      })
    } catch (e) {
      try {
        await settingsRepo.deleteByKey(ctx, TEST_KEY)
      } catch (_) {}
      results.push({
        id: 'upsert',
        title: 'upsert',
        passed: false,
        error: (e as Error)?.message ?? String(e)
      })
    }
  }

  if (shouldRun('deleteByKey')) {
    try {
      await settingsRepo.deleteByKey(ctx, '_nonexistent_key_123')
      results.push({
        id: 'deleteByKey',
        title: 'deleteByKey',
        passed: true
      })
    } catch (e) {
      results.push({
        id: 'deleteByKey',
        title: 'deleteByKey',
        passed: false,
        error: (e as Error)?.message ?? String(e)
      })
    }
  }

  if (shouldRun('findByKey')) {
    try {
      await settingsRepo.findByKey(ctx, settingsLib.SETTING_KEYS.PROJECT_NAME)
      results.push({
        id: 'findByKey',
        title: 'findByKey',
        passed: true
      })
    } catch (e) {
      results.push({
        id: 'findByKey',
        title: 'findByKey',
        passed: false,
        error: (e as Error)?.message ?? String(e)
      })
    }
  }

  if (shouldRun('findAll')) {
    try {
      const rows = await settingsRepo.findAll(ctx)
      results.push({
        id: 'findAll',
        title: 'findAll',
        passed: Array.isArray(rows)
      })
    } catch (e) {
      results.push({
        id: 'findAll',
        title: 'findAll',
        passed: false,
        error: (e as Error)?.message ?? String(e)
      })
    }
  }

  return { success: true, test: 'settings-repo', results, at: Date.now() }
})
