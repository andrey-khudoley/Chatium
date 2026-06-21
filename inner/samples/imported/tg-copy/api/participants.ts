import { requireRealUser, findUsersByIds, findIdentities } from '@app/auth'
import {
  createOrUpdateFeedParticipant,
  deleteFeedParticipant,
  findFeedParticipants,
} from '@app/feed'
import { sendDataToSocket } from '@app/socket'
import Chats from '../tables/chats.table'
import { canManageChat, isChatOwner } from '../shared/permissions'
import { createSystemMessage } from './system-messages'

// Вспомогательная функция для обогащения участников данными пользователей
async function enrichParticipantsWithUserData(ctx, participants) {
  const userIds = [...new Set(participants.map(p => p.userId))]
  
  if (userIds.length === 0) {
    return participants.map(p => ({
      ...p,
      user: null,
    }))
  }

  const users = await findUsersByIds(ctx, userIds)
  
  // Получаем identity для всех пользователей
  const allIdentities = await findIdentities(ctx, {
    where: { userId: userIds },
    limit: 1000,
  })
  
  const usersMap = new Map(users.map(u => [u.id, u]))
  
  return participants.map(p => {
    const user = usersMap.get(p.userId)
    const userIdentities = allIdentities.filter(i => i.userId === p.userId)
    
    return {
      ...p,
      user: user ? {
        id: user.id,
        displayName: user.displayName,
        firstName: user.firstName,
        lastName: user.lastName,
        username: user.username,
        avatar: user.imageUrl,
        email: userIdentities.find(i => i.type === 'Email')?.key || null,
        phone: userIdentities.find(i => i.type === 'Phone')?.key || null,
      } : null,
    }
  })
}

export const apiParticipantsListRoute = app.get('/:feedId/list', async (ctx, req) => {
  requireRealUser(ctx)

  const chat = await Chats.findOneBy(ctx, {
    feedId: req.params.feedId,
  })

  if (!chat) {
    throw new Error('Чат не найден')
  }

  const participants = await findFeedParticipants(ctx, req.params.feedId)
  const myParticipant = participants.find((p) => p.userId === ctx.user.id)
  const isParticipant = !!myParticipant

  // Доступ к списку участников: участники, владелец, или публичный чат
  if (!isParticipant && chat.owner.id !== ctx.user.id && !chat.isPublic) {
    throw new Error('Нет доступа к этому чату')
  }

  // В канале только owner и admin видят список подписчиков
  // Для обычных подписчиков возвращаем только количество
  if (chat.type === 'channel' && myParticipant?.role !== 'owner' && myParticipant?.role !== 'admin') {
    // Возвращаем только владельца и админов для подписчиков
    const visibleParticipants = participants.filter(p => p.role === 'owner' || p.role === 'admin')
    const enrichedVisible = await enrichParticipantsWithUserData(ctx, visibleParticipants)
    return {
      participants: enrichedVisible,
      totalCount: participants.length,
      isChannel: true,
    }
  }

  const enrichedParticipants = await enrichParticipantsWithUserData(ctx, participants)

  return {
    participants: enrichedParticipants,
  }
})

export const apiParticipantsAddRoute = app
  .body((s) => ({
    userId: s.string(),
    role: s.string().optional(),
  }))
  .post('/:feedId/add', async (ctx, req) => {
    requireRealUser(ctx)

    const chat = await Chats.findOneBy(ctx, {
      feedId: req.params.feedId,
    })

    if (!chat) {
      throw new Error('Чат не найден')
    }

    // В личные чаты нельзя добавлять участников
    if (chat.type === 'direct') {
      throw new Error('В личный чат нельзя добавлять участников')
    }

    // Только админ или владелец могут добавлять участников
    const canManage = await canManageChat(ctx, req.params.feedId, ctx.user.id)
    if (!canManage) {
      throw new Error('Только администратор или владелец могут добавлять участников')
    }
    
    // Только владелец может назначать админов
    if (req.body.role === 'admin' || req.body.role === 'owner') {
      const isOwner = await isChatOwner(ctx, req.params.feedId, ctx.user.id)
      if (!isOwner) {
        throw new Error('Только владелец может назначать администраторов')
      }
    }

    const participant = await createOrUpdateFeedParticipant(
      ctx,
      req.params.feedId,
      req.body.userId,
      {
        role: req.body.role || 'guest',
        silent: false,
      },
    )

    // Получаем данные добавленного пользователя
    let addedUser = null
    try {
      const { findUserById } = await import('@app/auth')
      addedUser = await findUserById(ctx, req.body.userId)
    } catch (e) {
      // Игнорируем ошибки
    }

    // Отправляем событие о новом участнике всем в чате
    await sendDataToSocket(ctx, `chat-${req.params.feedId}`, {
      type: 'chat-event',
      event: 'new-participant',
      feedId: req.params.feedId,
      user: addedUser ? {
        id: addedUser.id,
        displayName: addedUser.displayName,
        firstName: addedUser.firstName,
        lastName: addedUser.lastName,
        avatar: addedUser.imageUrl,
      } : {
        id: req.body.userId,
        displayName: 'Пользователь',
      },
    })

    // Создаем системное сообщение о присоединении
    if (addedUser) {
      try {
        await createSystemMessage(ctx, req.params.feedId, 'user_joined', {
          userName: addedUser.displayName,
        })
      } catch (e) {
        ctx.account.log('[apiParticipantsAddRoute] Failed to create system message: ' + e.message, { level: 'error' })
      }
    }

    return {
      success: true,
      participant,
    }
  })

export const apiParticipantsRemoveRoute = app
  .body((s) => ({
    userId: s.string(),
  }))
  .post('/:feedId/remove', async (ctx, req) => {
    requireRealUser(ctx)

    const chat = await Chats.findOneBy(ctx, {
      feedId: req.params.feedId,
    })

    if (!chat) {
      throw new Error('Чат не найден')
    }

    const isSelfRemoval = req.body.userId === ctx.user.id
    
    // Получаем участников и находим целевого
    const participants = await findFeedParticipants(ctx, req.params.feedId)
    const targetParticipant = participants.find(p => p.userId === req.body.userId)
    const isRemovingOwner = targetParticipant?.role === 'owner'
    
    // Нельзя удалить владельца
    if (isRemovingOwner && !isSelfRemoval) {
      throw new Error('Нельзя удалить владельца чата')
    }
    
    // Сам себя может удалить любой участник
    // Для удаления других нужны права админа
    if (!isSelfRemoval) {
      const canManage = await canManageChat(ctx, req.params.feedId, ctx.user.id)
      if (!canManage) {
        throw new Error('Только администратор или владелец могут удалять участников')
      }
    }
    
    if (!targetParticipant) {
      throw new Error('Участник не найден в чате')
    }
    
    await deleteFeedParticipant(ctx, req.params.feedId, targetParticipant)

    // Создаем системное сообщение об удалении
    try {
      const { findUserById } = await import('@app/auth')
      const removedUser = await findUserById(ctx, req.body.userId)
      if (removedUser) {
        await createSystemMessage(ctx, req.params.feedId, 'user_removed', {
          userName: removedUser.displayName,
        })
      }
    } catch (e) {
      ctx.account.log('[apiParticipantsRemoveRoute] Failed to create system message: ' + e.message, { level: 'error' })
    }

    return {
      success: true,
    }
  })

export const apiParticipantsUpdateRoleRoute = app
  .body((s) => ({
    userId: s.string(),
    role: s.string(), // 'admin' | 'guest'
  }))
  .post('/:feedId/update-role', async (ctx, req) => {
    requireRealUser(ctx)

    const chat = await Chats.findOneBy(ctx, {
      feedId: req.params.feedId,
    })

    if (!chat) {
      throw new Error('Чат не найден')
    }

    // В личных чатах нельзя менять роли
    if (chat.type === 'direct') {
      throw new Error('В личном чате нельзя изменять роли участников')
    }

    // Только владелец может менять роли
    const isOwner = await isChatOwner(ctx, req.params.feedId, ctx.user.id)
    if (!isOwner) {
      throw new Error('Только владелец может изменять роли участников')
    }

    // Нельзя менять роль самому себе
    if (req.body.userId === ctx.user.id) {
      throw new Error('Нельзя изменить свою собственную роль')
    }

    // Проверяем, что роль допустима
    const validRoles = ['admin', 'guest']
    if (!validRoles.includes(req.body.role)) {
      throw new Error('Недопустимая роль. Допустимые значения: admin, guest')
    }

    // Получаем текущего участника
    const participants = await findFeedParticipants(ctx, req.params.feedId)
    const targetParticipant = participants.find(p => p.userId === req.body.userId)
    
    if (!targetParticipant) {
      throw new Error('Участник не найден')
    }

    // Нельзя менять роль владельца
    if (targetParticipant.role === 'owner') {
      throw new Error('Нельзя изменить роль владельца чата')
    }

    // Обновляем роль участника
    const updatedParticipant = await createOrUpdateFeedParticipant(
      ctx,
      req.params.feedId,
      req.body.userId,
      {
        role: req.body.role,
      },
    )

    return {
      success: true,
      participant: updatedParticipant,
    }
  })
