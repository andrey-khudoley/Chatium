import { createFeedMessage, findFeedParticipants } from '@app/feed'
import { sendDataToSocket } from '@app/socket'
import { findUserById } from '@app/auth'
import Chats from '../tables/chats.table'
import ChatAgents from '../tables/chat-agents.table'

/**
 * Тул для агента: отправка текстового сообщения в групповой чат
 * 
 * ВАЖНО: Используй ТОЛЬКО этот инструмент ИЛИ sendImageToGroupChat, но НЕ ОБА сразу!
 * Если нужно отправить текст - используй replyInGroupChat.
 * Если нужно отправить изображение - используй sendImageToGroupChat.
 * НЕЛЬЗЯ использовать оба инструмента для одного ответа!
 */
export const replyInGroupChat = app
  .function('/reply-in-group-chat')
  .meta({
    name: 'reply-in-group-chat',
    description: 'Отправить текстовое сообщение в групповой чат от имени агента',
    llmDescription: `🔴 ВАЖНО: Используй ТОЛЬКО ОДИН ИНСТРУМЕНТ ЗА РАЗ! 🔴

Выбери ТОЛЬКО ОДИН из двух вариантов:
1. replyInGroupChat - для ТЕКСТОВОГО ответа
2. sendImageToGroupChat - для отправки ИЗОБРАЖЕНИЯ

НЕЛЬЗЯ использовать оба инструмента одновременно!

=== КОГДА ИСПОЛЬЗОВАТЬ replyInGroupChat ===
- Когда нужно отправить текстовый ответ
- Когда ответ не требует генерации изображения
- Для обычного общения и ответов на вопросы

=== КОГДА НЕ ИСПОЛЬЗОВАТЬ replyInGroupChat ===
- НЕ используй вместе с sendImageToGroupChat!
- Если уже отправил изображение через sendImageToGroupChat - НЕ отправляй дополнительный текст через этот инструмент
- Если планируешь отправить изображение - используй ТОЛЬКО sendImageToGroupChat

=== ПАРАМЕТРЫ ===
- chatId: ID чата (берется из контекста)
- text: Текст сообщения для отправки
- replyToMessageId: (опционально) ID сообщения для ответа

=== ВАЖНО ===
- Просто написать текст в ответ НЕ РАБОТАЕТ
- Без вызова этого инструмента пользователь НЕ УВИДИТ твой ответ
- Это единственный способ отправить текстовое сообщение в чат
- ИСПОЛЬЗУЙ ТОЛЬКО ЭТОТ ИНСТРУМЕНТ ИЛИ sendImageToGroupChat, но не оба!`
  })
  .body(s =>
    s.object({
      context: s.object({}),
      input: s.object({
        chatId: s.string().describe('ID чата (feedId, из контекста)'),
        text: s.string().describe('Текст сообщения'),
        replyToMessageId: s.string().optional().describe('ID сообщения для ответа'),
      })
    })
  )
  .handle(async (ctx, body) => {
    const { chatId, text, replyToMessageId } = body.input || {}

    if (!chatId || !text) {
      return {
        ok: false,
        result: 'Необходимо указать chatId и text'
      }
    }

    ctx.account.log('[replyInGroupChat] Tool called', {
      level: 'info',
      json: { 
        chatId, 
        textLength: text?.length, 
        replyToMessageId,
      }
    })

    try {
      // Проверяем, что чат существует
      const chat = await Chats.findOneBy(ctx, { feedId: chatId })
      if (!chat) {
        ctx.account.log('[replyInGroupChat] Chat not found', { level: 'error', json: { chatId } })
        return {
          ok: false,
          result: 'Чат не найден'
        }
      }

      ctx.account.log('[replyInGroupChat] Found chat', {
        level: 'info',
        json: { chatId: chat.id, feedId: chat.feedId, chatType: chat.type }
      })

      // Находим конфигурацию агента для этого чата
      const chatTableId = typeof chat.id === 'object' ? chat.id.id : chat.id
      
      const agentConfig = await ChatAgents.findOneBy(ctx, {
        chat: chatTableId,
        isActive: true
      })
      
      ctx.account.log('[replyInGroupChat] Agent config lookup', {
        level: 'info',
        json: { 
          chatTableId, 
          found: !!agentConfig,
          agentConfigId: agentConfig?.id,
          botUserId: agentConfig?.botUserId
        }
      })

      if (!agentConfig) {
        ctx.account.log('[replyInGroupChat] No active agent found in chat', {
          level: 'error',
          json: { chatTableId }
        })
        return {
          ok: false,
          result: 'Нет активного агента в этом чате'
        }
      }

      // Проверяем права в канале
      if (chat.type === 'channel') {
        const participants = await findFeedParticipants(ctx, chatId)
        const botUserId = agentConfig.botUserId
        const agentParticipant = participants.find(p => p.userId === botUserId)
        
        if (!agentParticipant || (agentParticipant.role !== 'owner' && agentParticipant.role !== 'admin')) {
          ctx.account.log('[replyInGroupChat] Agent has no permission in channel', {
            level: 'error',
            json: { botUserId, role: agentParticipant?.role }
          })
          return {
            ok: false,
            result: 'Агент не имеет прав на публикацию в канале'
          }
        }
      }

      // Отправляем сообщение от имени бот-пользователя агента
      const botUserId = agentConfig.botUserId
      
      ctx.account.log('[replyInGroupChat] Creating message', {
        level: 'info',
        json: { 
          chatId, 
          botUserId, 
          textLength: text?.length,
          replyToMessageId 
        }
      })
      
      const message = await createFeedMessage(ctx, chatId, { id: botUserId } as any, {
        text: text,
        type: 'Message',
        reply_to: replyToMessageId,
        data: {
          isAgentMessage: true,
          agentName: agentConfig.agentName,
          agentId: agentConfig.agentId
        }
      })
      
      ctx.account.log('[replyInGroupChat] Message created', {
        level: 'info',
        json: { messageId: message.id, chatId }
      })

      // Получаем данные бот-пользователя для обогащения сообщения
      const botUser = await findUserById(ctx, botUserId)
      
      // Обогащаем сообщение данными автора
      const enrichedMessage = {
        ...message,
        createdBy: message.createdBy || message.created_by,
        createdAt: message.createdAt || message.created_at,
        updatedAt: message.updatedAt || message.updated_at,
        replyTo: message.replyTo || message.reply_to,
        author: botUser ? {
          id: botUser.id,
          displayName: botUser.displayName,
          firstName: botUser.firstName,
          lastName: botUser.lastName,
          username: botUser.username,
          avatar: botUser.imageUrl,
        } : null,
      }

      // Отправляем WebSocket событие всем участникам чата
      await broadcastMessageEvent(ctx, chatId, 'new-message', enrichedMessage)

      ctx.account.log('[replyInGroupChat] Message sent and broadcasted', {
        level: 'info',
        json: { chatId, messageId: message.id }
      })

      return {
        ok: true,
        result: `Сообщение успешно отправлено. ID сообщения: ${message.id}`
      }

    } catch (error) {
      ctx.account.log('[replyInGroupChat] Error', {
        level: 'error',
        json: { error: error.message, chatId }
      })

      return {
        ok: false,
        result: `Ошибка при отправке сообщения: ${error.message}`
      }
    }
  })

// Отправить событие о новом сообщении всем участникам чата
async function broadcastMessageEvent(ctx, feedId, eventType, message) {
  try {
    const participants = await findFeedParticipants(ctx, feedId)
    
    for (const participant of participants) {
      // Отправляем событие каждому участнику в их персональный канал
      await sendDataToSocket(ctx, `user-${participant.userId}`, {
        type: 'chat-event',
        event: eventType,
        feedId,
        message,
      })
    }
  } catch (err) {
    ctx.account.log('[replyInGroupChat] Failed to broadcast message event: ' + err.message, { 
      level: 'error', 
      json: { error: err.message } 
    })
  }
}
