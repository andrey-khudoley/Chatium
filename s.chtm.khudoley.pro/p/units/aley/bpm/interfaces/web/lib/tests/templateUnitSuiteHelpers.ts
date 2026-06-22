/**
 * Общие помощники юнит-набора шаблона: тип результата и накопление проверок
 * (синхронных). Используются templateUnitSuite и вынесенными группами проверок.
 */
export type TemplateUnitTestResult = { id: string; title: string; passed: boolean; error?: string }

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
