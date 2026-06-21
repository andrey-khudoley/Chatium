// @shared

import { requireAccountRole, findUsersByIds, findUsers } from '@app/auth'
import { genSocketId, sendDataToSocket } from '@app/socket'
import { reporterApp } from '../shared/error-handler-middleware'
import { s } from '@app/schema'
import { getRateLimitStatus, LIMITS } from '../shared/rate-limiter'
import { getUserDisplayName } from '../shared/user-name'
import { ChatBanType } from '../shared/enum'
import ChatBans from '../tables/chat_bans.table'
import Episodes from '../tables/episodes.table'
import { createOrUpdateBotUser } from '@app/auth'
import {
  createFeedMessage,
  deleteFeedMessage,
  deleteFeedMessages,
  findFeedMessageById,
  getOrCreateParticipant
} from '@app/feed'
import { checkUserBan } from './chat-common'

// @shared-route
export const apiChatBanUserRoute = reporterApp
  .body((s) => ({
    episodeId: s.string(),
    reason: s.string().optional(),
    duration: s.number().optional()
  }))
  .post('/ban/:userId', async (ctx, req) => {
    requireAccountRole(ctx, 'Admin')

    const { episodeId, reason, duration } = req.body

    await ChatBans.deleteAll(ctx, {
      limit: null,
      where: { user: req.params.userId as string, episode: episodeId }
    })

    const type = duration ? ChatBanType.Timeout : ChatBanType.Permanent
    const expiresAt = duration ? new Date(Date.now() + duration * 60 * 1000) : null

    const ban = await ChatBans.create(ctx, {
      user: req.params.userId as string,
      episode: episodeId,
      bannedBy: ctx.user!.id,
      reason: reason || 'Нарушение правил чата',
      type,
      expiresAt
    })

    const socketId = `episode_${episodeId}`

    try {
      await sendDataToSocket(ctx, socketId, {
        type: 'user_banned',
        userId: req.params.userId,
        duration,
        reason: ban.reason
      })
    } catch (e) {}

    const userSocketId = `episode_${episodeId}_user_${req.params.userId}`
    try {
      await sendDataToSocket(ctx, userSocketId, {
        type: 'ban',
        banType: type,
        expiresAt: expiresAt ? expiresAt.getTime() : null,
        reason: ban.reason
      })
    } catch (e) {}

    return { success: true, ban }
  })

// @shared-route
export const apiChatUnbanUserRoute = reporterApp
  .body((s) => ({
    episodeId: s.string()
  }))
  .post('/unban/:userId', async (ctx, req) => {
    requireAccountRole(ctx, 'Admin')

    const { episodeId } = req.body

    const bans = await ChatBans.findAll(ctx, {
      where: { user: req.params.userId as string, episode: episodeId }
    })

    const bansIds = bans.map((b) => b.id)

    await ChatBans.deleteAll(ctx, { limit: null, where: { id: bansIds } })

    const socketId = `episode_${episodeId}`

    try {
      await sendDataToSocket(ctx, socketId, {
        type: 'user_unbanned',
        userId: req.params.userId
      })
    } catch (e) {}

    const userSocketId = `episode_${episodeId}_user_${req.params.userId}`
    try {
      await sendDataToSocket(ctx, userSocketId, {
        type: 'unban'
      })
    } catch (e) {}

    return { success: true }
  })

// @shared-route
export const apiChatDeleteAllUserMessagesRoute = reporterApp.post(
  '/delete-all/:userId',
  async (ctx, req) => {
    requireAccountRole(ctx, 'Admin')

    const { episodeId } = req.body

    const episode = await Episodes.findById(ctx, episodeId)

    if (!episode) {
      throw new Error('Эфир не найден')
    }

    if (!episode.chatFeedId) {
      throw new Error('Чат для этого эфира не найден')
    }

    const deletedIds = await deleteFeedMessages(ctx, episode.chatFeedId, {
      where: { createdBy: req.params.userId },
      limit: null,
      return: 'ids'
    })

    const socketId = `episode_${episodeId}`

    try {
      await sendDataToSocket(ctx, socketId, {
        type: 'bulk_delete_messages',
        messageIds: deletedIds
      })
    } catch (e) {}

    return { success: true, deletedCount: deletedIds.length }
  }
)

// @shared-route
export const apiChatGetBansRoute = reporterApp.get('/bans/:episodeId', async (ctx, req) => {
  requireAccountRole(ctx, 'Admin')

  const bans = await ChatBans.findAll(ctx, {
    where: {
      $and: [
        { episode: req.params.episodeId },
        {
          $or: [
            { type: ChatBanType.Permanent },
            { $and: [{ type: ChatBanType.Timeout }, { expiresAt: { $gt: new Date() } }] }
          ]
        }
      ]
    },
    limit: 1000
  })

  const userIds = [...new Set(bans.map((b) => b.user.id).filter(Boolean))] as string[]
  const users = await findUsersByIds(ctx, userIds)
  const usersMap = new Map(users.map((u) => [u.id, u]))

  return bans.map((ban) => {
    const user = usersMap.get(ban.user.id as string)

    return {
      ...ban,
      userName: getUserDisplayName(user) || 'Пользователь',
      userImageUrl: user?.hasImage ? user.getImageThumbnailUrl(64) : null
    }
  })
})

// @shared-route
export const apiChatDeleteMessageRoute = reporterApp.post(
  '/delete-message/:messageId',
  async (ctx, req) => {
    requireAccountRole(ctx, 'Admin')

    const { episodeId } = req.body
    const messageId = req.params.messageId as string

    const episode = await Episodes.findById(ctx, episodeId)
    if (!episode) throw new Error('Эфир не найден')
    if (!episode.chatFeedId) throw new Error('Чат для этого эфира не найден')

    await deleteFeedMessage(ctx, episode.chatFeedId, messageId)

    return { success: true }
  }
)

// @shared-route
export const apiChatCheckMyBanRoute = reporterApp.get(
  '/check-my-ban/:episodeId',
  async (ctx, req) => {
    if (!ctx.user) {
      return { banned: false }
    }

    const ban = await checkUserBan(ctx, ctx.user.id, req.params.episodeId as string)

    if (!ban) {
      return { banned: false }
    }

    return {
      banned: true,
      type: ban.type,
      expiresAt: ban.expiresAt,
      reason: ban.reason
    }
  }
)

// @shared-route
export const apiChatUserSocketRoute = reporterApp.get(
  '/user-socket/:episodeId',
  async (ctx, req) => {
    if (!ctx.user) {
      return { encodedSocketId: null }
    }

    const socketId = `episode_${req.params.episodeId}_user_${ctx.user.id}`
    const encodedSocketId = await genSocketId(ctx, socketId)

    return { encodedSocketId }
  }
)

// @shared-route
export const apiChatGetAdminIdsRoute = reporterApp.get('/admin-ids', async (ctx, req) => {
  const admins = await findUsers(ctx, {
    where: { accountRole: ['Admin', 'Staff', 'Developer', 'Owner'] },
    limit: 1000
  })
  return { adminIds: admins.map((u) => u.id) }
})

// @shared-route
export const apiChatRateLimitStatusRoute = reporterApp.get(
  '/rate-limit-status/:episodeId',
  async (ctx, req) => {
    if (!ctx.user) {
      return { limited: false }
    }

    const rateLimitKey = `chat_${ctx.user.id}_${req.params.episodeId}`
    const status = await getRateLimitStatus(
      ctx,
      rateLimitKey,
      LIMITS.CHAT_MESSAGES_PER_MINUTE,
      60 * 1000
    )

    return status
  }
)

// @shared-route
export const apiChatSendSaleBannerRoute = reporterApp
  .body((s) => ({
    episodeId: s.string(),
    title: s.string(),
    subtitle: s.string(),
    buttonText: s.string(),
    formId: s.string()
  }))
  .post('/send-sale-banner', async (ctx, req) => {
    requireAccountRole(ctx, 'Admin')

    const episode = await Episodes.findById(ctx, req.body.episodeId)
    if (!episode) throw new Error('Эфир не найден')
    if (!episode.chatFeedId) throw new Error('Чат для этого эфира не найден')

    const botUser = await createOrUpdateBotUser(ctx, 'webinar_promo_bot', {
      firstName: 'Чатиум',
      imageHash: 'image_msk_H0kU0Y1RIR.150x150.png'
    })

    await getOrCreateParticipant(ctx, episode.chatFeedId, botUser.id, {
      muted: true,
      silent: true,
      inboxDisabled: true
    })

    await createFeedMessage(ctx, episode.chatFeedId, botUser, {
      text: '',
      data: {
        type: 'sale_banner',
        title: req.body.title,
        subtitle: req.body.subtitle,
        buttonText: req.body.buttonText,
        formId: req.body.formId
      }
    })

    return { success: true }
  })

// @shared-route
export const apiChatDeleteOwnMessageRoute = reporterApp.post(
  '/delete-own-message/:messageId',
  async (ctx, req) => {
    if (!ctx.user) {
      throw new Error('Только авторизованные пользователи могут удалять сообщения')
    }

    const { episodeId } = req.body
    const messageId = req.params.messageId as string

    const episode = await Episodes.findById(ctx, episodeId)
    if (!episode) throw new Error('Эфир не найден')
    if (!episode.chatFeedId) throw new Error('Чат для этого эфира не найден')

    const message = await findFeedMessageById(ctx, episode.chatFeedId, messageId)
    if (!message) throw new Error('Сообщение не найдено')

    if (message.created_by !== ctx.user.id) {
      throw new Error('Вы можете удалять только свои сообщения')
    }

    await deleteFeedMessage(ctx, episode.chatFeedId, messageId)

    return { success: true }
  }
)
