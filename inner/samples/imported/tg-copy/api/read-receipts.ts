import { requireRealUser, findUsersByIds } from '@app/auth'
import {
  findFeedMessages,
  findFeedParticipants,
  getFeedById,
} from '@app/feed'
import { sendDataToSocket } from '@app/socket'
import Chats from '../tables/chats.table'

// Вспомогательная функция для broadcast событий
async function broadcastReadEvent(ctx, feedId, data) {
  try {
    const participants = await findFeedParticipants(ctx, feedId)
    
    for (const participant of participants) {
      await sendDataToSocket(ctx, `user-${participant.userId}`, {
        type: 'chat-event',
        event: 'message-read',
        feedId,
        ...data,
      })
    }
  } catch (err) {
    console.error('Failed to broadcast read event:', err)
  }
}

// Отметить сообщения как прочитанные
export const apiReadReceiptsMarkRoute = app
  .body((s) => ({
    messageId: s.string(), // ID последнего прочитанного сообщения
  }))
  .post('/:feedId/mark', async (ctx, req) => {
    requireRealUser(ctx)

    const chat = await Chats.findOneBy(ctx, {
      feedId: req.params.feedId,
    })

    if (!chat) {
      throw new Error('Чат не найден')
    }

    const participants = await findFeedParticipants(ctx, req.params.feedId)
    const participant = participants.find((p) => p.userId === ctx.user.id)

    if (!participant && chat.owner.id !== ctx.user.id) {
      throw new Error('Нет доступа к этому чату')
    }

    const { messageId } = req.body

    // Обновляем read_message_id для участника
    if (participant) {
      participant.read_message_id = messageId
      participant.read_at = new Date()
      // Обновляем в базе (через feed API)
      // Примечание: API feed не предоставляет прямого метода для этого,
      // но мы можем использовать события WebSocket для уведомления
    }

    // Отправляем событие всем участникам
    await broadcastReadEvent(ctx, req.params.feedId, {
      userId: ctx.user.id,
      messageId,
      readAt: new Date(),
    })

    return {
      success: true,
    }
  })

// Получить статус прочтения для сообщения
export const apiReadReceiptsGetRoute = app
  .get('/:feedId/:messageId', async (ctx, req) => {
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

    const { messageId } = req.params

    // Получаем всех участников, у которых read_message_id >= messageId
    // или ищем по истории сообщений
    const readBy = []
    
    for (const participant of participants) {
      // Проверяем, прочитал ли участник это сообщение
      // Для простоты считаем что если read_message_id >= messageId, то прочитано
      if (participant.read_message_id === messageId || 
          (participant.read_message_id && participant.read_message_id > messageId)) {
        readBy.push({
          userId: participant.userId,
          readAt: participant.read_at,
        })
      }
    }

    // Получаем информацию о пользователях
    const userIds = readBy.map(r => r.userId)
    const users = userIds.length > 0 ? await findUsersByIds(ctx, userIds) : []
    const usersMap = new Map(users.map(u => [u.id, u]))

    return {
      readBy: readBy.map(r => ({
        ...r,
        user: usersMap.get(r.userId) ? {
          id: usersMap.get(r.userId).id,
          displayName: usersMap.get(r.userId).displayName,
          firstName: usersMap.get(r.userId).firstName,
          lastName: usersMap.get(r.userId).lastName,
          avatar: usersMap.get(r.userId).imageUrl,
        } : null,
      })),
      totalParticipants: participants.length,
    }
  })

// Получить общую статистику прочтения для чата
export const apiReadReceiptsStatsRoute = app
  .get('/:feedId/stats', async (ctx, req) => {
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

    // Статистика по участникам
    const stats = participants.map(p => ({
      userId: p.userId,
      lastReadMessageId: p.read_message_id,
      lastReadAt: p.read_at,
    }))

    return {
      stats,
      totalParticipants: participants.length,
    }
  })
