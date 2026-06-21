/**
 * Общие помощники интеграционного набора (вынесены из integrationSuite ради
 * лимита размера файла): тип результата, push/tryAsync, проверка роли admin,
 * email тестового пользователя GetCourse.
 */

/** Email тестового пользователя для интеграции с GetCourse (gateway-testing-strategy §2, implementation-plan §1.3). */
export const GC_INTEGRATION_TESTER_EMAIL = 'tester@khudoley.pro'

export type TemplateIntegrationTestResult = {
  id: string
  title: string
  passed: boolean
  error?: string
}

export function push(
  results: TemplateIntegrationTestResult[],
  id: string,
  title: string,
  passed: boolean,
  error?: string
): void {
  results.push({ id, title, passed, ...(error ? { error } : {}) })
}

export async function tryAsync(
  results: TemplateIntegrationTestResult[],
  id: string,
  title: string,
  fn: () => Promise<boolean>
): Promise<void> {
  try {
    push(results, id, title, await fn())
  } catch (e) {
    push(results, id, title, false, (e as Error)?.message ?? String(e))
  }
}

export function isAdmin(ctx: app.Ctx): boolean {
  const u = (ctx as { user?: { is?: (r: string) => boolean } }).user
  return u?.is?.('Admin') === true
}
