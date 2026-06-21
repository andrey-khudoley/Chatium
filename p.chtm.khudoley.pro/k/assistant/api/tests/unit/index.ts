// @shared-route
import { requireAnyUser } from '@app/auth'
import { getFullUrl, PROJECT_ROOT } from '../../../config/routes'
import { getPageTitle, INDEX_PAGE_NAME } from '../../../config/project'
import { getLogLevelScript } from '../../../shared/logLevel'
import * as loggerLib from '../../../lib/logger.lib'

const LOG_PATH = 'api/tests/unit'

export type TemplateUnitTestResult = { id: string; title: string; passed: boolean; error?: string }

/**
 * Синхронные проверки без Heap и сети — базовый минимум как в шаблоне p/template_project.
 */
function runTemplateUnitChecks(): TemplateUnitTestResult[] {
  const results: TemplateUnitTestResult[] = []

  const push = (id: string, title: string, passed: boolean, error?: string) => {
    results.push({ id, title, passed, ...(error ? { error } : {}) })
  }

  try {
    push('shouldLogByLevel_Info_6', 'logger: shouldLogByLevel(Info, 6) === true', loggerLib.shouldLogByLevel('Info', 6) === true)
  } catch (e) {
    push('shouldLogByLevel_Info_6', 'logger: shouldLogByLevel(Info, 6)', false, (e as Error)?.message ?? String(e))
  }

  try {
    push(
      'shouldLogByLevel_Disable_7',
      'logger: shouldLogByLevel(Disable, 7) === false',
      loggerLib.shouldLogByLevel('Disable', 7) === false
    )
  } catch (e) {
    push('shouldLogByLevel_Disable_7', 'logger: shouldLogByLevel(Disable, 7)', false, (e as Error)?.message ?? String(e))
  }

  try {
    const url = getFullUrl('./')
    push('getFullUrl_root', 'routes: getFullUrl("./") содержит PROJECT_ROOT', url.includes(PROJECT_ROOT))
  } catch (e) {
    push('getFullUrl_root', 'routes: getFullUrl("./")', false, (e as Error)?.message ?? String(e))
  }

  try {
    const url = getFullUrl('./web/admin')
    push('getFullUrl_admin', 'routes: getFullUrl("./web/admin") содержит /web/admin', url.includes('/web/admin'))
  } catch (e) {
    push('getFullUrl_admin', 'routes: getFullUrl("./web/admin")', false, (e as Error)?.message ?? String(e))
  }

  try {
    const title = getPageTitle(INDEX_PAGE_NAME, 'TestProject')
    push('getPageTitle', 'project: getPageTitle не пустой', typeof title === 'string' && title.length > 0)
  } catch (e) {
    push('getPageTitle', 'project: getPageTitle', false, (e as Error)?.message ?? String(e))
  }

  try {
    const script = getLogLevelScript('Debug')
    push('getLogLevelScript', 'shared/logLevel: скрипт содержит Debug', script.includes('Debug'))
  } catch (e) {
    push('getLogLevelScript', 'shared/logLevel: getLogLevelScript', false, (e as Error)?.message ?? String(e))
  }

  try {
    const id = loggerLib.getAdminLogsSocketId({} as app.Ctx)
    push(
      'getAdminLogsSocketId_shape',
      'logger: getAdminLogsSocketId — строка admin-logs-*',
      typeof id === 'string' && id.startsWith('admin-logs-')
    )
  } catch (e) {
    push('getAdminLogsSocketId_shape', 'logger: getAdminLogsSocketId', false, (e as Error)?.message ?? String(e))
  }

  return results
}

/**
 * GET /api/tests/unit — юнит-проверки шаблонного минимума (без Heap).
 */
export const templateUnitTestsRoute = app.get('/', async (ctx) => {
  requireAnyUser(ctx)

  await loggerLib.writeServerLog(ctx, {
    severity: 7,
    message: `[${LOG_PATH}] Запуск юнит-набора`,
    payload: {}
  })

  const results = runTemplateUnitChecks()
  const passed = results.filter((r) => r.passed).length
  const failed = results.length - passed

  await loggerLib.writeServerLog(ctx, {
    severity: failed ? 5 : 7,
    message: `[${LOG_PATH}] Юнит-набор завершён`,
    payload: { passed, failed, total: results.length }
  })

  return {
    success: failed === 0,
    kind: 'unit',
    results,
    summary: { passed, failed, total: results.length },
    at: Date.now()
  }
})
