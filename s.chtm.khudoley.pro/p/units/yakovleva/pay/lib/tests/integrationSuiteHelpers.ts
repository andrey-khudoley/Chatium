/**
 * Общие помощники интеграционного набора (вынесены из integrationSuite ради
 * лимита размера файла): тип результата, push/tryAsync, проверка роли admin.
 */

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
