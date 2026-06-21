import { requireRealUser } from '@app/auth'
import {
  findFeedMessageById,
  findFeedParticipants,
  getFeedById,
} from '@app/feed'
import { sendDataToSocket } from '@app/socket'
import Chats from '../tables/chats.table'
import PinnedMessages from '../tables/pinned-messages.table'
import { canManageChat } from '../shared/permissions'
import { createSystemMessage } from './system-messages'

// Вспомогательная функция для broadcast событий
async function broadcastPinnedEvent(ctx, feedId, eventType, data) {
  try {
    // Отправляем на канал чата (все участники получат через подписку)
    await sendDataToSocket(ctx, `chat-${feedId}`, {
      type: 'chat-event',
      event: eventType,
      feedId,
      ...data,
    })
    
    // Также отправляем на каналы пользователей для совместимости
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
    console.error('Failed to broadcast pinned event:', err)
  }
}

// Закрепить сообщение (заменяет предыдущее если есть)
export const apiPinnedSetRoute = app
  .body((s) => ({
    messageId: s.string(),
  }))
  .post('/:feedId/set', async (ctx, req) => {
    requireRealUser(ctx)

    const chat = await Chats.findOneBy(ctx, {
      feedId: req.params.feedId,
    })

    if (!chat) {
      throw new Error('Чат не найден')
    }

    // Только админ или владелец могут закреплять сообщения
    const canManage = await canManageChat(ctx, req.params.feedId, ctx.user.id)
    if (!canManage) {
      throw new Error('Только администратор или владелец могут закреплять сообщения')
    }

    const { messageId } = req.body

    // Проверяем что сообщение существует
    const message = await findFeedMessageById(ctx, req.params.feedId, messageId)

    if (!message) {
      throw new Error('Сообщение не найдено')
    }

    // Удаляем предыдущее закрепленное сообщение если есть
    const existingPinned = await PinnedMessages.findOneBy(ctx, {
      chatId: req.params.feedId,
    })
    
    if (existingPinned) {
      await PinnedMessages.delete(ctx, existingPinned.id)
    }

    // Создаем новую запись о закреплении (используем реальный message.id)
    await PinnedMessages.create(ctx, {
      chatId: req.params.feedId,
      messageId: message.id,
      pinnedBy: ctx.user.id,
      pinnedAt: new Date(),
    })

    // Отправляем событие всем участникам
    await broadcastPinnedEvent(ctx, req.params.feedId, 'message-pinned', {
      messageId: message.id,
      message,
    })

    // Создаем системное сообщение о закреплении
    ctx.account.log('[apiPinnedSetRoute] Creating system message for pin...', { level: 'info', json: { feedId: req.params.feedId } })
    try {
      const sysMsg = await createSystemMessage(ctx, req.params.feedId, 'message_pinned', {})
      ctx.account.log('[apiPinnedSetRoute] System message created for pin', { level: 'info', json: { messageId: sysMsg?.id } })
    } catch (e) {
      ctx.account.log('[apiPinnedSetRoute] Failed to create system message: ' + e.message, { level: 'error' })
    }

    return {
      success: true,
      message,
    }
  })

// Открепить сообщение
export const apiPinnedRemoveRoute = app
  .post('/:feedId/remove', async (ctx, req) => {
    requireRealUser(ctx)

    const chat = await Chats.findOneBy(ctx, {
      feedId: req.params.feedId,
    })

    if (!chat) {
      throw new Error('Чат не найден')
    }

    // Только админ или владелец могут откреплять сообщения
    const canManage = await canManageChat(ctx, req.params.feedId, ctx.user.id)
    if (!canManage) {
      throw new Error('Только администратор или владелец могут откреплять сообщения')
    }

    // Находим и удаляем закрепленное сообщение из таблицы
    const pinnedMessage = await PinnedMessages.findOneBy(ctx, {
      chatId: req.params.feedId,
    })

    if (pinnedMessage) {
      await PinnedMessages.delete(ctx, pinnedMessage.id)
    }

    // Отправляем событие всем участникам
    await broadcastPinnedEvent(ctx, req.params.feedId, 'message-unpinned', {
      messageId: pinnedMessage?.messageId,
    })

    // Создаем системное сообщение об откреплении
    ctx.account.log('[apiPinnedRemoveRoute] Creating system message for unpin...', { level: 'info', json: { feedId: req.params.feedId } })
    try {
      const sysMsg = await createSystemMessage(ctx, req.params.feedId, 'message_unpinned', {})
      ctx.account.log('[apiPinnedRemoveRoute] System message created for unpin', { level: 'info', json: { messageId: sysMsg?.id } })
    } catch (e) {
      ctx.account.log('[apiPinnedRemoveRoute] Failed to create system message: ' + e.message, { level: 'error' })
    }

    return {
      success: true,
    }
  })

// Получить закрепленное сообщение
export const apiPinnedGetRoute = app
  .get('/:feedId', async (ctx, req) => {
    requireRealUser(ctx)

    const chat = await Chats.findOneBy(ctx, {
      feedId: req.params.feedId,
    })

    if (!chat) {
      throw new Error('Чат не найден')
    }

    const participants = await findFeedParticipants(ctx, req.params.feedId)
    const isParticipant = participants.some((p) => p.userId === ctx.user.id)

    // Проверяем доступ: участник, владелец или публичный чат
    const ownerId = typeof chat.owner === 'object' ? chat.owner?.id : chat.owner
    const isOwner = ownerId === ctx.user.id

    if (!isParticipant && !isOwner && !chat.isPublic) {
      throw new Error('Нет доступа к этому чату')
    }

    // Получаем закрепленное сообщение из таблицы
    const pinnedRecord = await PinnedMessages.findOneBy(ctx, {
      chatId: req.params.feedId,
    })

    if (!pinnedRecord) {
      return {
        pinnedMessage: null,
      }
    }

    // Получаем данные сообщения
    try {
      const message = await findFeedMessageById(ctx, req.params.feedId, pinnedRecord.messageId)

      if (message) {
        return {
          pinnedMessage: message,
        }
      }
    } catch (err) {
      console.error(`Failed to load pinned message ${pinnedRecord.messageId}:`, err)
    }

    return {
      pinnedMessage: null,
    }
  })
