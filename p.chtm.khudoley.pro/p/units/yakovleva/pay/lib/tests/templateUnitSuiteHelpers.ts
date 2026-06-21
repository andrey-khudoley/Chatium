/**
 * Общие помощники юнит-набора (вынесены из templateUnitSuite ради лимита размера
 * файла): тип результата, push/tryPush, мок window для shared/logger, матрица shouldLog.
 */
import { PROJECT_ROOT } from '../../config/routes'
import { shouldLog } from '../../shared/logger'

export type TemplateUnitTestResult = { id: string; title: string; passed: boolean; error?: string }

/** Как `BASE_PATH` в config/routes: `/${PROJECT_ROOT}` без лишнего префикса `/p/` */
export const BASE_EXPECTED = `/${PROJECT_ROOT}`

export function push(
  results: TemplateUnitTestResult[],
  id: string,
  title: string,
  passed: boolean,
  error?: string
): void {
  results.push({ id, title, passed, ...(error ? { error } : {}) })
}

export function tryPush(
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

export function setMockWindow(boot?: { logLevel?: unknown }): void {
  const g = globalThis as { window?: { __BOOT__?: { logLevel?: unknown; keep?: string } } }
  g.window = { __BOOT__: { ...(boot !== undefined ? { logLevel: boot.logLevel } : {}), keep: 'x' } }
}

export function clearMockWindow(): void {
  const g = globalThis as { window?: unknown }
  delete g.window
}

/** Матрица shouldLog (клиент shared/logger) при заданном уровне в __BOOT__.logLevel */
export function expectShouldLogForConfig(config: string, expectations: boolean[]): boolean {
  setMockWindow({ logLevel: config })
  for (let s = 0; s <= 7; s++) {
    if (shouldLog(s) !== expectations[s]) {
      return false
    }
  }
  return true
}
