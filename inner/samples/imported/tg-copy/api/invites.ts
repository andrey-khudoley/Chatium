import { requireRealUser, findUsers, findIdentities, normalizeIdentityKey } from '@app/auth'
import { createOrUpdateFeedParticipant } from '@app/feed'
import { sendDataToSocket } from '@app/socket'
import Chats from '../tables/chats.table'
import ChatInvites from '../tables/chat-invites.table'
import { createSystemMessage } from './system-messages'

// Проверка импорта на старте
console.log('[api/invites.ts] Module loaded, createSystemMessage type:', typeof createSystemMessage)

function generateToken() {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)
}

function generateInviteLink(ctx, token: string) {
  // Приоритет: привязанный внешний домен > домен аккаунта > origin из запроса
  const origin = ctx.account?.customDomain 
    ? `https://${ctx.account.customDomain}`
    : ctx.account?.domain 
      ? `https://${ctx.account.domain}`
      : ctx.req.headers.origin || `https://${ctx.req.headers.host}`
  return `${origin}/tg/invite~${token}`
}

async function findUserByIdentity(ctx, type: string, value: string) {
  if (type === 'username') {
    const users = await findUsers(ctx, {
      where: { username: value },
      limit: 1,
    })
    return users[0] || null
  }

  if (type === 'email') {
    const normalizedEmail = normalizeIdentityKey('Email', value)
    let identities = await findIdentities(ctx, {
      where: { type: 'Email', key: normalizedEmail },
      limit: 1,
    })
    
    // Fallback: ищем по точному совпадению без нормализации
    if (identities.length === 0) {
      const allEmailIdentities = await findIdentities(ctx, {
        where: { type: 'Email' },
        limit: 100,
      })
      
      const emailLower = value.toLowerCase().trim()
      const matchedIdentity = allEmailIdentities.find(
        identity => identity.key.toLowerCase().trim() === emailLower
      )
      
      if (matchedIdentity) {
        identities = [matchedIdentity]
      }
    }
    
    if (identities.length > 0) {
      const users = await findUsers(ctx, {
        where: { id: identities[0].userId },
        limit: 1,
      })
      return users[0] || null
    }
  }

  if (type === 'phone') {
    const normalizedPhone = normalizeIdentityKey('Phone', value)
    let identities = await findIdentities(ctx, {
      where: { type: 'Phone', key: normalizedPhone },
      limit: 1,
    })
    
    // Fallback: ищем по точному совпадению без нормализации
    if (identities.length === 0) {
      const allPhoneIdentities = await findIdentities(ctx, {
        where: { type: 'Phone' },
        limit: 100,
      })
      
      const phoneDigits = value.replace(/\D/g, '')
      const matchedIdentity = allPhoneIdentities.find(
        identity => identity.key.replace(/\D/g, '') === phoneDigits
      )
      
      if (matchedIdentity) {
        identities = [matchedIdentity]
      }
    }
    
    if (identities.length > 0) {
      const users = await findUsers(ctx, {
        where: { id: identities[0].userId },
        limit: 1,
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
    isLinkInvite: s.boolean().optional(),
  }))
  .post('/create', async (ctx, req) => {
    requireRealUser(ctx)

    const chat = await Chats.findOneBy(ctx, { feedId: req.body.chatId })

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
        chat: chat.id,
        isLinkInvite: true,
        status: 'pending',
      })

      // Если ссылка существует и не истекла — возвращаем её
      if (existingLink) {
        const isExpired = existingLink.expiresAt && new Date(existingLink.expiresAt) < new Date()
        if (!isExpired) {
          return {
            success: true,
            invite: existingLink,
            inviteLink: generateInviteLink(ctx, existingLink.token),
            message: 'Инвайт-ссылка уже существует',
          }
        }
        // Если ссылка истекла — отмечаем её как просроченную
        await ChatInvites.update(ctx, {
          id: existingLink.id,
          status: 'expired',
        })
      }

      const token = generateToken()
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)

      const invite = await ChatInvites.create(ctx, {
        chat: chat.id,
        invitedBy: ctx.user.id,
        invitedUser: null,
        status: 'pending',
        token,
        inviteType: 'link',
        inviteValue: null,
        isLinkInvite: true,
        expiresAt,
      })

      return {
        success: true,
        invite,
        inviteLink: generateInviteLink(ctx, token),
      }
    }

    if (inviteType && inviteValue) {
      const targetUser = await findUserByIdentity(ctx, inviteType, inviteValue)

      if (!targetUser) {
        return {
          success: false,
          error: 'Пользователь не найден',
        }
      }

      if (targetUser.id === ctx.user.id) {
        return {
          success: false,
          error: 'Нельзя пригласить самого себя',
        }
      }

      const existingInvite = await ChatInvites.findOneBy(ctx, {
        chat: chat.id,
        invitedUser: targetUser.id,
        status: 'pending',
      })

      if (existingInvite) {
        return {
          success: true,
          invite: existingInvite,
          message: 'Приглашение уже существует',
        }
      }

      const invite = await ChatInvites.create(ctx, {
        chat: chat.id,
        invitedBy: ctx.user.id,
        invitedUser: targetUser.id,
        status: 'pending',
        token: generateToken(),
        inviteType,
        inviteValue,
        isLinkInvite: false,
        expiresAt: null,
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
            description: chat.description,
          },
          invitedBy: {
            id: ctx.user.id,
            displayName: ctx.user.displayName,
            avatar: ctx.user.imageUrl,
          },
          createdAt: invite.createdAt,
        },
      })

      return {
        success: true,
        invite,
        user: {
          id: targetUser.id,
          displayName: targetUser.displayName,
          avatar: targetUser.imageUrl,
        },
      }
    }

    if (invitedUserId) {
      if (invitedUserId === ctx.user.id) {
        return {
          success: false,
          error: 'Нельзя пригласить самого себя',
        }
      }

      const existingInvite = await ChatInvites.findOneBy(ctx, {
        chat: chat.id,
        invitedUser: invitedUserId,
        status: 'pending',
      })

      if (existingInvite) {
        return {
          success: true,
          invite: existingInvite,
          message: 'Приглашение уже существует',
        }
      }

      const invite = await ChatInvites.create(ctx, {
        chat: chat.id,
        invitedBy: ctx.user.id,
        invitedUser: invitedUserId,
        status: 'pending',
        token: generateToken(),
        inviteType: 'userId',
        inviteValue: invitedUserId,
        isLinkInvite: false,
        expiresAt: null,
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
            description: chat.description,
          },
          invitedBy: {
            id: ctx.user.id,
            displayName: ctx.user.displayName,
            avatar: ctx.user.imageUrl,
          },
          createdAt: invite.createdAt,
        },
      })

      return {
        success: true,
        invite,
      }
    }

    return {
      success: false,
      error: 'Не указаны данные для приглашения',
    }
  })

export const apiInvitesGetLinkRoute = app
  .body((s) => ({
    chatId: s.string(),
    regenerate: s.boolean().optional(),
  }))
  .post('/get-link', async (ctx, req) => {
    requireRealUser(ctx)

    const chat = await Chats.findOneBy(ctx, { feedId: req.body.chatId })

    if (!chat) {
      throw new Error('Чат не найден')
    }

    if (chat.owner.id !== ctx.user.id) {
      throw new Error('Только владелец может создавать инвайт-ссылки')
    }

    // Ищем существующую активную ссылку
    const existingLink = await ChatInvites.findOneBy(ctx, {
      chat: chat.id,
      isLinkInvite: true,
      status: 'pending',
    })

    // Если ссылка существует и не истекла, и не требуется регенерация — возвращаем её
    if (existingLink && !req.body.regenerate) {
      const isExpired = existingLink.expiresAt && new Date(existingLink.expiresAt) < new Date()
      if (!isExpired) {
        return {
          success: true,
          inviteLink: generateInviteLink(ctx, existingLink.token),
          expiresAt: existingLink.expiresAt,
          isNew: false,
        }
      }
      // Если ссылка истекла — отмечаем её как просроченную
      await ChatInvites.update(ctx, {
        id: existingLink.id,
        status: 'expired',
      })
    }

    // Если требуется регенерация и есть существующая ссылка — отзываем её
    if (req.body.regenerate && existingLink) {
      await ChatInvites.update(ctx, {
        id: existingLink.id,
        status: 'revoked',
      })
    }

    const token = generateToken()
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)

    const invite = await ChatInvites.create(ctx, {
      chat: chat.id,
      invitedBy: ctx.user.id,
      invitedUser: null,
      status: 'pending',
      token,
      inviteType: 'link',
      inviteValue: null,
      isLinkInvite: true,
      expiresAt,
    })

    return {
      success: true,
      inviteLink: generateInviteLink(ctx, token),
      expiresAt,
      isNew: true,
    }
  })

export const apiInvitesByTokenRoute = app.get('/by-token/:token', async (ctx, req) => {
  const invite = await ChatInvites.findOneBy(ctx, {
    token: req.params.token,
    status: 'pending',
  })

  if (!invite) {
    return {
      success: false,
      error: 'Приглашение не найдено или уже использовано',
    }
  }

  if (invite.expiresAt && new Date(invite.expiresAt) < new Date()) {
    // Отмечаем истёкшую ссылку как просроченную
    await ChatInvites.update(ctx, {
      id: invite.id,
      status: 'expired',
    })
    return {
      success: false,
      error: 'Срок действия приглашения истёк',
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
    try {
      isAlreadyMember = participants.some(p => p.userId === ctx.user.id)
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
      expiresAt: invite.expiresAt,
    },
    chat: {
      id: chat.id,
      feedId: chat.feedId,
      title: chat.title,
      description: chat.description,
      type: chat.type,
    },
    invitedBy: invitedBy ? {
      id: invitedBy.id,
      displayName: invitedBy.displayName,
      avatar: invitedBy.imageUrl,
      gender: invitedBy.gender,
    } : null,
    participantsCount: participants.length,
    isAlreadyMember,
  }
})

export const apiInvitesAcceptRoute = app
  .body((s) => ({
    inviteId: s.string().optional(),
    token: s.string().optional(),
  }))
  .post('/accept', async (ctx, req) => {
    requireRealUser(ctx)
    
    ctx.account.log('[apiInvitesAcceptRoute] START - User accepting invite', {
      level: 'info',
      json: { userId: ctx.user.id, userName: ctx.user.displayName, body: req.body }
    })

    let invite

    if (req.body.token) {
      invite = await ChatInvites.findOneBy(ctx, {
        token: req.body.token,
        status: 'pending',
      })
    } else if (req.body.inviteId) {
      invite = await ChatInvites.findById(ctx, req.body.inviteId)
    }

    if (!invite) {
      ctx.account.log('[apiInvitesAcceptRoute] Invite not found', { level: 'error' })
      throw new Error('Приглашение не найдено')
    }

    if (invite.status !== 'pending') {
      ctx.account.log('[apiInvitesAcceptRoute] Invite already processed', { level: 'error' })
      throw new Error('Приглашение уже обработано')
    }

    if (invite.expiresAt && new Date(invite.expiresAt) < new Date()) {
      ctx.account.log('[apiInvitesAcceptRoute] Invite expired', { level: 'error' })
      throw new Error('Срок действия приглашения истёк')
    }

    if (!invite.isLinkInvite && invite.invitedUser.id !== ctx.user.id) {
      ctx.account.log('[apiInvitesAcceptRoute] Wrong user for invite', { level: 'error' })
      throw new Error('Это не ваше приглашение')
    }

    const chat = await invite.chat.get(ctx)
    ctx.account.log('[apiInvitesAcceptRoute] Got chat', {
      level: 'info',
      json: { chatId: chat?.id, feedId: chat?.feedId, chatTitle: chat?.title }
    })

    // Добавляем пользователя в чат как participant
    ctx.account.log('[apiInvitesAcceptRoute] Adding user to chat as participant...', { level: 'info' })
    await createOrUpdateFeedParticipant(ctx, chat.feedId, ctx.user.id, {
      role: 'guest',
      silent: false,
    })
    ctx.account.log('[apiInvitesAcceptRoute] User added to chat', { level: 'info' })

    // Отмечаем приглашение как принятое
    ctx.account.log('[apiInvitesAcceptRoute] Updating invite status to accepted...', { level: 'info' })
    await ChatInvites.update(ctx, {
      id: invite.id,
      status: 'accepted',
      invitedUser: ctx.user.id,
    })
    ctx.account.log('[apiInvitesAcceptRoute] Invite status updated', { level: 'info' })

    // Отправляем событие о новом участнике ВСЕМ в чате (ВАЖНО: до создания системного сообщения!)
    ctx.account.log('[apiInvitesAcceptRoute] Sending new-participant event to chat-' + chat.feedId, { level: 'info' })
    try {
      await sendDataToSocket(ctx, `chat-${chat.feedId}`, {
        type: 'chat-event',
        event: 'new-participant',
        feedId: chat.feedId,
        user: {
          id: ctx.user.id,
          displayName: ctx.user.displayName,
          firstName: ctx.user.firstName,
          lastName: ctx.user.lastName,
          avatar: ctx.user.imageUrl,
        },
      })
      ctx.account.log('[apiInvitesAcceptRoute] new-participant event sent SUCCESSFULLY', { level: 'info' })
    } catch (e) {
      ctx.account.log('[apiInvitesAcceptRoute] FAILED to send new-participant event: ' + e.message, {
        level: 'error',
        json: { error: e.message, stack: e.stack }
      })
    }

    // Создаем системное сообщение о присоединении (после отправки события, чтобы не блокировать)
    ctx.account.log('[apiInvitesAcceptRoute] Creating system message for user_joined...', { level: 'info' })
    ctx.account.log('[apiInvitesAcceptRoute] chat.feedId = ' + chat?.feedId + ', chat.id = ' + chat?.id, { level: 'info' })
    ctx.account.log('[apiInvitesAcceptRoute] createSystemMessage type: ' + typeof createSystemMessage, { level: 'info' })
    
    if (!chat?.feedId) {
      ctx.account.log('[apiInvitesAcceptRoute] ERROR: chat.feedId is missing!', { 
        level: 'error',
        json: { chatId: chat?.id, chatKeys: Object.keys(chat || {}) }
      })
    } else if (typeof createSystemMessage !== 'function') {
      ctx.account.log('[apiInvitesAcceptRoute] ERROR: createSystemMessage is not a function! Type: ' + typeof createSystemMessage, { 
        level: 'error',
        json: { createSystemMessage }
      })
    } else {
      try {
        ctx.account.log('[apiInvitesAcceptRoute] Calling createSystemMessage with feedId: ' + chat.feedId, { level: 'info' })
        const systemMsg = await createSystemMessage(ctx, chat.feedId, 'user_joined', {
          userName: ctx.user.displayName,
        })
        ctx.account.log('[apiInvitesAcceptRoute] System message result: ' + (systemMsg ? 'CREATED' : 'FAILED/NULL'), { 
          level: 'info',
          json: systemMsg ? { messageId: systemMsg.id, type: systemMsg.type, data: systemMsg.data } : null
        })
        
        // Проверяем, что сообщение действительно создано
        if (!systemMsg) {
          ctx.account.log('[apiInvitesAcceptRoute] WARNING: createSystemMessage returned null/undefined!', { level: 'warn' })
        } else if (!systemMsg.id) {
          ctx.account.log('[apiInvitesAcceptRoute] WARNING: created message has no ID!', { level: 'warn', json: systemMsg })
        } else {
          ctx.account.log('[apiInvitesAcceptRoute] SUCCESS: System message created with ID: ' + systemMsg.id, { level: 'info' })
        }
      } catch (e) {
        ctx.account.log('[apiInvitesAcceptRoute] FAILED to create system message: ' + e.message, {
          level: 'error',
          json: { error: e.message, stack: e.stack, feedId: chat.feedId }
        })
      }
    }

    // Уведомляем пользователя о добавлении в чат
    await sendDataToSocket(ctx, `user-${ctx.user.id}`, {
      type: 'invite-event',
      event: 'invite-accepted',
      chat: {
        id: chat.id,
        feedId: chat.feedId,
        title: chat.title,
        description: chat.description,
      },
    })
    
    // Если есть back параметр - редиректим
    const backUrl = req.query.back
    if (backUrl) {
      return ctx.resp.redirect(backUrl)
    }

    return {
      success: true,
      chatId: chat.id,
      feedId: chat.feedId,
    }
  })

export const apiInvitesDeclineRoute = app
  .body((s) => ({
    inviteId: s.string().optional(),
    token: s.string().optional(),
  }))
  .post('/decline', async (ctx, req) => {
    requireRealUser(ctx)

    let invite

    if (req.body.token) {
      invite = await ChatInvites.findOneBy(ctx, {
        token: req.body.token,
        status: 'pending',
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
      status: 'declined',
    })

    // Уведомляем пользователя об отклонении
    await sendDataToSocket(ctx, `user-${ctx.user.id}`, {
      type: 'invite-event',
      event: 'invite-declined',
      chatId: chat.id,
    })

    return {
      success: true,
    }
  })

export const apiInvitesMyRoute = app.get('/my', async (ctx, req) => {
  requireRealUser(ctx)

  const invites = await ChatInvites.findAll(ctx, {
    where: {
      invitedUser: ctx.user.id,
      status: 'pending',
    },
    order: [{ createdAt: 'desc' }],
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
        description: chat.description,
      },
      invitedBy: invitedBy ? {
        id: invitedBy.id,
        displayName: invitedBy.displayName,
        avatar: invitedBy.imageUrl,
      } : null,
      createdAt: invite.createdAt,
    })
  }

  return {
    invites: enrichedInvites,
  }
})

export const apiInvitesRevokeRoute = app
  .body((s) => ({
    inviteId: s.string(),
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
      status: 'revoked',
    })

    // Уведомляем приглашенного пользователя если он был конкретным
    if (!invite.isLinkInvite && invite.invitedUser) {
      const invitedUser = await invite.invitedUser.get(ctx)
      if (invitedUser) {
        await sendDataToSocket(ctx, `user-${invitedUser.id}`, {
          type: 'invite-event',
          event: 'invite-revoked',
          inviteId: invite.id,
          chatId: chat.id,
        })
      }
    }

    return {
      success: true,
    }
  })
