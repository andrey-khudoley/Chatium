// @shared-route
import { requireAnyUser } from '@app/auth'
import * as loggerLib from '../../../lib/logger.lib'
import { getFullUrl, ROUTES } from '../../../config/routes'
import { TESTS_PAGE_NAME, getPageTitle, getHeaderText } from '../../../config/project'

const LOG_PATH = 'api/tests/endpoints-check/config'

/**
 * GET /api/tests/endpoints-check/config — тест слоя config: routes и project.
 * Для авторизованных пользователей.
 */
export const configTestRoute = app.get('/', async (ctx, req) => {
  requireAnyUser(ctx)

  await loggerLib.writeServerLog(ctx, {
    severity: 7,
    message: `[${LOG_PATH}] Запрос проверки config`,
    payload: {}
  })

  const testsUrl = getFullUrl(ROUTES.tests)
  const projectName = 'Test'
  const pageTitle = getPageTitle(TESTS_PAGE_NAME, projectName)
  const headerText = getHeaderText(TESTS_PAGE_NAME, projectName)

  return {
    success: true,
    test: 'config',
    routes: {
      tests: testsUrl,
      index: getFullUrl(ROUTES.index),
      admin: getFullUrl(ROUTES.admin),
      login: getFullUrl(ROUTES.login),
      profile: getFullUrl(ROUTES.profile),
      orders: getFullUrl(ROUTES.orders)
    },
    pageTitle,
    headerText,
    at: Date.now()
  }
})
