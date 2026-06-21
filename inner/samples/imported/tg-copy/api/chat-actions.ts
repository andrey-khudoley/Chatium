import { requireRealUser } from '@app/auth'
import { deleteFeedParticipant, findFeedParticipants } from '@app/feed'
import { sendDataToSocket } from '@app/socket'
import Chats from '../tables/chats.table'
import { createSystemMessage } from './system-messages'

// Выход из группового чата
export const apiChatLeaveRoute = app
  .body((s) => ({
    feedId: s.string(),
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
    const myParticipant = participants.find(p => p.userId === ctx.user.id)

    if (!myParticipant) {
      throw new Error('Вы не являетесь участником этого чата')
    }

    // Владелец не может просто выйти — только удалить чат или передать владение
    if (myParticipant.role === 'owner') {
      throw new Error('Владелец не может выйти из чата. Удалите чат или передайте права другому участнику.')
    }

    // Удаляем участника из чата (нужен ID участника, а не пользователя)
    await deleteFeedParticipant(ctx, feedId, myParticipant.id)

    // Создаем системное сообщение и отправляем событие
    ctx.account.log('[apiChatLeaveRoute] About to create system message for user_left', {
      level: 'info',
      json: { feedId, userId: ctx.user.id, userName: ctx.user.displayName }
    })
    try {
      const sysMsg = await createSystemMessage(ctx, feedId, 'user_left', {
        userName: ctx.user.displayName,
      })
      ctx.account.log('[apiChatLeaveRoute] System message created successfully', {
        level: 'info',
        json: { messageId: sysMsg?.id }
      })
    } catch (e) {
      ctx.account.log('[apiChatLeaveRoute] Failed to create system message: ' + e.message, { level: 'error' })
    }

    // Отправляем событие выхода на канал чата (все участники получат через подписку)
    try {
      await sendDataToSocket(ctx, `chat-${feedId}`, {
        type: 'chat-event',
        event: 'participant-left',
        feedId,
        userId: ctx.user.id,
        userName: ctx.user.displayName,
      })
      ctx.account.log('[apiChatLeaveRoute] Sent participant-left to chat channel', { level: 'info' })
    } catch (sendErr) {
      ctx.account.log('[apiChatLeaveRoute] Failed to send to chat channel: ' + sendErr.message, { level: 'error' })
    }

    // Также отправляем на каналы пользователей для совместимости
    const remainingParticipants = await findFeedParticipants(ctx, feedId)
    for (const participant of remainingParticipants) {
      const targetSocketId = `user-${participant.userId}`
      try {
        await sendDataToSocket(ctx, targetSocketId, {
          type: 'chat-event',
          event: 'participant-left',
          feedId,
          userId: ctx.user.id,
          userName: ctx.user.displayName,
        })
      } catch (sendErr) {
        ctx.account.log('[apiChatLeaveRoute] Failed to send event: ' + sendErr.message, { level: 'error' })
      }
    }

    return {
      success: true,
      message: chat.type === 'channel' ? 'Вы отписались от канала' : 'Вы вышли из чата',
    }
  })

// Отписка от канала (алиас для leave, но специфично для каналов)
export const apiChannelUnsubscribeRoute = app
  .body((s) => ({
    feedId: s.string(),
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
    const myParticipant = participants.find(p => p.userId === ctx.user.id)

    if (!myParticipant) {
      throw new Error('Вы не подписаны на этот канал')
    }

    // Владелец не может просто отписаться
    if (myParticipant.role === 'owner') {
      throw new Error('Владелец не может отписаться от канала. Удалите канал или передайте права другому участнику.')
    }

    // Удаляем участника из канала (нужен ID участника, а не пользователя)
    await deleteFeedParticipant(ctx, feedId, myParticipant.id)

    // Создаем системное сообщение и отправляем событие
    try {
      await createSystemMessage(ctx, feedId, 'user_left', {
        userName: ctx.user.displayName,
      })
    } catch (e) {
      ctx.account.log('[apiChannelUnsubscribeRoute] Failed to create system message: ' + e.message, { level: 'error' })
    }

    // Отправляем событие отписки на канал чата (все участники получат через подписку)
    try {
      await sendDataToSocket(ctx, `chat-${feedId}`, {
        type: 'chat-event',
        event: 'participant-left',
        feedId,
        userId: ctx.user.id,
        userName: ctx.user.displayName,
      })
      ctx.account.log('[apiChannelUnsubscribeRoute] Sent participant-left to chat channel', { level: 'info' })
    } catch (sendErr) {
      ctx.account.log('[apiChannelUnsubscribeRoute] Failed to send to chat channel: ' + sendErr.message, { level: 'error' })
    }

    // Также отправляем на каналы пользователей для совместимости
    const remainingParticipants = await findFeedParticipants(ctx, feedId)
    for (const participant of remainingParticipants) {
      const targetSocketId = `user-${participant.userId}`
      try {
        await sendDataToSocket(ctx, targetSocketId, {
          type: 'chat-event',
          event: 'participant-left',
          feedId,
          userId: ctx.user.id,
          userName: ctx.user.displayName,
        })
      } catch (sendErr) {
        ctx.account.log('[apiChannelUnsubscribeRoute] Failed to send event: ' + sendErr.message, { level: 'error' })
      }
    }

    return {
      success: true,
      message: 'Вы отписались от канала',
    }
  })

// Удаление личного чата (диалога) - только для удаления из своего списка
export const apiDirectChatDeleteRoute = app
  .body((s) => ({
    feedId: s.string(),
  }))
  .post('/delete-direct', async (ctx, req) => {
    requireRealUser(ctx)

    const { feedId } = req.body

    const chat = await Chats.findOneBy(ctx, { feedId })
    if (!chat) {
      throw new Error('Чат не найден')
    }

    // Только личные чаты можно удалить через этот endpoint
    if (chat.type !== 'direct') {
      throw new Error('Этот endpoint только для личных чатов')
    }

    // Проверяем, является ли пользователь участником
    const participants = await findFeedParticipants(ctx, feedId)
    const myParticipant = participants.find(p => p.userId === ctx.user.id)

    if (!myParticipant) {
      throw new Error('Вы не являетесь участником этого чата')
    }

    // Удаляем участника из чата (чат исчезнет из списка, но останется у собеседника)
    await deleteFeedParticipant(ctx, feedId, myParticipant.id)

    return {
      success: true,
      message: 'Диалог удален',
    }
  })
