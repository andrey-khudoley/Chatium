/**
 * Юнит-набор шаблона: синхронные проверки без Heap (вызывается из GET /api/tests/unit).
 *
 * Проверки routes/project вынесены в templateUnitRoutesChecks.ts; хелперы и mock window —
 * в templateUnitSuiteHelpers.ts. Здесь остаются проверки logLevel/logger/каталога и раннер.
 */
import * as loggerLib from '../logger.lib'
import * as settingsLib from '../settings.lib'
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
import {
  type TemplateUnitTestResult,
  tryPush,
  setMockWindow,
  clearMockWindow,
  expectShouldLogForConfig
} from './templateUnitSuiteHelpers'
import { runRoutesChecks, runProjectChecks } from './templateUnitRoutesChecks'

export type { TemplateUnitTestResult } from './templateUnitSuiteHelpers'

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
    'UNIT_TEST_BLOCKS содержит все id прогона шаблонного набора',
    () => {
      const fromRunner = new Set(idsBeforeSyncCheck)
      const fromCatalog = new Set(flattenCatalogBlocks(UNIT_TEST_BLOCKS).map((t) => t.id))
      for (const id of fromRunner) {
        if (!fromCatalog.has(id)) return false
      }
      return true
    }
  )

  return results
}
