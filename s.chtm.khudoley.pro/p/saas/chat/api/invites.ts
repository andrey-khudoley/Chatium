import { requireRealUser, findUsers, findIdentities, normalizeIdentityKey } from '@app/auth'
import { createOrUpdateFeedParticipant } from '@app/feed'
import { sendDataToSocket } from '@app/socket'
import Chats from '../tables/chats.table'
import ChatInvites from '../tables/chat-invites.table'
import { getFullUrl } from '../shared/app-paths'

function generateToken() {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)
}

function generateInviteLink(ctx, token: string) {
  return getFullUrl(ctx, `/invite~${token}`)
}

async function findUserByIdentity(ctx, type: string, value: string) {
  if (type === 'username') {
    const users = await findUsers(ctx, {
      where: { username: value },
      limit: 1
    })
    return users[0] || null
  }

  if (type === 'email') {
    const normalizedEmail = normalizeIdentityKey('Email', value)
    let identities = await findIdentities(ctx, {
      where: { type: 'Email', key: normalizedEmail },
      limit: 1
    })

    // Fallback: ищем по точному совпадению без нормализации
    if (identities.length === 0) {
      const allEmailIdentities = await findIdentities(ctx, {
        where: { type: 'Email' },
        limit: 100
      })

      const emailLower = value.toLowerCase().trim()
      const matchedIdentity = allEmailIdentities.find(
        (identity) => identity.key.toLowerCase().trim() === emailLower
      )

      if (matchedIdentity) {
        identities = [matchedIdentity]
      }
    }

    if (identities.length > 0) {
      const users = await findUsers(ctx, {
        where: { id: identities[0].userId },
        limit: 1
      })
      return users[0] || null
    }
  }

  if (type === 'phone') {
    const normalizedPhone = normalizeIdentityKey('Phone', value)
    let identities = await findIdentities(ctx, {
      where: { type: 'Phone', key: normalizedPhone },
      limit: 1
    })

    // Fallback: ищем по точному совпадению без нормализации
    if (identities.length === 0) {
      const allPhoneIdentities = await findIdentities(ctx, {
        where: { type: 'Phone' },
        limit: 100
      })

      const phoneDigits = value.replace(/\D/g, '')
      const matchedIdentity = allPhoneIdentities.find(
        (identity) => identity.key.replace(/\D/g, '') === phoneDigits
      )

      if (matchedIdentity) {
        identities = [matchedIdentity]
      }
    }

    if (identities.length > 0) {
      const users = await findUsers(ctx, {
        where: { id: identities[0].userId },
        limit: 1
      })
      return users[0] || null
    }
  }

  return null
}

export const apiInvitesCreateRoute = app
  .body((s) => ({
    chatId: s.string(),
    invitedUserId: s.string().optional(),
    inviteType: s.string().optional(),
    inviteValue: s.string().optional(),
    isLinkInvite: s.boolean().optional()
  }))
  .post('/create', async (ctx, req) => {
    requireRealUser(ctx)

    const chat = await Chats.findById(ctx, req.body.chatId)

    if (!chat) {
      throw new Error('Чат не найден')
    }

    if (chat.owner.id !== ctx.user.id) {
      throw new Error('Только владелец может приглашать участников')
    }

    const { invitedUserId, inviteType, inviteValue, isLinkInvite } = req.body

    if (isLinkInvite) {
      // Ищем существующую активную ссылку
      const existingLink = await ChatInvites.findOneBy(ctx, {
        chat: req.body.chatId,
        isLinkInvite: true,
        status: 'pending'
      })

      // Если ссылка существует и не истекла — возвращаем её
      if (existingLink) {
        const isExpired = existingLink.expiresAt && new Date(existingLink.expiresAt) < new Date()
        if (!isExpired) {
          return {
            success: true,
            invite: existingLink,
            inviteLink: generateInviteLink(ctx, existingLink.token),
            message: 'Инвайт-ссылка уже существует'
          }
        }
        // Если ссылка истекла — отмечаем её как просроченную
        await ChatInvites.update(ctx, {
          id: existingLink.id,
          status: 'expired'
        })
      }

      const token = generateToken()
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)

      const invite = await ChatInvites.create(ctx, {
        chat: req.body.chatId,
        invitedBy: ctx.user.id,
        invitedUser: null,
        status: 'pending',
        token,
        inviteType: 'link',
        inviteValue: null,
        isLinkInvite: true,
        expiresAt
      })

      return {
        success: true,
        invite,
        inviteLink: generateInviteLink(ctx, token)
      }
    }

    if (inviteType && inviteValue) {
      const targetUser = await findUserByIdentity(ctx, inviteType, inviteValue)

      if (!targetUser) {
        return {
          success: false,
          error: 'Пользователь не найден'
        }
      }

      if (targetUser.id === ctx.user.id) {
        return {
          success: false,
          error: 'Нельзя пригласить самого себя'
        }
      }

      const existingInvite = await ChatInvites.findOneBy(ctx, {
        chat: req.body.chatId,
        invitedUser: targetUser.id,
        status: 'pending'
      })

      if (existingInvite) {
        return {
          success: true,
          invite: existingInvite,
          message: 'Приглашение уже существует'
        }
      }

      const invite = await ChatInvites.create(ctx, {
        chat: req.body.chatId,
        invitedBy: ctx.user.id,
        invitedUser: targetUser.id,
        status: 'pending',
        token: generateToken(),
        inviteType,
        inviteValue,
        isLinkInvite: false,
        expiresAt: null
      })

      // Отправляем уведомление приглашенному пользователю
      await sendDataToSocket(ctx, `user-${targetUser.id}`, {
        type: 'invite-event',
        event: 'new-invite',
        invite: {
          id: invite.id,
          chat: {
            id: chat.id,
            title: chat.title,
            description: chat.description
          },
          invitedBy: {
            id: ctx.user.id,
            displayName: ctx.user.displayName,
            avatar: ctx.user.imageUrl
          },
          createdAt: invite.createdAt
        }
      })

      return {
        success: true,
        invite,
        user: {
          id: targetUser.id,
          displayName: targetUser.displayName,
          avatar: targetUser.imageUrl
        }
      }
    }

    if (invitedUserId) {
      if (invitedUserId === ctx.user.id) {
        return {
          success: false,
          error: 'Нельзя пригласить самого себя'
        }
      }

      const existingInvite = await ChatInvites.findOneBy(ctx, {
        chat: req.body.chatId,
        invitedUser: invitedUserId,
        status: 'pending'
      })

      if (existingInvite) {
        return {
          success: true,
          invite: existingInvite,
          message: 'Приглашение уже существует'
        }
      }

      const invite = await ChatInvites.create(ctx, {
        chat: req.body.chatId,
        invitedBy: ctx.user.id,
        invitedUser: invitedUserId,
        status: 'pending',
        token: generateToken(),
        inviteType: 'userId',
        inviteValue: invitedUserId,
        isLinkInvite: false,
        expiresAt: null
      })

      // Отправляем уведомление приглашенному пользователю
      await sendDataToSocket(ctx, `user-${invitedUserId}`, {
        type: 'invite-event',
        event: 'new-invite',
        invite: {
          id: invite.id,
          chat: {
            id: chat.id,
            title: chat.title,
            description: chat.description
          },
          invitedBy: {
            id: ctx.user.id,
            displayName: ctx.user.displayName,
            avatar: ctx.user.imageUrl
          },
          createdAt: invite.createdAt
        }
      })

      return {
        success: true,
        invite
      }
    }

    return {
      success: false,
      error: 'Не указаны данные для приглашения'
    }
  })

export const apiInvitesGetLinkRoute = app
  .body((s) => ({
    chatId: s.string(),
    regenerate: s.boolean().optional()
  }))
  .post('/get-link', async (ctx, req) => {
    requireRealUser(ctx)

    const chat = await Chats.findById(ctx, req.body.chatId)

    if (!chat) {
      throw new Error('Чат не найден')
    }

    if (chat.owner.id !== ctx.user.id) {
      throw new Error('Только владелец может создавать инвайт-ссылки')
    }

    // Ищем существующую активную ссылку
    const existingLink = await ChatInvites.findOneBy(ctx, {
      chat: req.body.chatId,
      isLinkInvite: true,
      status: 'pending'
    })

    // Если ссылка существует и не истекла, и не требуется регенерация — возвращаем её
    if (existingLink && !req.body.regenerate) {
      const isExpired = existingLink.expiresAt && new Date(existingLink.expiresAt) < new Date()
      if (!isExpired) {
        return {
          success: true,
          inviteLink: generateInviteLink(ctx, existingLink.token),
          expiresAt: existingLink.expiresAt,
          isNew: false
        }
      }
      // Если ссылка истекла — отмечаем её как просроченную
      await ChatInvites.update(ctx, {
        id: existingLink.id,
        status: 'expired'
      })
    }

    // Если требуется регенерация и есть существующая ссылка — отзываем её
    if (req.body.regenerate && existingLink) {
      await ChatInvites.update(ctx, {
        id: existingLink.id,
        status: 'revoked'
      })
    }

    const token = generateToken()
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)

    const invite = await ChatInvites.create(ctx, {
      chat: req.body.chatId,
      invitedBy: ctx.user.id,
      invitedUser: null,
      status: 'pending',
      token,
      inviteType: 'link',
      inviteValue: null,
      isLinkInvite: true,
      expiresAt
    })

    return {
      success: true,
      inviteLink: generateInviteLink(ctx, token),
      expiresAt,
      isNew: true
    }
  })

export const apiInvitesByTokenRoute = app.get('/by-token/:token', async (ctx, req) => {
  const invite = await ChatInvites.findOneBy(ctx, {
    token: req.params.token,
    status: 'pending'
  })

  if (!invite) {
    return {
      success: false,
      error: 'Приглашение не найдено или уже использовано'
    }
  }

  if (invite.expiresAt && new Date(invite.expiresAt) < new Date()) {
    // Отмечаем истёкшую ссылку как просроченную
    await ChatInvites.update(ctx, {
      id: invite.id,
      status: 'expired'
    })
    return {
      success: false,
      error: 'Срок действия приглашения истёк'
    }
  }

  const chat = await invite.chat.get(ctx)
  const invitedBy = await invite.invitedBy.get(ctx)

  // Получаем количество участников
  const { findFeedParticipants } = await import('@app/feed')
  const participants = await findFeedParticipants(ctx, chat.feedId, {})

  // Проверяем, является ли текущий пользователь уже участником
  let isAlreadyMember = false
  if (ctx.user) {
    const { getOrCreateParticipant } = await import('@app/feed')
    try {
      const participant = await getOrCreateParticipant(ctx, chat.feedId, ctx.user, { silent: true })
      isAlreadyMember = !!participant && participant.id
    } catch (e) {
      // Если ошибка, значит не участник
    }
  }

  return {
    success: true,
    invite: {
      id: invite.id,
      token: invite.token,
      isLinkInvite: invite.isLinkInvite,
      expiresAt: invite.expiresAt
    },
    chat: {
      id: chat.id,
      feedId: chat.feedId,
      title: chat.title,
      description: chat.description,
      type: chat.type
    },
    invitedBy: invitedBy
      ? {
          id: invitedBy.id,
          displayName: invitedBy.displayName,
          avatar: invitedBy.imageUrl,
          gender: invitedBy.gender
        }
      : null,
    participantsCount: participants.length,
    isAlreadyMember
  }
})

export const apiInvitesAcceptRoute = app
  .body((s) => ({
    inviteId: s.string().optional(),
    token: s.string().optional()
  }))
  .post('/accept', async (ctx, req) => {
    requireRealUser(ctx)

    let invite

    if (req.body.token) {
      invite = await ChatInvites.findOneBy(ctx, {
        token: req.body.token,
        status: 'pending'
      })
    } else if (req.body.inviteId) {
      invite = await ChatInvites.findById(ctx, req.body.inviteId)
    }

    if (!invite) {
      throw new Error('Приглашение не найдено')
    }

    if (invite.status !== 'pending') {
      throw new Error('Приглашение уже обработано')
    }

    if (invite.expiresAt && new Date(invite.expiresAt) < new Date()) {
      throw new Error('Срок действия приглашения истёк')
    }

    if (!invite.isLinkInvite && invite.invitedUser.id !== ctx.user.id) {
      throw new Error('Это не ваше приглашение')
    }

    const chat = await invite.chat.get(ctx)

    // Отмечаем приглашение как принятое, но НЕ добавляем пользователя автоматически
    // Пользователь должен явно вступить в чат через отдельное действие
    await ChatInvites.update(ctx, {
      id: invite.id,
      status: 'accepted',
      invitedUser: ctx.user.id
    })

    // Отправляем событие о новом участнике всем в чате
    await sendDataToSocket(ctx, `chat-${chat.feedId}`, {
      type: 'chat-event',
      event: 'new-participant',
      feedId: chat.feedId,
      user: {
        id: ctx.user.id,
        displayName: ctx.user.displayName,
        firstName: ctx.user.firstName,
        lastName: ctx.user.lastName,
        avatar: ctx.user.imageUrl
      }
    })

    // Уведомляем пользователя о добавлении в чат
    await sendDataToSocket(ctx, `user-${ctx.user.id}`, {
      type: 'invite-event',
      event: 'invite-accepted',
      chat: {
        id: chat.id,
        feedId: chat.feedId,
        title: chat.title,
        description: chat.description
      }
    })

    // Если есть back параметр - редиректим
    const backUrl = req.query.back
    if (backUrl) {
      return ctx.resp.redirect(backUrl)
    }

    return {
      success: true,
      chatId: chat.id,
      feedId: chat.feedId
    }
  })

export const apiInvitesDeclineRoute = app
  .body((s) => ({
    inviteId: s.string().optional(),
    token: s.string().optional()
  }))
  .post('/decline', async (ctx, req) => {
    requireRealUser(ctx)

    let invite

    if (req.body.token) {
      invite = await ChatInvites.findOneBy(ctx, {
        token: req.body.token,
        status: 'pending'
      })
    } else if (req.body.inviteId) {
      invite = await ChatInvites.findById(ctx, req.body.inviteId)
    }

    if (!invite) {
      throw new Error('Приглашение не найдено')
    }

    if (invite.status !== 'pending') {
      throw new Error('Приглашение уже обработано')
    }

    if (!invite.isLinkInvite && invite.invitedUser.id !== ctx.user.id) {
      throw new Error('Это не ваше приглашение')
    }

    const chat = await invite.chat.get(ctx)

    await ChatInvites.update(ctx, {
      id: invite.id,
      status: 'declined'
    })

    // Уведомляем пользователя об отклонении
    await sendDataToSocket(ctx, `user-${ctx.user.id}`, {
      type: 'invite-event',
      event: 'invite-declined',
      chatId: chat.id
    })

    return {
      success: true
    }
  })

export const apiInvitesMyRoute = app.get('/my', async (ctx, req) => {
  requireRealUser(ctx)

  const invites = await ChatInvites.findAll(ctx, {
    where: {
      invitedUser: ctx.user.id,
      status: 'pending'
    },
    order: [{ createdAt: 'desc' }]
  })

  const enrichedInvites = []
  for (const invite of invites) {
    const chat = await invite.chat.get(ctx)
    const invitedBy = await invite.invitedBy.get(ctx)

    enrichedInvites.push({
      id: invite.id,
      chat: {
        id: chat.id,
        title: chat.title,
        description: chat.description
      },
      invitedBy: invitedBy
        ? {
            id: invitedBy.id,
            displayName: invitedBy.displayName,
            avatar: invitedBy.imageUrl
          }
        : null,
      createdAt: invite.createdAt
    })
  }

  return {
    invites: enrichedInvites
  }
})

export const apiInvitesRevokeRoute = app
  .body((s) => ({
    inviteId: s.string()
  }))
  .post('/revoke', async (ctx, req) => {
    requireRealUser(ctx)

    const invite = await ChatInvites.findById(ctx, req.body.inviteId)

    if (!invite) {
      throw new Error('Приглашение не найдено')
    }

    const chat = await invite.chat.get(ctx)

    if (chat.owner.id !== ctx.user.id) {
      throw new Error('Только владелец может отозвать приглашения')
    }

    await ChatInvites.update(ctx, {
      id: invite.id,
      status: 'revoked'
    })

    // Уведомляем приглашенного пользователя если он был конкретным
    if (!invite.isLinkInvite && invite.invitedUser) {
      const invitedUser = await invite.invitedUser.get(ctx)
      if (invitedUser) {
        await sendDataToSocket(ctx, `user-${invitedUser.id}`, {
          type: 'invite-event',
          event: 'invite-revoked',
          inviteId: invite.id,
          chatId: chat.id
        })
      }
    }

    return {
      success: true
    }
  })
