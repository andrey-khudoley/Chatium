/**
 * Проверки config/routes и config/project (часть юнит-набора шаблона,
 * см. templateUnitSuite.ts). Вынесены в отдельный модуль ради лимита на размер файла.
 */
import {
  getFullUrl,
  PROJECT_ROOT,
  ROUTES,
  ROUTE_PATHS,
  withProjectRoot,
  withProjectRootAndSubroute
} from '../../config/routes'
import {
  ADMIN_PAGE_NAME,
  BODY_SUBTEXT,
  BODY_TEXT,
  DEFAULT_PROJECT_TITLE,
  getHeaderText,
  getPageTitle,
  INDEX_PAGE_NAME,
  PROFILE_PAGE_NAME,
  TESTS_PAGE_NAME
} from '../../config/project'
import { type TemplateUnitTestResult, BASE_EXPECTED, tryPush } from './templateUnitSuiteHelpers'

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

  tryPush(results, 'routes_PROJECT_ROOT_format', 'PROJECT_ROOT format', () => {
    return (
      typeof PROJECT_ROOT === 'string' &&
      PROJECT_ROOT.length > 0 &&
      !PROJECT_ROOT.startsWith('/') &&
      !PROJECT_ROOT.endsWith('/')
    )
  })

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

export function runProjectChecks(results: TemplateUnitTestResult[]): void {
  tryPush(results, 'project_getPageTitle_basic', 'getPageTitle обычные строки', () => {
    return getPageTitle('A', 'B') === 'A - B'
  })
  tryPush(results, 'project_getPageTitle_empty_page', 'getPageTitle пустой pageName', () => {
    return getPageTitle('', 'Proj') === ' - Proj'
  })
  tryPush(results, 'project_getPageTitle_empty_project', 'getPageTitle пустой projectName', () => {
    return getPageTitle('Стр', '') === 'Стр - '
  })
  tryPush(results, 'project_getPageTitle_unicode', 'getPageTitle кириллица/спецсимволы', () => {
    return getPageTitle('Тест «1»', 'Проект_2') === 'Тест «1» - Проект_2'
  })

  tryPush(results, 'project_getHeaderText_basic', 'getHeaderText базовый', () => {
    return getHeaderText('Страница', 'Имя') === 'Имя / Страница'
  })
  tryPush(results, 'project_getHeaderText_empty', 'getHeaderText пустые', () => {
    return getHeaderText('', '') === ' / '
  })
  tryPush(results, 'project_getHeaderText_special', 'getHeaderText спецсимволы', () => {
    return getHeaderText('A&B', 'C<D>') === 'C<D> / A&B'
  })

  tryPush(results, 'project_constants_non_empty', 'константы project не пустые', () => {
    return (
      DEFAULT_PROJECT_TITLE.length > 0 &&
      INDEX_PAGE_NAME.length > 0 &&
      PROFILE_PAGE_NAME.length > 0 &&
      ADMIN_PAGE_NAME.length > 0 &&
      TESTS_PAGE_NAME.length > 0 &&
      BODY_TEXT.length > 0 &&
      BODY_SUBTEXT.length > 0
    )
  })

  tryPush(results, 'project_page_names_distinct', 'имена страниц не совпадают случайно', () => {
    const names = [INDEX_PAGE_NAME, PROFILE_PAGE_NAME, ADMIN_PAGE_NAME, TESTS_PAGE_NAME]
    return new Set(names).size === names.length
  })
}
