// @shared
/**
 * Чистые помощники страницы тестов: типы строк/секций, маппинг каталога тестов в
 * представление, метрики, проверки HTTP-страниц. Без состояния Vue — используются
 * composable useTestSuites и его презентационными компонентами.
 */
import { flattenCatalogBlocks, type TestCatalogBlock, type TestCatalogEntry } from './testCatalog'

export type SuiteRow = { id: string; title: string; passed: boolean; error?: string }

export type RowVisual = {
  id: string
  title: string
  status: 'pending' | 'success' | 'fail'
  badgeText: string
  error?: string
}

export type SuiteSectionTab = 'unit' | 'integration' | 'http'
export type SingleRunGroup = 'unit' | 'integration' | 'http'

export type BlockSectionView = {
  block: TestCatalogBlock
  rollupLabel: string
  rows: { test: TestCatalogEntry; visual: RowVisual }[]
}

export const HTTP_PATH_BY_TEST_ID: Record<string, string> = {
  index: '/',
  'web-admin': '/web/admin',
  'web-profile': '/web/profile',
  'web-login': '/web/login',
  'web-tests': '/web/tests'
}

/** Минимальные фрагменты SSR для проверки. */
export const HTTP_HTML_SNIPPETS: Record<string, string[]> = {
  index: ['window.__BOOT__', 'BPM Web'],
  'web-admin': ['window.__BOOT__', 'Админка'],
  'web-profile': ['window.__BOOT__', 'Профиль'],
  'web-login': ['Вход'],
  'web-tests': ['window.__BOOT__', 'units-aley-bpm-interfaces-web-page']
}

export function httpPagePassed(
  testId: string,
  res: Response,
  html: string
): { ok: boolean; error?: string } {
  if (!res.ok) return { ok: false, error: `HTTP ${res.status}` }
  const finalUrl = res.url || ''
  if (testId === 'web-admin') {
    if (finalUrl.includes('/web/admin')) {
      const ok = html.includes('__BOOT__') && html.includes('Админка')
      return ok ? { ok: true } : { ok: false, error: 'нет SSR админки' }
    }
    const ok = html.includes('Вход') || html.includes('Перенаправление')
    return ok ? { ok: true } : { ok: false, error: 'ожидался редирект на вход' }
  }
  if (testId === 'web-profile') {
    if (finalUrl.includes('/web/profile')) {
      const ok = html.includes('__BOOT__') && html.includes('Профиль')
      return ok ? { ok: true } : { ok: false, error: 'нет SSR профиля' }
    }
    const ok = html.includes('Вход') || html.includes('login')
    return ok ? { ok: true } : { ok: false, error: 'ожидался редирект на вход' }
  }
  const need = HTTP_HTML_SNIPPETS[testId]
  if (!need?.length) return { ok: true }
  for (const s of need) {
    if (!html.includes(s)) return { ok: false, error: `нет фрагмента: ${s.slice(0, 40)}…` }
  }
  return { ok: true }
}

export function resultById(results: SuiteRow[], id: string): SuiteRow | undefined {
  return results.find((r) => r.id === id)
}

export function upsertTestResults(existing: SuiteRow[], incoming: SuiteRow[]): SuiteRow[] {
  const byId = new Map(existing.map((row) => [row.id, row]))
  for (const row of incoming) byId.set(row.id, row)
  return Array.from(byId.values())
}

export function rowVisual(test: TestCatalogEntry, results: SuiteRow[]): RowVisual {
  const r = resultById(results, test.id)
  if (!r) {
    return { id: test.id, title: test.title, status: 'pending', badgeText: 'ОЖИД' }
  }
  return {
    id: test.id,
    title: test.title,
    status: r.passed ? 'success' : 'fail',
    badgeText: r.passed ? 'OK' : 'FAIL',
    error: r.error
  }
}

export function blockRollup(block: TestCatalogBlock, results: SuiteRow[]) {
  const n = block.tests.length
  let ok = 0
  let fail = 0
  let pend = 0
  for (const t of block.tests) {
    const r = resultById(results, t.id)
    if (!r) pend++
    else if (r.passed) ok++
    else fail++
  }
  let label: string
  if (pend === n) {
    label = 'не запускали'
  } else if (fail > 0) {
    label = `${ok} пройдено, ${fail} с ошибкой${pend ? `, ${pend} без прогона` : ''}`
  } else if (pend > 0) {
    label = `${ok}/${n} пройдено, ${pend} без прогона`
  } else {
    label = `все ${n} пройдены`
  }
  return { ok, fail, pend, n, label }
}

export function metricsFromBlocks(blocks: TestCatalogBlock[], results: SuiteRow[]) {
  const total = flattenCatalogBlocks(blocks).length
  let passed = 0
  let failed = 0
  for (const t of flattenCatalogBlocks(blocks)) {
    const r = resultById(results, t.id)
    if (!r) continue
    if (r.passed) passed++
    else failed++
  }
  const skipped = total - passed - failed
  return { total, passed, failed, skipped }
}

export function summarizeRows(rows: SuiteRow[]) {
  const passed = rows.filter((r) => r.passed).length
  return { total: rows.length, passed, failed: rows.length - passed, todo: 0 }
}

export function mapBlocksToView(
  blocks: TestCatalogBlock[],
  results: SuiteRow[]
): BlockSectionView[] {
  return blocks.map((block) => ({
    block,
    rollupLabel: blockRollup(block, results).label,
    rows: block.tests.map((test) => ({
      test,
      visual: rowVisual(test, results)
    }))
  }))
}
