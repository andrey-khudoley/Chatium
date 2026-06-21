/**
 * Юнит-набор шаблона: синхронные проверки без Heap (вызывается из GET /api/tests/unit).
 */
import * as loggerLib from '../logger.lib'
import * as settingsLib from '../settings.lib'
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
import { getLogLevelScript } from '../../shared/logLevel'
import {
  createComponentLogger,
  logWarn,
  logWarning,
  setLogSink,
  shouldLog,
  logError,
  logInfo
} from '../../shared/logger'
import {
  INTEGRATION_HTTP_TEST_BLOCK,
  INTEGRATION_SERVER_TEST_BLOCKS,
  UNIT_TEST_BLOCKS,
  flattenCatalogBlocks
} from '../../shared/testCatalog'

export type TemplateUnitTestResult = { id: string; title: string; passed: boolean; error?: string }

/** Как `BASE_PATH` в config/routes: `/${PROJECT_ROOT}` без лишнего префикса `/p/` */
const BASE_EXPECTED = `/${PROJECT_ROOT}`

function push(
  results: TemplateUnitTestResult[],
  id: string,
  title: string,
  passed: boolean,
  error?: string
): void {
  results.push({ id, title, passed, ...(error ? { error } : {}) })
}

function tryPush(
  results: TemplateUnitTestResult[],
  id: string,
  title: string,
  fn: () => boolean
): void {
  try {
    push(results, id, title, fn())
  } catch (e) {
    push(results, id, title, false, (e as Error)?.message ?? String(e))
  }
}

function setMockWindow(boot?: { logLevel?: unknown }): void {
  const g = globalThis as { window?: { __BOOT__?: { logLevel?: unknown; keep?: string } } }
  g.window = { __BOOT__: { ...(boot !== undefined ? { logLevel: boot.logLevel } : {}), keep: 'x' } }
}

function clearMockWindow(): void {
  const g = globalThis as { window?: unknown }
  delete g.window
}

/** Матрица shouldLog (клиент shared/logger) при заданном уровне в __BOOT__.logLevel */
function expectShouldLogForConfig(config: string, expectations: boolean[]): boolean {
  setMockWindow({ logLevel: config })
  for (let s = 0; s <= 7; s++) {
    if (shouldLog(s) !== expectations[s]) {
      return false
    }
  }
  return true
}

function runRoutesChecks(results: TemplateUnitTestResult[]): void {
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
    () => PROJECT_ROOT === 'p/units/chatiumclub/client1'
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

function runProjectChecks(results: TemplateUnitTestResult[]): void {
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

function runLogLevelScriptChecks(results: TemplateUnitTestResult[]): void {
  for (const level of settingsLib.LOG_LEVELS) {
    tryPush(results, `logLevel_script_${level}`, `getLogLevelScript(${level})`, () => {
      const s = getLogLevelScript(level as settingsLib.LogLevel)
      return (
        s.includes('window.__BOOT__=window.__BOOT__||{}') &&
        s.includes('window.__BOOT__.logLevel=') &&
        s.includes(JSON.stringify(level)) &&
        !/[\n\r]/.test(s)
      )
    })
  }

  tryPush(
    results,
    'logLevel_script_preserves_boot',
    'getLogLevelScript не затирает __BOOT__',
    () => {
      const s = getLogLevelScript('Info')
      return s.includes('window.__BOOT__||{}') && s.includes('.logLevel=')
    }
  )
}

function runLoggerLibPureChecks(results: TemplateUnitTestResult[]): void {
  tryPush(results, 'loggerLib_getAdminLogsSocketId_format', 'getAdminLogsSocketId префикс', () => {
    const id = loggerLib.getAdminLogsSocketId({} as app.Ctx)
    return typeof id === 'string' && id.startsWith('admin-logs-')
  })
  tryPush(results, 'loggerLib_getAdminLogsSocketId_stable', 'getAdminLogsSocketId стабилен', () => {
    return (
      loggerLib.getAdminLogsSocketId({} as app.Ctx) ===
      loggerLib.getAdminLogsSocketId({} as app.Ctx)
    )
  })

  const lvl = settingsLib.LOG_LEVELS
  const matrix: [settingsLib.LogLevel, number, boolean][] = []
  for (const L of lvl) {
    for (let sev = 0; sev <= 7; sev++) {
      matrix.push([L, sev, loggerLib.shouldLogByLevel(L, sev)])
    }
  }
  tryPush(results, 'loggerLib_shouldLogByLevel_matrix', 'shouldLogByLevel полная матрица', () => {
    for (const [L, sev, got] of matrix) {
      const max = L === 'Disable' ? -1 : L === 'Error' ? 3 : L === 'Warn' ? 4 : L === 'Info' ? 6 : 7
      const want = max >= 0 && sev >= 0 && sev <= max
      if (got !== want) return false
    }
    return true
  })
}

function runSharedLoggerChecks(results: TemplateUnitTestResult[]): void {
  // Disable: всё false
  tryPush(results, 'shared_shouldLog_Disable_all', 'shouldLog Disable 0..7 false', () => {
    setMockWindow({ logLevel: 'Disable' })
    for (let s = 0; s <= 7; s++) {
      if (shouldLog(s)) return false
    }
    return true
  })

  // Error: 0-3 true, 4-7 false
  tryPush(results, 'shared_shouldLog_Error', 'shouldLog Error матрица', () =>
    expectShouldLogForConfig('Error', [true, true, true, true, false, false, false, false])
  )
  tryPush(results, 'shared_shouldLog_Warn', 'shouldLog Warn матрица', () =>
    expectShouldLogForConfig('Warn', [true, true, true, true, true, false, false, false])
  )
  tryPush(results, 'shared_shouldLog_Info', 'shouldLog Info матрица', () =>
    expectShouldLogForConfig('Info', [true, true, true, true, true, true, true, false])
  )
  tryPush(results, 'shared_shouldLog_Debug', 'shouldLog Debug матрица', () =>
    expectShouldLogForConfig('Debug', [true, true, true, true, true, true, true, true])
  )

  tryPush(results, 'shared_shouldLog_no_window', 'shouldLog без window → Info', () => {
    clearMockWindow()
    return shouldLog(7) === false && shouldLog(6) === true
  })

  tryPush(results, 'shared_shouldLog_invalid_numeric', 'shouldLog logLevel -1', () => {
    setMockWindow({ logLevel: -1 })
    return !shouldLog(0)
  })

  tryPush(results, 'shared_shouldLog_invalid_string', 'shouldLog мусор в logLevel', () => {
    setMockWindow({ logLevel: 'InvalidValue' })
    return shouldLog(6) === true && shouldLog(7) === false
  })

  clearMockWindow()

  tryPush(results, 'shared_setLogSink_roundtrip', 'setLogSink и сброс', () => {
    const seen: unknown[][] = []
    setLogSink((e) => {
      seen.push(e.args)
    })
    logInfo('a', 'b')
    setLogSink(null)
    logInfo('after')
    return seen.length >= 1
  })

  tryPush(results, 'shared_setLogSink_throw_keeps_console', 'sink throw не ломает console', () => {
    setMockWindow({ logLevel: 'Debug' })
    setLogSink(() => {
      throw new Error('sink')
    })
    let ok = false
    try {
      logError('x')
      ok = true
    } catch {
      ok = false
    }
    setLogSink(null)
    clearMockWindow()
    return ok
  })

  tryPush(results, 'shared_componentLogger_prefix', 'createComponentLogger префикс', () => {
    setMockWindow({ logLevel: 'Debug' })
    const logs: unknown[][] = []
    setLogSink((e) => logs.push(e.args))
    const L = createComponentLogger('MyCmp')
    L.error('e')
    setLogSink(null)
    clearMockWindow()
    return logs.some((a) => a[0] === '[MyCmp]' && a[1] === 'e')
  })

  tryPush(results, 'shared_logWarn_alias', 'logWarn === logWarning', () => logWarn === logWarning)
}

function runCatalogIntegrityChecks(results: TemplateUnitTestResult[]): void {
  tryPush(results, 'catalog_block_ids_unique', 'id блоков уникальны', () => {
    const ids = [
      ...UNIT_TEST_BLOCKS,
      ...INTEGRATION_SERVER_TEST_BLOCKS,
      INTEGRATION_HTTP_TEST_BLOCK
    ].map((b) => b.id)
    return new Set(ids).size === ids.length
  })

  tryPush(results, 'catalog_test_ids_unique', 'id тестов уникальны (все категории)', () => {
    const flat = [
      ...flattenCatalogBlocks(UNIT_TEST_BLOCKS),
      ...flattenCatalogBlocks(INTEGRATION_SERVER_TEST_BLOCKS),
      ...flattenCatalogBlocks([INTEGRATION_HTTP_TEST_BLOCK])
    ].map((t) => t.id)
    return new Set(flat).size === flat.length
  })

  tryPush(results, 'catalog_blocks_have_tests', 'каждый блок содержит тест', () => {
    const blocks = [
      ...UNIT_TEST_BLOCKS,
      ...INTEGRATION_SERVER_TEST_BLOCKS,
      INTEGRATION_HTTP_TEST_BLOCK
    ]
    return blocks.every((b) => b.tests.length > 0)
  })

  tryPush(results, 'catalog_flatten_order', 'flattenCatalogBlocks порядок', () => {
    const blocks = UNIT_TEST_BLOCKS.slice(0, 2)
    const f = flattenCatalogBlocks(blocks)
    let i = 0
    for (const b of blocks) {
      for (const t of b.tests) {
        if (f[i]?.id !== t.id) return false
        i++
      }
    }
    return f.length === i
  })
}

export function runTemplateUnitChecks(): TemplateUnitTestResult[] {
  const results: TemplateUnitTestResult[] = []

  runRoutesChecks(results)
  runProjectChecks(results)
  runLogLevelScriptChecks(results)
  runLoggerLibPureChecks(results)
  runSharedLoggerChecks(results)
  runCatalogIntegrityChecks(results)

  const idsBeforeSyncCheck = results.map((r) => r.id)
  tryPush(
    results,
    'catalog_unit_ids_match_runner',
    'UNIT_TEST_BLOCKS содержит все id прогона',
    () => {
      const fromRunner = new Set(idsBeforeSyncCheck)
      const catalogUnitIds = flattenCatalogBlocks(UNIT_TEST_BLOCKS)
        .map((t) => t.id)
        .filter((id) => id !== 'catalog_unit_ids_match_runner')
      const fromCatalog = new Set(catalogUnitIds)
      if (fromRunner.size !== fromCatalog.size) return false
      for (const id of fromCatalog) {
        if (!fromRunner.has(id)) return false
      }
      return true
    }
  )

  return results
}
