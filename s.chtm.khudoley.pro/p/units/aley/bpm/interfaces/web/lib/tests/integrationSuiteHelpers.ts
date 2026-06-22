/**
 * Общие помощники интеграционных проверок: тип результата, накопление и
 * безопасный прогон проверки. Используются runTemplateIntegrationChecks и
 * вынесенными группами проверок.
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
