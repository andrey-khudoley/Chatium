import { handleV1OpRoute, type V1IncomingLike } from './handleV1OpRoute'
import type { V1TuneResponse } from './v1TuneResponse'

/**
 * POST /v1/addUser — делегирование в общий обработчик (manual §2, implementation-plan).
 * Сохранено для интеграционных тестов и обратной совместимости импорта.
 */
export async function handleV1AddUserPost(
  ctx: app.Ctx,
  req: V1IncomingLike
): Promise<V1TuneResponse> {
  return handleV1OpRoute(ctx, 'addUser', req)
}
