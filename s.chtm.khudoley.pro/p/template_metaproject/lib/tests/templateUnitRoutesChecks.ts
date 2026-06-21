/**
 * Юнит-проверки роутинга (config/routes). Часть templateUnitSuite.
 */
import {
  getFullUrl,
  PROJECT_ROOT,
  ROUTES,
  ROUTE_PATHS,
  withProjectRoot,
  withProjectRootAndSubroute
} from '../../config/routes'
import { type TemplateUnitTestResult, tryPush } from './templateUnitSuiteHelpers'

const BASE_EXPECTED = `/${PROJECT_ROOT}`

export function runRoutesChecks(results: TemplateUnitTestResult[]): void {
  const expRoot = `${BASE_EXPECTED}/`
  tryPush(
    results,
    'routes_getFullUrl_dot_slash',
    'getFullUrl("./")',
    () => getFullUrl('./') === expRoot
  )
  tryPush(results, 'routes_getFullUrl_slash', 'getFullUrl("/")', () => getFullUrl('/') === expRoot)
  tryPush(
    results,
    'routes_getFullUrl_web_admin_rel',
    'getFullUrl("./web/admin")',
    () => getFullUrl('./web/admin') === `${BASE_EXPECTED}/web/admin`
  )
  tryPush(
    results,
    'routes_getFullUrl_web_admin_abs',
    'getFullUrl("/web/admin")',
    () => getFullUrl('/web/admin') === `${BASE_EXPECTED}/web/admin`
  )
  tryPush(
    results,
    'routes_getFullUrl_web_admin_bare',
    'getFullUrl("web/admin")',
    () => getFullUrl('web/admin') === `${BASE_EXPECTED}/web/admin`
  )
  tryPush(results, 'routes_getFullUrl_empty', 'getFullUrl("")', () => getFullUrl('') === expRoot)

  tryPush(
    results,
    'routes_withProjectRoot_rel',
    'withProjectRoot("./web/admin")',
    () => withProjectRoot('./web/admin') === `./${PROJECT_ROOT}/web/admin`
  )
  tryPush(
    results,
    'routes_withProjectRoot_bare',
    'withProjectRoot("web/admin")',
    () => withProjectRoot('web/admin') === `./${PROJECT_ROOT}/web/admin`
  )
  tryPush(
    results,
    'routes_withProjectRoot_dot',
    'withProjectRoot("./")',
    () => withProjectRoot('./') === `./${PROJECT_ROOT}/`
  )
  tryPush(
    results,
    'routes_withProjectRoot_empty',
    'withProjectRoot("")',
    () => withProjectRoot('') === `./${PROJECT_ROOT}/`
  )

  tryPush(
    results,
    'routes_subroute_omit',
    'withProjectRootAndSubroute("./web/admin")',
    () => withProjectRootAndSubroute('./web/admin') === `./${PROJECT_ROOT}/web/admin`
  )
  tryPush(
    results,
    'routes_subroute_slash',
    'withProjectRootAndSubroute("./web/admin", "/")',
    () => withProjectRootAndSubroute('./web/admin', '/') === `./${PROJECT_ROOT}/web/admin`
  )
  tryPush(
    results,
    'routes_subroute_edit',
    'withProjectRootAndSubroute("./web/admin", "edit")',
    () => withProjectRootAndSubroute('./web/admin', 'edit') === `./${PROJECT_ROOT}/web/admin~edit`
  )
  tryPush(
    results,
    'routes_subroute_slash_edit',
    'withProjectRootAndSubroute("./web/admin", "/edit")',
    () => withProjectRootAndSubroute('./web/admin', '/edit') === `./${PROJECT_ROOT}/web/admin~edit`
  )
  tryPush(
    results,
    'routes_subroute_nested',
    'withProjectRootAndSubroute("./web/admin", "users/123")',
    () =>
      withProjectRootAndSubroute('./web/admin', 'users/123') ===
      `./${PROJECT_ROOT}/web/admin~users/123`
  )

  tryPush(
    results,
    'routes_PROJECT_ROOT',
    'PROJECT_ROOT',
    () => PROJECT_ROOT === 'p/template_metaproject'
  )

  tryPush(results, 'routes_ROUTES_KEYS_match_PATHS', 'ROUTES vs ROUTE_PATHS keys', () => {
    const a = Object.keys(ROUTES).sort().join(',')
    const b = Object.keys(ROUTE_PATHS).sort().join(',')
    return a === b && a.length > 0
  })

  tryPush(results, 'routes_no_domain_in_urls', 'getFullUrl без домена', () => {
    const u = getFullUrl('./web/tests')
    return !u.includes('://') && u.startsWith('/')
  })

  tryPush(results, 'routes_internal_start_with_dot', 'ROUTES значения с ./', () => {
    for (const v of Object.values(ROUTES)) {
      if (!String(v).startsWith('./')) return false
    }
    return true
  })
}
