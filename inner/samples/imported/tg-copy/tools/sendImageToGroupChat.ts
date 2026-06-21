import { createFeedMessage, findFeedParticipants } from '@app/feed'
import { sendDataToSocket } from '@app/socket'
import { findUserById } from '@app/auth'
import Chats from '../tables/chats.table'
import ChatAgents from '../tables/chat-agents.table'

/**
 * Тул для агента: отправка изображения в групповой чат
 * 
 * ВАЖНО: Используй ТОЛЬКО этот инструмент ИЛИ replyInGroupChat, но НЕ ОБА сразу!
 * Если нужно отправить изображение - используй ТОЛЬКО этот инструмент.
 * НЕЛЬЗЯ использовать оба инструмента для одного ответа!
 */
export const sendImageToGroupChat = app
  .function('/send-image-to-group-chat')
  .meta({
    name: 'send-image-to-group-chat',
    description: 'Отправить изображение в групповой чат от имени агента',
    llmDescription: `🔴 ВАЖНО: Используй ТОЛЬКО ОДИН ИНСТРУМЕНТ ЗА РАЗ! 🔴

Выбери ТОЛЬКО ОДИН из двух вариантов:
1. replyInGroupChat - для ТЕКСТОВОГО ответа
2. sendImageToGroupChat - для отправки ИЗОБРАЖЕНИЯ

НЕЛЬЗЯ использовать оба инструмента одновременно!

=== КОГДА ИСПОЛЬЗОВАТЬ sendImageToGroupChat ===
- Когда нужно отправить сгенерированное изображение
- Когда пользователь просит нарисовать/создать картинку
- ТОЛЬКО после генерации изображения через generate-image

=== КОГДА НЕ ИСПОЛЬЗОВАТЬ sendImageToGroupChat ===
- НЕ используй вместе с replyInGroupChat!
- Если уже отправил текст через replyInGroupChat - НЕ отправляй изображение через этот инструмент
- Если ответ не содержит изображение - используй replyInGroupChat

=== ПОРЯДОК ДЕЙСТВИЙ ===
1. Получи запрос на генерацию изображения
2. Вызови generate-image для создания изображения
3. Получи URL сгенерированного изображения
4. Вызови sendImageToGroupChat с URL изображения
5. НЕ вызывай replyInGroupChat дополнительно!

=== ПАРАМЕТРЫ ===
- chatId: ID чата (берется из контекста)
- imageUrl: URL изображения для отправки
- caption: (опционально) Подпись к изображению
- replyToMessageId: (опционально) ID сообщения для ответа

=== ВАЖНО ===
- Отправляй ТОЛЬКО сгенерированное изображение
- НЕ отправляй текст отдельно через replyInGroupChat
- Подпись к изображению передавай через параметр caption
- ИСПОЛЬЗУЙ ТОЛЬКО ЭТОТ ИНСТРУМЕНТ ИЛИ replyInGroupChat, но не оба!`
  })
  .body(s =>
    s.object({
      context: s.object({}),
      input: s.object({
        chatId: s.string().describe('ID чата (feedId, из контекста)'),
        imageUrl: s.string().describe('URL изображения для отправки'),
        caption: s.string().optional().describe('Подпись к изображению'),
        replyToMessageId: s.string().optional().describe('ID сообщения для ответа'),
      })
    })
  )
  .handle(async (ctx, body) => {
    const { chatId, imageUrl, caption, replyToMessageId } = body.input || {}

    if (!chatId || !imageUrl) {
      return {
        ok: false,
        result: 'Необходимо указать chatId и imageUrl'
      }
    }

    ctx.account.log('[sendImageToGroupChat] Tool called', {
      level: 'info',
      json: { 
        chatId, 
        imageUrl: imageUrl?.substring(0, 100),
        hasCaption: !!caption,
        replyToMessageId,
      }
    })

    try {
      // Проверяем, что чат существует
      const chat = await Chats.findOneBy(ctx, { feedId: chatId })
      if (!chat) {
        ctx.account.log('[sendImageToGroupChat] Chat not found', { level: 'error', json: { chatId } })
        return {
          ok: false,
          result: 'Чат не найден'
        }
      }

      // Находим конфигурацию агента для этого чата
      const chatTableId = typeof chat.id === 'object' ? chat.id.id : chat.id
      
      const agentConfig = await ChatAgents.findOneBy(ctx, {
        chat: chatTableId,
        isActive: true
      })
      
      if (!agentConfig) {
        ctx.account.log('[sendImageToGroupChat] No active agent found in chat', {
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
          ctx.account.log('[sendImageToGroupChat] Agent has no permission in channel', {
            level: 'error',
            json: { botUserId, role: agentParticipant?.role }
          })
          return {
            ok: false,
            result: 'Агент не имеет прав на публикацию в канале'
          }
        }
      }

      // Определяем имя файла и MIME-тип из URL
      const urlParts = imageUrl.split('/')
      const fileName = urlParts[urlParts.length - 1] || 'image.webp'
      const extension = fileName.split('.').pop()?.toLowerCase() || 'webp'
      const mimeType = extension === 'jpg' || extension === 'jpeg' ? 'image/jpeg' :
                       extension === 'png' ? 'image/png' :
                       extension === 'gif' ? 'image/gif' :
                       extension === 'webp' ? 'image/webp' : 'image/webp'

      // Отправляем сообщение с файлом по URL
      const botUserId = agentConfig.botUserId

      ctx.account.log('[sendImageToGroupChat] Creating message with image', {
        level: 'info',
        json: { 
          chatId, 
          botUserId, 
          imageUrl: imageUrl?.substring(0, 100),
          replyToMessageId 
        }
      })

      const message = await createFeedMessage(ctx, chatId, { id: botUserId } as any, {
        text: caption || '',
        type: 'Message',
        reply_to: replyToMessageId,
        files: [{
          url: imageUrl,
          name: fileName,
          mimeType: mimeType
        }],
        data: {
          isAgentMessage: true,
          agentName: agentConfig.agentName,
          agentId: agentConfig.agentId,
          isGeneratedImage: true
        }
      })

      ctx.account.log('[sendImageToGroupChat] Message created', {
        level: 'info',
        json: { messageId: message.id, chatId, imageUrl: imageUrl?.substring(0, 100) }
      })

      // Получаем данные бот-пользователя для обогащения сообщения
      const botUser = await findUserById(ctx, botUserId)

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

      ctx.account.log('[sendImageToGroupChat] Image sent and broadcasted', {
        level: 'info',
        json: { chatId, messageId: message.id }
      })

      return {
        ok: true,
        result: `Изображение успешно отправлено. ID сообщения: ${message.id}`
      }

    } catch (error) {
      ctx.account.log('[sendImageToGroupChat] Error', {
        level: 'error',
        json: { error: error.message, chatId }
      })

      return {
        ok: false,
        result: `Ошибка при отправке изображения: ${error.message}`
      }
    }
  })

// Отправить событие о новом сообщении всем участникам чата
async function broadcastMessageEvent(ctx, feedId, eventType, message) {
  try {
    const participants = await findFeedParticipants(ctx, feedId)

    for (const participant of participants) {
      await sendDataToSocket(ctx, `user-${participant.userId}`, {
        type: 'chat-event',
        event: eventType,
        feedId,
        message,
      })
    }
  } catch (err) {
    ctx.account.log('[sendImageToGroupChat] Failed to broadcast message event: ' + err.message, {
      level: 'error',
      json: { error: err.message }
    })
  }
}
