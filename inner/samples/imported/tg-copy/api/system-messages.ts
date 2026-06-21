import { requireRealUser } from '@app/auth'
import {
  createFeedMessage,
  findFeedParticipants,
} from '@app/feed'
import { sendDataToSocket } from '@app/socket'
import Chats from '../tables/chats.table'

// Типы системных сообщений
export type SystemMessageType = 
  | 'user_joined'
  | 'user_left'
  | 'user_removed'
  | 'chat_created'
  | 'chat_renamed'
  | 'message_pinned'
  | 'message_unpinned'

// Создать системное сообщение
export async function createSystemMessage(
  ctx: app.Ctx,
  feedId: string,
  type: SystemMessageType,
  data: Record<string, any>
) {
  // Лог в самом начале, до всего
  console.log('[createSystemMessage] ENTRY POINT - feedId:', feedId, 'type:', type)
  
  ctx.account.log('[createSystemMessage] FUNCTION CALLED', {
    level: 'info',
    json: { feedId, type, data, hasCtx: !!ctx, hasUser: !!ctx.user }
  })

  const messages: Record<SystemMessageType, string> = {
    user_joined: `👤 ${data.userName} присоединился к чату`,
    user_left: `👋 ${data.userName} покинул чат`,
    user_removed: `🚫 ${data.userName} удален из чата`,
    chat_created: `✨ Чат создан`,
    chat_renamed: `📝 Название чата изменено с "${data.oldTitle}" на "${data.newTitle}"`,
    message_pinned: `📌 Сообщение закреплено`,
    message_unpinned: `📍 Сообщение откреплено`,
  }

  const text = messages[type] || data.text || 'Системное сообщение'
  
  ctx.account.log('[createSystemMessage] Creating system message', {
    level: 'info',
    json: { feedId, type, text, data }
  })

  let message
  try {
    ctx.account.log('[createSystemMessage] Calling createFeedMessage...', {
      level: 'info',
      json: { feedId, userId: ctx.user?.id, userType: typeof ctx.user }
    })
    
    ctx.account.log('[createSystemMessage] About to call createFeedMessage with params:', {
      level: 'info',
      json: { feedId, hasUser: !!ctx.user, textLength: text?.length }
    })
    
    message = await createFeedMessage(ctx, feedId, ctx.user, {
      text,
      // НЕ указываем type - пусть будет по умолчанию 'Message'
      data: { 
        systemType: type, 
        isSystemMessage: true,
        ...data 
      },
    })
    
    ctx.account.log('[createSystemMessage] createFeedMessage returned:', {
      level: 'info',
      json: { 
        hasMessage: !!message, 
        messageId: message?.id, 
        messageType: message?.type,
        messageData: message?.data,
        fullMessage: message
      }
    })
    
    ctx.account.log('[createSystemMessage] System message created', {
      level: 'info',
      json: { messageId: message?.id, feedId, type, messageData: message?.data }
    })
  } catch (error) {
    ctx.account.log('[createSystemMessage] FAILED to create message: ' + error.message, {
      level: 'error',
      json: { error: error.message, stack: error.stack, feedId, type }
    })
    // Не выбрасываем ошибку, чтобы не ломать основной flow
    return null
  }

  // Отправляем событие на канал чата (все участники получат через подписку на chat-${feedId})
  // Гарантируем, что data существует и содержит isSystemMessage
  const messageData = message.data || {}
  const normalizedData = typeof messageData === 'string' ? JSON.parse(messageData) : messageData
  
  const messageToSend = {
    ...message,
    type: 'System',
    data: {
      ...normalizedData,
      isSystemMessage: true,
      systemType: type,
    },
  }
  
  ctx.account.log('[createSystemMessage] Broadcasting message', {
    level: 'info',
    json: { messageId: message.id, feedId, channel: `chat-${feedId}`, messageType: messageToSend.type }
  })
  
  try {
    await sendDataToSocket(ctx, `chat-${feedId}`, {
      type: 'chat-event',
      event: 'new-message',
      feedId,
      message: messageToSend,
    })
    ctx.account.log('[createSystemMessage] Broadcast successful to chat-' + feedId, { 
      level: 'info',
      json: { messageId: message.id, feedId, channel: `chat-${feedId}` }
    })
  } catch (error) {
    ctx.account.log('[createSystemMessage] Broadcast failed: ' + error.message, { 
      level: 'error',
      json: { error: error.message, messageId: message.id, feedId }
    })
  }

  return message
}

// API endpoint для создания системного сообщения (для админов)
export const apiSystemMessageCreateRoute = app
  .body((s) => ({
    type: s.string(),
    data: s.unknown().optional(),
  }))
  .post('/:feedId/create', async (ctx, req) => {
    requireRealUser(ctx)

    const chat = await Chats.findOneBy(ctx, {
      feedId: req.params.feedId,
    })

    if (!chat) {
      throw new Error('Чат не найден')
    }

    // Только владелец может создавать системные сообщения
    if (chat.owner.id !== ctx.user.id) {
      throw new Error('Только владелец чата может создавать системные сообщения')
    }

    const message = await createSystemMessage(
      ctx,
      req.params.feedId,
      req.body.type as SystemMessageType,
      req.body.data || {}
    )

    return {
      success: true,
      message,
    }
  })
