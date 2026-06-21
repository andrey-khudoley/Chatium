/**
 * Общий тип результата и хелперы push/tryPush для групп проверок юнит-набора
 * `lib/gateway/` (см. gatewayUnitSuite.ts). Вынесены в отдельный модуль, чтобы
 * группы проверок и фикстуры можно было раскидать по файлам без дублирования.
 */

export type GatewayUnitTestResult = { id: string; title: string; passed: boolean; error?: string }

export const GATEWAY_BLOCK_ID = 'unit-gateway'

export function push(
  results: GatewayUnitTestResult[],
  id: string,
  title: string,
  passed: boolean,
  error?: string
): void {
  results.push({ id, title, passed, ...(error ? { error } : {}) })
}

export function tryPush(
  results: GatewayUnitTestResult[],
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
