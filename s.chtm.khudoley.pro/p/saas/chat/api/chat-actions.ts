import { requireRealUser } from '@app/auth'
import { deleteFeedParticipant, findFeedParticipants } from '@app/feed'
import { sendDataToSocket } from '@app/socket'
import Chats from '../tables/chats.table'
import { createSystemMessage } from './system-messages'

// Выход из группового чата
export const apiChatLeaveRoute = app
  .body((s) => ({
    feedId: s.string()
  }))
  .post('/leave', async (ctx, req) => {
    requireRealUser(ctx)

    const { feedId } = req.body

    const chat = await Chats.findOneBy(ctx, { feedId })
    if (!chat) {
      throw new Error('Чат не найден')
    }

    // Нельзя выйти из личного чата через этот endpoint
    if (chat.type === 'direct') {
      throw new Error('Для личных чатов используйте блокировку пользователя')
    }

    // Проверяем, является ли пользователь участником
    const participants = await findFeedParticipants(ctx, feedId)
    const myParticipant = participants.find((p) => p.userId === ctx.user.id)

    if (!myParticipant) {
      throw new Error('Вы не являетесь участником этого чата')
    }

    // Владелец не может просто выйти — только удалить чат или передать владение
    if (myParticipant.role === 'owner') {
      throw new Error(
        'Владелец не может выйти из чата. Удалите чат или передайте права другому участнику.'
      )
    }

    // Удаляем участника из чата (нужен ID участника, а не пользователя)
    await deleteFeedParticipant(ctx, feedId, myParticipant.id)

    // Создаем системное сообщение и отправляем событие
    try {
      await createSystemMessage(ctx, feedId, 'user_left', {
        userName: ctx.user.displayName
      })
    } catch (e) {
      // Если не удалось создать системное сообщение, просто отправляем событие
    }

    // Отправляем событие выхода всем оставшимся участникам
    const remainingParticipants = await findFeedParticipants(ctx, feedId)
    // console.log(`[leave] Sending participant-left to ${remainingParticipants.length} participants. Left user: ${ctx.user.id}`)
    for (const participant of remainingParticipants) {
      const targetSocketId = `user-${participant.userId}`
      // console.log(`[leave] Sending to ${targetSocketId}`)
      try {
        await sendDataToSocket(ctx, targetSocketId, {
          type: 'chat-event',
          event: 'participant-left',
          feedId,
          userId: ctx.user.id,
          userName: ctx.user.displayName
        })
        // console.log(`[leave] Successfully sent to ${targetSocketId}`)
      } catch (sendErr) {
        // console.error(`[leave] Failed to send to ${targetSocketId}:`, sendErr)
      }
    }

    return {
      success: true,
      message: chat.type === 'channel' ? 'Вы отписались от канала' : 'Вы вышли из чата'
    }
  })

// Отписка от канала (алиас для leave, но специфично для каналов)
export const apiChannelUnsubscribeRoute = app
  .body((s) => ({
    feedId: s.string()
  }))
  .post('/unsubscribe', async (ctx, req) => {
    requireRealUser(ctx)

    const { feedId } = req.body

    const chat = await Chats.findOneBy(ctx, { feedId })
    if (!chat) {
      throw new Error('Канал не найден')
    }

    if (chat.type !== 'channel') {
      throw new Error('Этот endpoint только для каналов')
    }

    // Проверяем, является ли пользователь участником
    const participants = await findFeedParticipants(ctx, feedId)
    const myParticipant = participants.find((p) => p.userId === ctx.user.id)

    if (!myParticipant) {
      throw new Error('Вы не подписаны на этот канал')
    }

    // Владелец не может просто отписаться
    if (myParticipant.role === 'owner') {
      throw new Error(
        'Владелец не может отписаться от канала. Удалите канал или передайте права другому участнику.'
      )
    }

    // Удаляем участника из канала (нужен ID участника, а не пользователя)
    await deleteFeedParticipant(ctx, feedId, myParticipant.id)

    // Создаем системное сообщение и отправляем событие
    try {
      await createSystemMessage(ctx, feedId, 'user_left', {
        userName: ctx.user.displayName
      })
    } catch (e) {
      // Если не удалось создать системное сообщение, просто отправляем событие
    }

    // Отправляем событие отписки всем оставшимся участникам
    const remainingParticipants = await findFeedParticipants(ctx, feedId)
    // console.log(`[unsubscribe] Sending participant-left to ${remainingParticipants.length} participants. Left user: ${ctx.user.id}`)
    for (const participant of remainingParticipants) {
      const targetSocketId = `user-${participant.userId}`
      // console.log(`[unsubscribe] Sending to ${targetSocketId}`)
      try {
        await sendDataToSocket(ctx, targetSocketId, {
          type: 'chat-event',
          event: 'participant-left',
          feedId,
          userId: ctx.user.id,
          userName: ctx.user.displayName
        })
        // console.log(`[unsubscribe] Successfully sent to ${targetSocketId}`)
      } catch (sendErr) {
        // console.error(`[unsubscribe] Failed to send to ${targetSocketId}:`, sendErr)
      }
    }

    return {
      success: true,
      message: 'Вы отписались от канала'
    }
  })
