/**
 * Совместимостный shim над новой моделью `handleV1Op` + реестр per-op хендлеров.
 *
 * Исторически здесь жил центральный обработчик `handleV1OpRoute(ctx, op, req)` с inline-выбором
 * контура. После рефакторинга (этап 1) логика перенесена в `handleV1Op.ts` + per-op хендлеры
 * (`api/v1/{op}.ts`, реестр `v1OpHandlers.ts`). Этот модуль остаётся ТОЛЬКО для совместимости:
 *   - тест-раннер `lib/tests/gateway/v1OpsSuiteRunner.ts` зовёт `handleV1OpRouteWithGcDiagnostic`;
 *   - `lib/gateway/v1AddUserHandler.ts` зовёт `handleV1OpRoute`.
 * Оба находят per-op handler в реестре и исполняют тот же единый путь, что и файловые роуты.
 *
 * Реальные роуты `/v1/{op}` зовут `handleV1Op` напрямую и этот shim НЕ используют.
 * Удаление shim-а и `v1AddUserHandler.ts` — этап 2.
 */

import {
  handleV1Op,
  handleV1OpWithGcDiagnostic,
  type V1IncomingLike,
  type V1GcDiagnostic,
  type V1GcHandler
} from './handleV1Op'
import { findV1OpHandler } from './v1OpHandlers'
import type { V1TuneResponse } from './v1TuneResponse'

export type { V1IncomingLike, V1GcDiagnostic }

/**
 * Если per-op handler не найден в реестре — это рассинхрон каталога/роутов: возвращаем
 * заглушку-handler, дающую `INVOKE_INTERNAL_ERROR` (как и при отсутствии записи в каталоге).
 * `handleV1Op`/`handleV1OpWithGcDiagnostic` сами обработают отсутствие записи каталога раньше,
 * но handler обязателен по сигнатуре — отдаём безопасный fallback.
 */
const INTERNAL_ERROR_HANDLER: V1GcHandler = async () => ({
  kind: 'gateway_error',
  code: 'INVOKE_INTERNAL_ERROR'
})

function resolveHandler(op: string): V1GcHandler {
  return findV1OpHandler(op) ?? INTERNAL_ERROR_HANDLER
}

/** Совместимость: публичная функция-роут старой сигнатуры (op до req). */
export async function handleV1OpRoute(
  ctx: app.Ctx,
  op: string,
  req: V1IncomingLike
): Promise<V1TuneResponse> {
  return handleV1Op(ctx, req, op, resolveHandler(op))
}

/** Совместимость: вариант с сырым ответом GC для админского сьюита тестов. */
export async function handleV1OpRouteWithGcDiagnostic(
  ctx: app.Ctx,
  op: string,
  req: V1IncomingLike
): Promise<{ response: V1TuneResponse; gcDiagnostic?: V1GcDiagnostic }> {
  return handleV1OpWithGcDiagnostic(ctx, req, op, resolveHandler(op))
}
