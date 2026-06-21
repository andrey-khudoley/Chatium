// @shared-route
import { requireAnyUser } from '@app/auth'
import * as loggerLib from '../../../lib/logger.lib'
import * as logsRepo from '../../../repos/logs.repo'
import Logs from '../../../tables/logs.table'

const LOG_PATH = 'api/tests/endpoints-check/logs-repo'

type TestResult = { id: string; title: string; passed: boolean; error?: string }

/**
 * GET /api/tests/endpoints-check/logs-repo — тесты репозитория логов (по одной проверке на функцию).
 * Создаётся тестовая запись в таблице логов; в конце теста она удаляется.
 */
export const logsRepoTestRoute = app.get('/', async (ctx, req) => {
  requireAnyUser(ctx)

  await loggerLib.writeServerLog(ctx, {
    severity: 7,
    message: `[${LOG_PATH}] Запрос проверки logs.repo`,
    payload: {}
  })

  const results: TestResult[] = []
  let createdLogId: string | null = null

  // Создание до чтения: сначала create, затем все операции чтения
  try {
    const row = await logsRepo.create(ctx, {
      message: `[${LOG_PATH}] Тестовая запись logs.repo`,
      payload: { test: true, at: Date.now() },
      severity: 7,
      level: 'debug',
      timestamp: Date.now()
    })
    if (row?.id) createdLogId = row.id
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

  if (createdLogId) {
    try {
      await Logs.delete(ctx, createdLogId)
    } catch (_) {}
  }

  return { success: true, test: 'logs-repo', results, at: Date.now() }
})
