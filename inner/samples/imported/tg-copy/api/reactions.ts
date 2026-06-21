// @shared

import { requireRealUser, findUsersByIds } from '@app/auth'
import Chats from '../tables/chats.table'

// Тип для реакции с timestamp
interface ReactionItem {
  user_id: string
  created_at: string // ISO date string
}

// Тип для реакций сообщения
type MessageReactions = Record<string, ReactionItem[]>

// Вспомогательная функция для broadcast событий
async function broadcastReactionEvent(ctx, feedId, eventType, data) {
  // Lazy import серверных модулей
  const { findFeedParticipants } = await import('@app/feed')
  const { sendDataToSocket } = await import('@app/socket')
  
  try {
    const participants = await findFeedParticipants(ctx, feedId)
    
    for (const participant of participants) {
      await sendDataToSocket(ctx, `user-${participant.userId}`, {
        type: 'chat-event',
        event: eventType,
        feedId,
        ...data,
      })
    }
  } catch (err) {
    console.error('Failed to broadcast reaction event:', err)
  }
}

// Нормализация реакций из сообщения
function normalizeReactions(message: any): MessageReactions {
  if (!message) return {}
  
  let rawReactions: any = {}
  
  if (message.reactions && typeof message.reactions === 'object' && Object.keys(message.reactions).length > 0) {
    rawReactions = message.reactions
  } else if (message.data?.reactions && typeof message.data.reactions === 'object' && Object.keys(message.data.reactions).length > 0) {
    rawReactions = message.data.reactions
  }
  
  if (typeof rawReactions === 'string') {
    try {
      rawReactions = JSON.parse(rawReactions)
    } catch (e) {
      rawReactions = {}
    }
  }
  
  return rawReactions
}

// Добавить/удалить реакцию на сообщение
export const apiReactionsToggleRoute = app
  .body((s) => ({
    messageId: s.string(),
    emoji: s.string(),
  }))
  .post('/:feedId/toggle', async (ctx, req) => {
    // Lazy import серверных модулей
    const { findFeedParticipants, findFeedMessageById, updateFeedMessage } = await import('@app/feed')
    
    requireRealUser(ctx)

    const chat = await Chats.findOneBy(ctx, {
      feedId: req.params.feedId,
    })

    if (!chat) {
      throw new Error('Чат не найден')
    }

    const participants = await findFeedParticipants(ctx, req.params.feedId)
    const isParticipant = participants.some((p) => p.userId === ctx.user.id)

    if (!isParticipant && chat.owner.id !== ctx.user.id) {
      throw new Error('Нет доступа к этому чату')
    }

    const { messageId, emoji } = req.body

    const msg = await findFeedMessageById(ctx, req.params.feedId, messageId)

    if (!msg) {
      throw new Error('Сообщение не найдено')
    }
    
    const reactions = normalizeReactions(msg)
    const userReactions = Array.isArray(reactions[emoji]) ? reactions[emoji] : []
    
    const hasReacted = userReactions.some(r => r && r.user_id === ctx.user.id)
    
    let newReactions: MessageReactions = { ...reactions }
    
    // Удаляем все предыдущие реакции пользователя (кроме текущей, если она есть)
    for (const [existingEmoji, users] of Object.entries(reactions)) {
      if (existingEmoji !== emoji && Array.isArray(users)) {
        const filteredUsers = users.filter(r => r && r.user_id !== ctx.user.id)
        if (filteredUsers.length === 0) {
          delete newReactions[existingEmoji]
        } else {
          newReactions[existingEmoji] = filteredUsers
        }
      }
    }
    
    if (hasReacted) {
      // Удаляем текущую реакцию
      newReactions[emoji] = userReactions.filter(r => r && r.user_id !== ctx.user.id)
      if (newReactions[emoji].length === 0) {
        delete newReactions[emoji]
      }
    } else {
      // Добавляем реакцию с timestamp
      newReactions[emoji] = [...userReactions, { 
        user_id: ctx.user.id,
        created_at: new Date().toISOString()
      }]
    }

    const updateData: any = {
      data: {
        ...(msg.data || {}),
        reactions: newReactions,
      },
    }
    
    updateData.reactions = newReactions

    const updatedMessage = await updateFeedMessage(
      ctx,
      req.params.feedId,
      messageId,
      updateData
    )
    
    const verifyMessage = await findFeedMessageById(ctx, req.params.feedId, messageId)
    const finalReactions = normalizeReactions(verifyMessage)

    await broadcastReactionEvent(ctx, req.params.feedId, 'reaction-toggle', {
      messageId,
      emoji,
      userId: ctx.user.id,
      reactions: finalReactions,
      action: hasReacted ? 'removed' : 'added',
    })

    return {
      success: true,
      message: {
        ...updatedMessage,
        reactions: finalReactions,
        data: {
          ...(updatedMessage.data || {}),
          reactions: finalReactions,
        },
      },
      action: hasReacted ? 'removed' : 'added',
    }
  })

// Получить реакции для сообщения
export const apiReactionsGetRoute = app
  .get('/:feedId/:messageId', async (ctx, req) => {
    // Lazy import серверных модулей
    const { findFeedParticipants, findFeedMessageById } = await import('@app/feed')
    
    requireRealUser(ctx)

    const chat = await Chats.findOneBy(ctx, {
      feedId: req.params.feedId,
    })

    if (!chat) {
      throw new Error('Чат не найден')
    }

    const participants = await findFeedParticipants(ctx, req.params.feedId)
    const isParticipant = participants.some((p) => p.userId === ctx.user.id)

    if (!isParticipant && chat.owner.id !== ctx.user.id) {
      throw new Error('Нет доступа к этому чату')
    }

    const msg = await findFeedMessageById(ctx, req.params.feedId, req.params.messageId)

    if (!msg) {
      throw new Error('Сообщение не найдено')
    }
    
    const reactions = normalizeReactions(msg)

    return {
      reactions,
    }
  })

// Получить детали реакций с информацией о пользователях (для контекстного меню)
export const apiReactionsDetailsRoute = app
  .get('/:feedId/:messageId/details', async (ctx, req) => {
    // Lazy import серверных модулей
    const { findFeedParticipants, findFeedMessageById } = await import('@app/feed')
    
    requireRealUser(ctx)

    const chat = await Chats.findOneBy(ctx, {
      feedId: req.params.feedId,
    })

    if (!chat) {
      throw new Error('Чат не найден')
    }

    const participants = await findFeedParticipants(ctx, req.params.feedId)
    const isParticipant = participants.some((p) => p.userId === ctx.user.id)

    if (!isParticipant && chat.owner.id !== ctx.user.id) {
      throw new Error('Нет доступа к этому чату')
    }

    const msg = await findFeedMessageById(ctx, req.params.feedId, req.params.messageId)

    if (!msg) {
      throw new Error('Сообщение не найдено')
    }
    
    const reactions = normalizeReactions(msg)
    
    // Собираем все реакции в плоский список для сортировки
    const allReactions: Array<{
      emoji: string
      user_id: string
      created_at: string
    }> = []
    
    for (const [emoji, users] of Object.entries(reactions)) {
      if (Array.isArray(users)) {
        for (const user of users) {
          if (user && user.user_id) {
            allReactions.push({
              emoji,
              user_id: user.user_id,
              created_at: user.created_at || new Date(0).toISOString()
            })
          }
        }
      }
    }
    
    // Сортируем по времени (новые сначала) и берём последние 15
    allReactions.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    const recentReactions = allReactions.slice(0, 15)
    
    // Получаем информацию о пользователях
    const userIds = [...new Set(recentReactions.map(r => r.user_id))]
    const users = await findUsersByIds(ctx, userIds)
    const usersMap = new Map(users.map(u => [u.id, u]))
    
    // Формируем результат
    const reactionDetails = recentReactions.map(r => {
      const user = usersMap.get(r.user_id)
      return {
        emoji: r.emoji,
        userId: r.user_id,
        userName: user ? getUserDisplayName(user) : 'Неизвестно',
        userContact: getUserContact(user),
        createdAt: r.created_at,
      }
    })
    
    return {
      reactions: reactionDetails,
      totalCount: allReactions.length,
    }
  })

// Вспомогательная функция для получения отображаемого имени
function getUserDisplayName(user: any): string {
  if (!user) return 'Неизвестно'
  
  if (user.firstName) {
    if (user.lastName) {
      return `${user.firstName} ${user.lastName}`
    }
    return user.firstName
  }
  
  return user.displayName || user.username || 'Пользователь'
}

// Вспомогательная функция для получения контакта пользователя
function getUserContact(user: any): string | null {
  if (!user) return null
  
  return user.confirmedEmail || user.confirmedPhone || user.username || null
}