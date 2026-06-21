// @shared-route
import { requireRealUser } from '@app/auth'
import * as inviteRepo from '../../lib/repo/inviteRepo'
import * as loggerLib from '../../lib/logger.lib'

const LOG_PATH = 'api/invites/accept'
const SEV = { error: 3, warn: 4, info: 6, debug: 7 } as const

/**
 * POST /api/invites/accept — принять приглашение по токену.
 * Body: { token: string }
 * Требуется авторизация. Добавляет пользователя в кампанию и помечает инвайт использованным.
 */
export const acceptInviteRoute = app.post('/', async (ctx, req) => {
  await loggerLib.writeServerLog(ctx, {
    severity: SEV.debug,
    message: `[${LOG_PATH}] Запрос POST`,
    payload: { hasBody: !!req.body }
  })
  const user = requireRealUser(ctx)
  const body = (req.body || {}) as { token?: unknown }
  const token = typeof body.token === 'string' ? body.token.trim() : ''
  if (!token) {
    await loggerLib.writeServerLog(ctx, {
      severity: SEV.warn,
      message: `[${LOG_PATH}] Отказ: token не указан`,
      payload: { userId: user?.id }
    })
    return { success: false, error: 'Поле token обязательно' }
  }

  const result = await inviteRepo.acceptInvite(ctx, token, user.id)
  if (result.success === false) {
    await loggerLib.writeServerLog(ctx, {
      severity: SEV.error,
      message: `[${LOG_PATH}] acceptInvite ошибка`,
      payload: { userId: user.id, error: result.error }
    })
    return { success: false, error: result.error }
  }
  await loggerLib.writeServerLog(ctx, {
    severity: SEV.info,
    message: `[${LOG_PATH}] Инвайт принят`,
    payload: { userId: user.id, campaignId: result.campaignId }
  })
  return { success: true, campaignId: result.campaignId }
})
