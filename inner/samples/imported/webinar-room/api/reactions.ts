import { sendDataToSocket } from '@app/socket'
import { reporterApp } from '../shared/error-handler-middleware'
import { s } from '@app/schema'
import { checkRateLimit } from '../shared/rate-limiter'
import { requireAnyUser } from '@app/auth'
import { checkUserBan } from './chat-common'
import { ChatBanType } from '../shared/enum'

const AVAILABLE_EMOJIS = ['❤️', '🔥', '😂']

// @shared-route
export const apiReactionSendRoute = reporterApp
  .body((s) => ({
    episodeId: s.string(),
    emoji: s.string()
  }))
  .post('/send', async (ctx, req) => {
    const ctxUser = await requireAnyUser(ctx)

    const { episodeId, emoji } = req.body

    if (!AVAILABLE_EMOJIS.includes(emoji)) {
      throw new Error('Недопустимый эмодзи')
    }

    // Проверяем бан пользователя
    if (ctxUser?.id) {
      const ban = await checkUserBan(ctx, ctxUser.id, episodeId)

      if (ban) {
        const message =
          ban.type === ChatBanType.Timeout && ban.expiresAt
            ? `Вы заблокированы в чате до ${new Date(ban.expiresAt).toLocaleString('ru')}`
            : 'Вы заблокированы в этом чате'

        throw new Error(message)
      }
    }

    // Rate-limit: 2 реакций в 3 секунды
    const userId = ctx.user?.id || ctx.session?.id || 'anon'
    const rateLimitKey = `reaction_${userId}_${episodeId}`
    const allowed = await checkRateLimit(ctx, rateLimitKey, 2, 3000)

    if (!allowed) {
      return { success: true }
    }

    const episodeSocketId = `episode_${episodeId}`

    await sendDataToSocket(ctx, episodeSocketId, {
      type: 'reaction',
      emoji,
      fromUser: ctxUser?.id
    })

    return { success: true }
  })
