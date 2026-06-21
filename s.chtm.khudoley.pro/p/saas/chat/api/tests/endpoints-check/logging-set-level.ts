// @shared-route
import { requireAccountRole } from '@app/auth'
import * as loggerLib from '../../../lib/logger.lib'
import { apiLoggingSetLevelRoute } from '../../../api/logging/set-level'
import { apiLoggingGetLevelRoute } from '../../../api/logging/get-level'
import { LOG_LEVELS } from '../../../lib/logger-settings.lib'

const LOG_PATH = 'api/tests/endpoints-check/logging-set-level'

type TestResult = { id: string; title: string; passed: boolean; error?: string }

/**
 * GET /api/tests/endpoints-check/logging-set-level — тесты set-level (валидный/невалидный level).
 */
export const loggingSetLevelTestRoute = app.get('/', async (ctx) => {
  requireAccountRole(ctx, 'Admin')

  await loggerLib.writeServerLog(ctx, {
    severity: 7,
    message: `[${LOG_PATH}] Запрос проверки set-level`,
    payload: {}
  })

  const results: TestResult[] = []
  const originalLevel: string = (await apiLoggingGetLevelRoute.run(ctx))?.level ?? 'Info'

  try {
    const resValid = await apiLoggingSetLevelRoute.run(ctx, { level: 'Warn' })
    results.push({
      id: 'set_level_valid',
      title: 'set-level(Warn) success',
      passed: resValid?.success === true && resValid?.level === 'Warn',
      error: resValid?.success === false ? resValid?.error : undefined
    })
  } catch (e) {
    results.push({
      id: 'set_level_valid',
      title: 'set-level(Warn) success',
      passed: false,
      error: (e as Error)?.message ?? String(e)
    })
  }

  try {
    const resInvalid = await apiLoggingSetLevelRoute.run(ctx, { level: 'InvalidLevel' })
    results.push({
      id: 'set_level_invalid',
      title: 'set-level(invalid) returns error',
      passed: resInvalid?.success === false && typeof resInvalid?.error === 'string',
      error: resInvalid?.success === true ? 'Expected success: false' : undefined
    })
  } catch (e) {
    results.push({
      id: 'set_level_invalid',
      title: 'set-level(invalid) returns error',
      passed: false,
      error: (e as Error)?.message ?? String(e)
    })
  }

  try {
    const resWrongType = await apiLoggingSetLevelRoute.run(ctx, { level: 123 as unknown as string })
    const failed =
      resWrongType?.success === false ||
      (LOG_LEVELS as readonly string[]).includes(String(123)) === false
    results.push({
      id: 'set_level_wrong_type',
      title: 'set-level(non-string) rejected or not in LOG_LEVELS',
      passed: failed
    })
  } catch (e) {
    results.push({
      id: 'set_level_wrong_type',
      title: 'set-level(non-string)',
      passed: true,
      error: (e as Error)?.message ?? String(e)
    })
  }

  await apiLoggingSetLevelRoute.run(ctx, { level: originalLevel })

  return { success: true, test: 'logging-set-level', results, at: Date.now() }
})
