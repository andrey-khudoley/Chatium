/**
 * Общие типы и помощники для юнит-сьюта LifePay
 * (см. lifepayUnitSuite.ts — тонкий оркестратор).
 *
 * Здесь:
 *   - тип результата одного теста LifepayUnitTestResult;
 *   - push / tryPush / tryPushAsync — добавление результата с
 *     обёрткой исключений в проваленный кейс.
 *
 * Логики самих тестов в этом файле нет.
 */

export type LifepayUnitTestResult = {
  id: string
  title: string
  passed: boolean
  error?: string
}

export function push(
  results: LifepayUnitTestResult[],
  id: string,
  title: string,
  passed: boolean,
  error?: string
): void {
  results.push({ id, title, passed, ...(error ? { error } : {}) })
}

export function tryPush(
  results: LifepayUnitTestResult[],
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

export async function tryPushAsync(
  results: LifepayUnitTestResult[],
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
