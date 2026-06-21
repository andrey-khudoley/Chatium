import { requireRealUser } from '@app/auth'
import { createFeedMessage, findFeedParticipants } from '@app/feed'
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
  const messages: Record<SystemMessageType, string> = {
    user_joined: `👤 ${data.userName} присоединился к чату`,
    user_left: `👋 ${data.userName} покинул чат`,
    user_removed: `🚫 ${data.userName} удален из чата`,
    chat_created: `✨ Чат создан`,
    chat_renamed: `📝 Название чата изменено на "${data.newTitle}"`,
    message_pinned: `📌 Сообщение закреплено`,
    message_unpinned: `📍 Сообщение откреплено`
  }

  const message = await createFeedMessage(ctx, feedId, ctx.user, {
    text: messages[type] || data.text || 'Системное сообщение',
    type: 'System',
    data: { systemType: type, ...data }
  })

  // Отправляем событие всем участникам
  const participants = await findFeedParticipants(ctx, feedId)

  for (const participant of participants) {
    await sendDataToSocket(ctx, `user-${participant.userId}`, {
      type: 'chat-event',
      event: 'new-message',
      feedId,
      message: {
        ...message,
        type: 'System'
      }
    })
  }

  return message
}

// API endpoint для создания системного сообщения (для админов)
export const apiSystemMessageCreateRoute = app
  .body((s) => ({
    type: s.string(),
    data: s.record(s.unknown()).optional()
  }))
  .post('/:feedId/create', async (ctx, req) => {
    requireRealUser(ctx)

    const chat = await Chats.findOneBy(ctx, {
      feedId: req.params.feedId
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
      message
    }
  })
