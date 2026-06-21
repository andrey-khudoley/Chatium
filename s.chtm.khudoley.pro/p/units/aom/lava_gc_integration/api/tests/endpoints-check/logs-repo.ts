// @shared-route
import { requireAnyUser } from '@app/auth'
import * as loggerLib from '../../../lib/logger.lib'
import * as logsRepo from '../../../repos/logs.repo'

const LOG_PATH = 'api/tests/endpoints-check/logs-repo'

type TestResult = { id: string; title: string; passed: boolean; error?: string }

const LOGS_REPO_TEST_IDS = [
  'create',
  'findAll',
  'findBeforeTimestamp',
  'countErrorsAfter',
  'countWarningsAfter'
] as const

/**
 * GET /api/tests/endpoints-check/logs-repo — тесты репозитория логов (по одной проверке на функцию).
 * Возвращает массив results: один элемент на каждую проверяемую функцию.
 * Опционально: query `testId` — выполнить только указанную проверку.
 */
export const logsRepoTestRoute = app.get('/', async (ctx, req) => {
  requireAnyUser(ctx)

  const testId = typeof req.query?.testId === 'string' ? req.query.testId : undefined
  if (testId && !LOGS_REPO_TEST_IDS.includes(testId as (typeof LOGS_REPO_TEST_IDS)[number])) {
    return {
      success: false,
      test: 'logs-repo',
      error: `Неизвестный testId: ${testId}`,
      results: [] as TestResult[],
      at: Date.now()
    }
  }
  const shouldRun = (id: string) => !testId || testId === id

  await loggerLib.writeServerLog(ctx, {
    severity: 7,
    message: `[${LOG_PATH}] Запрос проверки logs.repo`,
    payload: testId ? { testId } : {}
  })

  const results: TestResult[] = []

  // Создание до чтения: сначала create, затем все операции чтения
  if (shouldRun('create')) {
    try {
      const row = await logsRepo.create(ctx, {
        message: `[${LOG_PATH}] Тестовая запись logs.repo`,
        payload: { test: true, at: Date.now() },
        severity: 7,
        level: 'debug',
        timestamp: Date.now()
      })
      results.push({
        id: 'create',
        title: 'create',
        passed: row != null && typeof (row as any).id === 'string'
      })
    } catch (e) {
      results.push({
        id: 'create',
        title: 'create',
        passed: false,
        error: (e as Error)?.message ?? String(e)
      })
    }
  }

  if (shouldRun('findAll')) {
    try {
      const rows = await logsRepo.findAll(ctx, { limit: 1, offset: 0 })
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

  if (shouldRun('findBeforeTimestamp')) {
    try {
      const before = await logsRepo.findBeforeTimestamp(ctx, Date.now() + 1e10, 1)
      results.push({
        id: 'findBeforeTimestamp',
        title: 'findBeforeTimestamp',
        passed: Array.isArray(before)
      })
    } catch (e) {
      results.push({
        id: 'findBeforeTimestamp',
        title: 'findBeforeTimestamp',
        passed: false,
        error: (e as Error)?.message ?? String(e)
      })
    }
  }

  if (shouldRun('countErrorsAfter')) {
    try {
      const count = await logsRepo.countErrorsAfter(ctx, 0)
      results.push({
        id: 'countErrorsAfter',
        title: 'countErrorsAfter',
        passed: typeof count === 'number' && count >= 0
      })
    } catch (e) {
      results.push({
        id: 'countErrorsAfter',
        title: 'countErrorsAfter',
        passed: false,
        error: (e as Error)?.message ?? String(e)
      })
    }
  }

  if (shouldRun('countWarningsAfter')) {
    try {
      const count = await logsRepo.countWarningsAfter(ctx, 0)
      results.push({
        id: 'countWarningsAfter',
        title: 'countWarningsAfter',
        passed: typeof count === 'number' && count >= 0
      })
    } catch (e) {
      results.push({
        id: 'countWarningsAfter',
        title: 'countWarningsAfter',
        passed: false,
        error: (e as Error)?.message ?? String(e)
      })
    }
  }

  return { success: true, test: 'logs-repo', results, at: Date.now() }
})
