// @shared-route
/**
 * POST /api/access/consume-invite — потребить пригласительную ссылку
 * (implementation-plan §1.11.5). Защита — ТОЛЬКО `requireRealUser`
 * (у пользователя ещё нет внутреннего доступа, это путь его получения).
 *
 * Body: { token: string }
 * Ответы:
 *   - { ok: true, redirectTo: '/' } при успехе.
 *   - HTTP 400 { ok: false, reason } для unknown/used/revoked/expired.
 *   - HTTP 200 { ok: false, reason: 'already_has_access', redirectTo: '/' }.
 */

import { requireRealUser } from '@app/auth'
import { consumeInvite } from '../../lib/access/invites'
import { getFullUrl, ROUTE_PATHS } from '../../config/routes'
import * as loggerLib from '../../lib/logger.lib'

const LOG_PATH = 'api/access/consume-invite'

function jsonResponse(statusCode: number, body: unknown) {
  return {
    statusCode,
    rawHttpBody: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' }
  }
}

export const consumeInviteRoute = app.post('/', async (ctx, req) => {
  try {
    requireRealUser(ctx)
  } catch {
    return jsonResponse(401, { ok: false, error: 'Требуется авторизация' })
  }

  const body = req.body as { token?: unknown } | undefined
  const token = typeof body?.token === 'string' ? body.token.trim() : ''

  await loggerLib.writeServerLog(ctx, {
    severity: 6,
    message: `[${LOG_PATH}] entry`,
    payload: { hasToken: !!token } // значение токена в логи не пишем
  })

  if (!token) {
    return jsonResponse(400, { ok: false, reason: 'unknown' })
  }

  const result = await consumeInvite(ctx, token)
  const homeUrl = getFullUrl(ROUTE_PATHS.index)

  if (result.ok) {
    return { ok: true, redirectTo: homeUrl }
  }

  if (result.reason === 'already_has_access') {
    return { ok: false, reason: result.reason, redirectTo: homeUrl }
  }

  // unknown / used / revoked / expired
  return jsonResponse(400, { ok: false, reason: result.reason })
})

export default consumeInviteRoute
