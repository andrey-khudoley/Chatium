import { requireRealUser } from '@app/auth'
import { findFeedParticipants } from '@app/feed'
import { sendDataToSocket } from '@app/socket'
import Chats from '../tables/chats.table'

// Отправить событие "печатает" всем участникам чата
async function broadcastTypingEvent(ctx, feedId, userId, userName, isTyping) {
  try {
    const participants = await findFeedParticipants(ctx, feedId)
    
    for (const participant of participants) {
      // Не отправляем самому отправителю
      if (participant.userId === userId) continue
      
      await sendDataToSocket(ctx, `user-${participant.userId}`, {
        type: 'chat-event',
        event: isTyping ? 'typing-start' : 'typing-stop',
        feedId,
        userId,
        userName,
      })
    }
  } catch (err) {
    console.error('Failed to broadcast typing event:', err)
  }
}

// Отправить событие "печатает"
export const apiTypingStartRoute = app
  .post('/:feedId/start', async (ctx, req) => {
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

    // Отправляем событие всем участникам
    await broadcastTypingEvent(ctx, req.params.feedId, ctx.user.id, ctx.user.displayName, true)

    return { success: true }
  })

// Остановить событие "печатает"
export const apiTypingStopRoute = app
  .post('/:feedId/stop', async (ctx, req) => {
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

    // Отправляем событие всем участникам
    await broadcastTypingEvent(ctx, req.params.feedId, ctx.user.id, ctx.user.displayName, false)

    return { success: true }
  })
