/**
 * Guard для API-роутов: `requireRealUser` + `requireInternalAccess`.
 * Возвращает HTTP-ответ при отказе, либо null при успехе. Используется в начале
 * защищённых эндпоинтов панели.
 *
 *   const denied = await guardInternalApi(ctx)
 *   if (denied) return denied
 */

import { requireRealUser } from '@app/auth'
import { requireInternalAccess, InternalAccessDeniedError } from './requireInternalAccess'
import { INTERNAL_ACCESS_DENIED } from './constants'

function jsonResponse(statusCode: number, body: unknown) {
  return {
    statusCode,
    rawHttpBody: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' }
  }
}

export async function guardInternalApi(ctx: app.Ctx): Promise<unknown | null> {
  try {
    requireRealUser(ctx)
    await requireInternalAccess(ctx)
    return null
  } catch (err) {
    if (err instanceof InternalAccessDeniedError) {
      return jsonResponse(403, {
        success: false,
        error: 'Доступ к панели запрещён',
        code: INTERNAL_ACCESS_DENIED
      })
    }
    // requireRealUser бросил — анонимный/не реальный пользователь.
    return jsonResponse(401, {
      success: false,
      error: 'Требуется авторизация',
      code: 'UNAUTHORIZED'
    })
  }
}
