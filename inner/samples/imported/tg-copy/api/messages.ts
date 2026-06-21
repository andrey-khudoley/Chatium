import { requireRealUser, findUsersByIds, findIdentities } from '@app/auth'
import {
  findFeedMessages,
  createFeedMessage,
  updateFeedMessage,
  deleteFeedMessage,
  findFeedParticipants,
  getFeedById,
  findFeedMessageById,
} from '@app/feed'
import { sendDataToSocket } from '@app/socket'
import { pushMessageToChain } from '@ai-agents/sdk/process'
import Chats from '../tables/chats.table'
import BlockedUsers from '../tables/blocked-users.table'
import ChatAgents from '../tables/chat-agents.table'
import Subscriptions from '../tables/chat-subscriptions.table'
import Moderations from '../tables/chat-moderations.table'
import PlanChats from '../tables/chat-plan-chats.table'
import { apiPushSendFCMRoute } from './push/send-fcm'

// Вспомогательная функция для обогащения сообщений данными авторов
function normalizeAuthorId(createdBy) {
  if (!createdBy) return ''
  if (typeof createdBy === 'string') return createdBy
  if (typeof createdBy === 'object' && createdBy.id) return createdBy.id
  return String(createdBy)
}

// Нормализация реакций (защита от строки вместо объекта)
function normalizeReactions(message: any): any {
  let reactions = message.reactions || message.data?.reactions || {}
  if (typeof reactions === 'string') {
    try {
      reactions = JSON.parse(reactions)
    } catch (e) {
      reactions = {}
    }
  }
  return reactions
}

// Нормализация data (защита от строки вместо объекта)
function normalizeData(data: any): any {
  if (!data) return {}
  if (typeof data === 'string') {
    try {
      return JSON.parse(data)
    } catch (e) {
      return {}
    }
  }
  return data
}

async function enrichMessagesWithAuthorData(ctx, messages) {
  const authorIds = [...new Set(messages.map(m => normalizeAuthorId(m.createdBy)).filter(Boolean))]
  
  if (authorIds.length === 0) {
    return messages.map(m => ({ ...m, author: null }))
  }

  const users = await findUsersByIds(ctx, authorIds)
  const allIdentities = await findIdentities(ctx, {
    where: { userId: authorIds },
    limit: 1000,
  })
  
  const usersMap = new Map(users.map(u => [u.id, u]))
  
  return messages.map(m => {
    const authorId = normalizeAuthorId(m.createdBy)
    const user = usersMap.get(authorId)
    const userIdentities = allIdentities.filter(i => i.userId === authorId)
    const normalizedReactions = normalizeReactions(m)
    const forwardedFrom = m.data?.forwardedFrom || null
    
    // Нормализуем data
    const normalizedData = normalizeData(m.data)
    
    // Определяем тип сообщения
    const isSystem = normalizedData.isSystemMessage === true || normalizedData.systemType !== undefined
    
    return {
      ...m,
      type: isSystem ? 'System' : (m.type || 'Message'),
      reactions: normalizedReactions,
      data: {
        ...normalizedData,
        reactions: normalizedReactions,
        forwardedFrom,
        isSystemMessage: isSystem ? true : normalizedData.isSystemMessage,
      },
      author: user ? {
        id: user.id,
        displayName: user.displayName,
        firstName: user.firstName,
        lastName: user.lastName,
        username: user.username,
        avatar: user.imageUrl,
        email: userIdentities.find(i => i.type === 'Email')?.key || null,
        phone: userIdentities.find(i => i.type === 'Phone')?.key || null,
      } : null,
    }
  })
}

// Обработка сообщения агентами через pushMessageToChain
async function processMessageWithAgents(ctx, chat, message, senderParticipant) {
  ctx.account.log('[processMessageWithAgents] START', {
    level: 'info',
    json: { 
      chatId: chat?.id, 
      feedId: chat?.feedId, 
      messageId: message?.id,
      messageText: message?.text?.substring(0, 100),
      senderRole: senderParticipant?.role
    }
  })

  // Нормализуем chat.id
  let chatId: string
  if (typeof chat.id === 'object' && chat.id !== null) {
    chatId = chat.id.id || String(chat.id)
  } else {
    chatId = String(chat.id)
  }

  // Получаем активных агентов для этого чата
  const chatAgents = await ChatAgents.findAll(ctx, {
    where: { chat: chatId, isActive: true }
  })

  ctx.account.log('[processMessageWithAgents] Found agents', {
    level: 'info',
    json: { 
      chatId: chatId,
      agentsCount: chatAgents.length,
    }
  })

  if (chatAgents.length === 0) {
    ctx.account.log('[processMessageWithAgents] No active agents found', { level: 'info' })
    return
  }

  const senderRole = senderParticipant?.role || 'guest'
  const messageText = message.text || ''
  const senderName = message.author?.displayName || 'Пользователь'

  for (const chatAgent of chatAgents) {
    try {
      // Проверяем, должен ли агент отвечать
      let shouldProcess = false
      let skipReason = ''
      
      switch (chatAgent.respondTo) {
        case 'all':
          shouldProcess = true
          break
        case 'admins':
          shouldProcess = senderRole === 'owner' || senderRole === 'admin'
          if (!shouldProcess) skipReason = 'sender is not admin'
          break
        case 'mention':
          const mentionName = chatAgent.agentName
          const agentKey = chatAgent.agentKey
          
          // Ищем упоминание в нескольких форматах:
          // 1. @agentName
          // 2. @agentKey
          // 3. @[agentName](botUserId)
          const patterns = [
            new RegExp(`@${mentionName}\\b`, 'i'),
            new RegExp(`@${agentKey}\\b`, 'i'),
            new RegExp(`@\\[${mentionName}\\]\\([^)]+\\)`, 'i'),
          ]
          
          shouldProcess = patterns.some(p => p.test(messageText))
          
          ctx.account.log('[processMessageWithAgents] Mention check', {
            level: 'info',
            json: { 
              mentionName,
              agentKey,
              messageText: messageText.substring(0, 200),
              shouldProcess
            }
          })
          
          if (shouldProcess && chatAgent.respondToMention === 'admins') {
            shouldProcess = senderRole === 'owner' || senderRole === 'admin'
            if (!shouldProcess) skipReason = 'mention matched but sender is not admin'
          }
          if (!shouldProcess && !skipReason) skipReason = 'mention not found'
          break
        default:
          skipReason = `unknown respondTo: ${chatAgent.respondTo}`
      }

      // Не отвечаем на свои сообщения
      const messageAuthorId = message.createdBy?.id || message.author?.id || message.created_by
      if (messageAuthorId === chatAgent.botUserId) {
        shouldProcess = false
        skipReason = 'message is from agent itself'
      }

      ctx.account.log('[processMessageWithAgents] Should process check', {
        level: 'info',
        json: { 
          agentId: chatAgent.agentId,
          agentName: chatAgent.agentName,
          respondTo: chatAgent.respondTo,
          shouldProcess,
          skipReason,
        }
      })

      if (!shouldProcess) continue

      // Формируем контекст для агента
      const chainKey = chatAgent.chainKey || `chat_${chat.feedId}_agent_${chatAgent.agentId}`
      
      // Получаем историю сообщений для контекста
      let recentMessages: any[] = []
      try {
        recentMessages = await findFeedMessages(ctx, chat.feedId, {
          mode: 'tail',
          limit: 10,
        })
      } catch (e) {
        ctx.account.log('[processMessageWithAgents] Failed to load recent messages: ' + e.message, { level: 'warn' })
      }

      const contextMessages = recentMessages
        .reverse()
        .map(m => {
          const author = m.createdBy?.id === chatAgent.botUserId 
            ? chatAgent.agentName 
            : (m.author?.displayName || 'Пользователь')
          return `${author}: ${m.text || ''}`
        })
        .join('\n')

      // Формируем сообщение для агента
      const agentMessageText = buildAgentMessageText({
        senderName,
        senderRole,
        messageText,
        chatTitle: chat.title,
        agentName: chatAgent.agentName,
        contextMessages,
        messageId: message.id,
        feedId: chat.feedId,
      })

      ctx.account.log('[processMessageWithAgents] Sending to agent via pushMessageToChain', {
        level: 'info',
        json: { 
          agentId: chatAgent.agentId,
          agentName: chatAgent.agentName,
          chainKey,
        }
      })

      // Отправляем сообщение агенту через pushMessageToChain
      try {
        const result = await pushMessageToChain(ctx, {
          agentId: chatAgent.agentId,
          chainKey: chainKey,
          messageText: agentMessageText,
          wakeAgent: true,
          createChainIfNotExists: true,
          chainParams: {
            title: `Чат "${chat.title}" - Агент ${chatAgent.agentName}`,
            chainMeta: {
              chatId: chat.feedId,
              chatTitle: chat.title,
              agentId: chatAgent.agentId,
              agentName: chatAgent.agentName,
              botUserId: chatAgent.botUserId,
              messageId: message.id,
            },
            userProfile: {
              senderName,
              senderRole,
              chatTitle: chat.title,
            },
          },
        })

        ctx.account.log('[processMessageWithAgents] Message sent to agent chain', {
          level: 'info',
          json: { 
            chainId: result.chainId,
            chainKey: result.chainKey,
          }
        })
      } catch (pushError) {
        ctx.account.log('[processMessageWithAgents] pushMessageToChain error: ' + pushError.message, {
          level: 'error',
          json: { stack: pushError.stack }
        })
      }

    } catch (agentError) {
      ctx.account.log('[processMessageWithAgents] Error: ' + agentError.message, { level: 'error' })
    }
  }
}

// Формирует сообщение для агента
function buildAgentMessageText({
  senderName,
  senderRole,
  messageText,
  chatTitle,
  agentName,
  contextMessages,
  messageId,
  feedId,
}: {
  senderName: string
  senderRole: string
  messageText: string
  chatTitle: string
  agentName: string
  contextMessages: string
  messageId: string
  feedId: string
}): string {
  let text = `# Новое сообщение в чате "${chatTitle}"

## Информация об отправителе
- Имя: ${senderName}
- Роль: ${senderRole}

## Контекст для ответа
- Твое имя в чате: ${agentName}
- ID чата (feedId): ${feedId}
- ID сообщения для ответа: ${messageId}

## Недавние сообщения в чате:
${contextMessages || '(история пуста)'}

## Новое сообщение:
${senderName}: ${messageText}

## ВАЖНЫЕ ИНСТРУКЦИИ:
1. У тебя есть доступ к инструментам для ответа в этот чат
2. Используй инструмент reply-in-group-chat для отправки текстового ответа
3. Используй инструмент send-image-to-group-chat ТОЛЬКО если нужно отправить изображение
4. ИСПОЛЬЗУЙ ТОЛЬКО ОДИН ИНСТРУМЕНТ за раз - либо текст, либо изображение
5. НЕ отправляй ответ и текстом, и картинкой одновременно
6. Если генерируешь изображение - отправь ТОЛЬКО его через send-image-to-group-chat
7. Если отвечаешь текстом - используй ТОЛЬКО reply-in-group-chat
8. Параметры для инструментов:
   - chatId: "${feedId}"
   - agentId: "(твой agentId)"
   - replyToMessageId: "${messageId}" (для ответа на конкретное сообщение)

Ответь на сообщение используя соответствующий инструмент.`

  return text
}

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
    ctx.account.log('Failed to broadcast message event: ' + err.message, { level: 'error' })
  }
}

export const apiMessagesListRoute = app.get('/:feedId/list', async (ctx, req) => {
  requireRealUser(ctx)

  const chat = await Chats.findOneBy(ctx, { feedId: req.params.feedId })
  if (!chat) throw new Error('Чат не найден')

  const participants = await findFeedParticipants(ctx, req.params.feedId)
  const isParticipant = participants.some((p) => p.userId === ctx.user.id)
  const userParticipant = participants.find((p) => p.userId === ctx.user.id)
  const isOwnerOrAdmin = chat.owner.id === ctx.user.id || 
    userParticipant?.role === 'owner' || 
    userParticipant?.role === 'admin'

  if (!isParticipant && chat.owner.id !== ctx.user.id && !chat.isPublic) {
    throw new Error('Нет доступа к этому чату')
  }
  
  if (chat.isPaid && !isOwnerOrAdmin) {
    const now = new Date()
    let hasActiveSubscription = false

    const planChatLinks = await PlanChats.findAll(ctx, { where: { feedId: req.params.feedId } })
    if (planChatLinks.length > 0) {
      const planIds = planChatLinks.map(link => link.planId.id)
      const subscription = await Subscriptions.findOneBy(ctx, {
        planId: planIds,
        userId: ctx.user.id,
        status: ['active', 'pending']
      })
      if (subscription && subscription.startDate <= now && subscription.endDate >= now) {
        hasActiveSubscription = true
      }
    }

    if (!hasActiveSubscription) {
      const legacySubscription = await Subscriptions.findOneBy(ctx, {
        chatId: req.params.feedId,
        userId: ctx.user.id,
        status: 'active'
      })
      if (legacySubscription && legacySubscription.startDate <= now && legacySubscription.endDate >= now) {
        hasActiveSubscription = true
      }
    }

    if (!hasActiveSubscription) throw new Error('Требуется подписка для доступа к сообщениям')
  }

  const limit = parseInt(req.query.limit as string) || 50
  const beforeId = req.query.beforeId as string | undefined

  const feed = await getFeedById(ctx, req.params.feedId)
  if (!feed) throw new Error('Чат не найден')

  if (!isParticipant && chat.isPublic) {
    return { messages: [], hasMore: false }
  }

  let messages: any[] = []
  try {
    messages = await findFeedMessages(ctx, req.params.feedId, {
      mode: beforeId ? 'head' : 'tail',
      limit: Math.min(limit, 100),
      beforeId,
    })
  } catch (feedError) {
    try {
      messages = await findFeedMessages(ctx, req.params.feedId, {
        mode: 'head',
        limit: Math.min(limit, 100),
      })
    } catch (headError) {
      try {
        messages = await findFeedMessages(ctx, req.params.feedId, {
          mode: 'around',
          limit: Math.min(limit, 100),
          aroundId: feed.lastMessageId || 'none',
        })
      } catch {
        return { messages: [], hasMore: false }
      }
    }
  }
  
  const orderedMessages = beforeId ? messages : messages.reverse()
  const enrichedMessages = await enrichMessagesWithAuthorData(ctx, orderedMessages)

  return {
    messages: enrichedMessages,
    hasMore: messages.length === limit,
  }
})

export const apiMessagesSendRoute = app
  .body((s) => ({
    text: s.string(),
    replyTo: s.string().optional(),
    forwardedFrom: s.object({
      feedId: s.string(),
      title: s.string(),
      type: s.string(),
      avatarHash: s.string().optional(),
      isPublic: s.boolean().optional(),
      isPaid: s.boolean().optional(),
      authorName: s.string().optional(),
      authorId: s.string().optional(),
    }).optional(),
  }))
  .post('/:feedId/send', async (ctx, req) => {
    requireRealUser(ctx)

    const chat = await Chats.findOneBy(ctx, { feedId: req.params.feedId })
    if (!chat) throw new Error('Чат не найден')

    const participants = await findFeedParticipants(ctx, req.params.feedId)
    const participant = participants.find((p) => p.userId === ctx.user.id)
    const isParticipant = !!participant
    const isOwnerOrAdmin = chat.owner.id === ctx.user.id || 
      participant?.role === 'owner' || 
      participant?.role === 'admin'

    if (!isParticipant && chat.owner.id !== ctx.user.id) {
      throw new Error('Нет доступа к этому чату')
    }
    
    if (chat.isPaid && !isOwnerOrAdmin) {
      const now = new Date()
      let hasActiveSubscription = false

      const planChatLinks = await PlanChats.findAll(ctx, { where: { feedId: req.params.feedId } })
      if (planChatLinks.length > 0) {
        const planIds = planChatLinks.map(link => link.planId.id)
        const subscription = await Subscriptions.findOneBy(ctx, {
          planId: planIds,
          userId: ctx.user.id,
          status: ['active', 'pending']
        })
        if (subscription && subscription.startDate <= now && subscription.endDate >= now) {
          hasActiveSubscription = true
        }
      }

      if (!hasActiveSubscription) {
        const legacySubscription = await Subscriptions.findOneBy(ctx, {
          chatId: req.params.feedId,
          userId: ctx.user.id,
          status: 'active'
        })
        if (legacySubscription && legacySubscription.startDate <= now && legacySubscription.endDate >= now) {
          hasActiveSubscription = true
        }
      }

      if (!hasActiveSubscription) throw new Error('Требуется подписка для отправки сообщений')
    }

    if (chat.type === 'channel') {
      const role = participant?.role || 'guest'
      const isWorkspaceAdmin = ctx.user.is('Admin')
      if (!isWorkspaceAdmin && role !== 'owner' && role !== 'admin') {
        throw new Error('В канале публиковать сообщения могут только владелец и администраторы')
      }
    }

    if (chat.type === 'direct') {
      const otherParticipant = participants.find(p => p.userId !== ctx.user.id)
      if (otherParticipant) {
        const isBlocked = await BlockedUsers.findOneBy(ctx, {
          userId: ctx.user.id,
          blockedUserId: otherParticipant.userId,
        })
        if (isBlocked) throw new Error('Вы заблокировали этого пользователя')
        
        const amBlocked = await BlockedUsers.findOneBy(ctx, {
          userId: otherParticipant.userId,
          blockedUserId: ctx.user.id,
        })
        if (amBlocked) throw new Error('Пользователь заблокировал вас')
      }
    }

    const moderation = await Moderations.findOneBy(ctx, {
      chatId: req.params.feedId,
      userId: ctx.user.id,
      isActive: true,
    })

    if (moderation) {
      if (!moderation.isPermanent && moderation.expiresAt && new Date() > moderation.expiresAt) {
        await Moderations.update(ctx, { id: moderation.id, isActive: false })
      } else {
        const moderationType = moderation.type === 'mute' ? 'Вам запрещено писать сообщения' : 'Вы забанены в этом чате'
        const reason = moderation.reason ? ` Причина: ${moderation.reason}` : ''
        const expires = moderation.isPermanent ? '' : ` до ${new Date(moderation.expiresAt).toLocaleString('ru-RU')}`
        throw new Error(`${moderationType}.${reason}${expires}`)
      }
    }

    const messageData: any = {}
    if (req.body.forwardedFrom) messageData.forwardedFrom = req.body.forwardedFrom

    const message = await createFeedMessage(ctx, req.params.feedId, ctx.user, {
      text: req.body.text,
      type: 'Message',
      reply_to: req.body.replyTo || null,
      data: Object.keys(messageData).length > 0 ? messageData : undefined,
    })
    
    const enrichedMessages = await enrichMessagesWithAuthorData(ctx, [message])
    const enrichedMessage = enrichedMessages[0]

    await broadcastMessageEvent(ctx, req.params.feedId, 'new-message', enrichedMessage)
    
    // Отправляем push-уведомления через Firebase Cloud Messaging
    try {
      // Получаем всех участников кроме отправителя
      const recipientIds = participants
        .filter(p => p.userId !== ctx.user.id)
        .map(p => p.userId)
      
      console.log(`[Push Integration] Chat ${chat.id}: ${recipientIds.length} recipients for push`);
      
      if (recipientIds.length > 0) {
        const messagePreview = enrichedMessage.text?.substring(0, 100) || '📎 Вложение'
        const senderName = enrichedMessage.author?.displayName || ctx.user.displayName || 'Пользователь'
        
        console.log(`[Push Integration] Sending push: title="${chat.title || 'Чат'}", body="${senderName}: ${messagePreview}"`);
        
        const pushResult = await apiPushSendFCMRoute.run(ctx, {
          userIds: recipientIds,
          title: chat.title || 'Чат',
          body: `${senderName}: ${messagePreview}`,
          data: {
            chatId: req.params.feedId,
            messageId: enrichedMessage.id,
            type: 'new-message',
          },
          icon: '/tg/icons/icon-192.png',
          badge: '/tg/icons/icon-192.png',
        });
        
        console.log(`[Push Integration] Push result:`, JSON.stringify(pushResult));
      } else {
        console.log(`[Push Integration] No recipients for push (empty chat or only sender)`);
      }
    } catch (pushError) {
      // Не прерываем отправку сообщения при ошибке пуша
      console.error(`[Push Integration] Failed to send push:`, pushError.message);
      ctx.account.log('Failed to send push notification: ' + pushError.message, { level: 'warn' })
    }
    
    if (chat.type === 'group') {
      await processMessageWithAgents(ctx, chat, enrichedMessage, participant).catch(err => {
        ctx.account.log('[apiMessagesSendRoute] Agent processing error: ' + err.message, { level: 'error' })
      })
    }

    return { success: true, message: enrichedMessage }
  })

export const apiMessagesEditRoute = app
  .body((s) => ({
    messageId: s.string(),
    text: s.string(),
  }))
  .post('/:feedId/edit', async (ctx, req) => {
    requireRealUser(ctx)

    const chat = await Chats.findOneBy(ctx, { feedId: req.params.feedId })
    if (!chat) throw new Error('Чат не найден')

    const participants = await findFeedParticipants(ctx, req.params.feedId)
    const participant = participants.find((p) => p.userId === ctx.user.id)

    if (!participant && chat.owner.id !== ctx.user.id) {
      throw new Error('Нет доступа к этому чату')
    }

    const message = await findFeedMessageById(ctx, req.params.feedId, req.body.messageId)
    if (!message) throw new Error('Сообщение не найдено')

    const authorId = normalizeAuthorId(message.created_by || message.createdBy)
    const normalizedAuthorId = authorId?.toString().replace(/^user:/, '')
    const normalizedCurrentUserId = ctx.user.id?.toString().replace(/^user:/, '')
    const isAuthor = normalizedAuthorId === normalizedCurrentUserId

    if (!isAuthor) throw new Error('Вы можете редактировать только свои сообщения')

    const updatedMessage = await updateFeedMessage(ctx, req.params.feedId, req.body.messageId, {
      text: req.body.text,
    })
    
    const enrichedMessages = await enrichMessagesWithAuthorData(ctx, [updatedMessage])
    const enrichedMessage = enrichedMessages[0]

    await broadcastMessageEvent(ctx, req.params.feedId, 'edit-message', enrichedMessage)

    return { success: true, message: enrichedMessage }
  })

export const apiMessagesAfterRoute = app
  .query((s) => ({ afterId: s.string(), limit: s.number().optional() }))
  .get('/:feedId/after', async (ctx, req) => {
    requireRealUser(ctx)

    const chat = await Chats.findOneBy(ctx, { feedId: req.params.feedId })
    if (!chat) throw new Error('Чат не найден')

    const participants = await findFeedParticipants(ctx, req.params.feedId)
    const isParticipant = participants.some((p) => p.userId === ctx.user.id)

    if (!isParticipant && chat.owner.id !== ctx.user.id && !chat.isPublic) {
      throw new Error('Нет доступа к этому чату')
    }

    const limit = req.query.limit || 100
    if (!isParticipant && chat.isPublic) return { messages: [], hasMore: false }

    const messages = await findFeedMessages(ctx, req.params.feedId, {
      mode: 'head',
      limit: Math.min(limit, 100),
      afterId: req.query.afterId,
    })

    const enrichedMessages = await enrichMessagesWithAuthorData(ctx, messages)

    return { messages: enrichedMessages, hasMore: messages.length === limit }
  })

export const apiMessagesAroundRoute = app
  .query((s) => ({ aroundId: s.string(), limit: s.number().optional() }))
  .get('/:feedId/around', async (ctx, req) => {
    requireRealUser(ctx)

    const chat = await Chats.findOneBy(ctx, { feedId: req.params.feedId })
    if (!chat) throw new Error('Чат не найден')

    const participants = await findFeedParticipants(ctx, req.params.feedId)
    const isParticipant = participants.some((p) => p.userId === ctx.user.id)

    if (!isParticipant && chat.owner.id !== ctx.user.id && !chat.isPublic) {
      throw new Error('Нет доступа к этому чату')
    }

    const limit = req.query.limit || 50
    if (!isParticipant && chat.isPublic) return { messages: [], hasMore: false }

    const messages = await findFeedMessages(ctx, req.params.feedId, {
      mode: 'around',
      limit: Math.min(limit, 100),
      messageId: req.query.aroundId,
    })

    const enrichedMessages = await enrichMessagesWithAuthorData(ctx, messages)

    return { messages: enrichedMessages, hasMore: true }
  })

export const apiMessagesDeleteRoute = app
  .body((s) => ({ messageId: s.string() }))
  .post('/:feedId/delete', async (ctx, req) => {
    requireRealUser(ctx)

    const chat = await Chats.findOneBy(ctx, { feedId: req.params.feedId })
    if (!chat) throw new Error('Чат не найден')

    const message = await findFeedMessageById(ctx, req.params.feedId, req.body.messageId)
    if (!message) throw new Error('Сообщение не найдено')

    const authorId = normalizeAuthorId(message.created_by || message.createdBy)
    const normalizedAuthorId = authorId?.toString().replace(/^user:/, '').replace(/^u:/, '')
    const normalizedCurrentUserId = ctx.user.id?.toString().replace(/^user:/, '').replace(/^u:/, '')
    const isAuthor = normalizedAuthorId === normalizedCurrentUserId && !!normalizedAuthorId

    if (isAuthor) {
      await deleteFeedMessage(ctx, req.params.feedId, req.body.messageId)
      await broadcastMessageEvent(ctx, req.params.feedId, 'delete-message', { id: req.body.messageId })
      return { success: true }
    }

    const participants = await findFeedParticipants(ctx, req.params.feedId)
    const participant = participants.find((p) => p.userId === ctx.user.id)
    const isParticipant = !!participant

    if (!isParticipant && chat.owner.id !== ctx.user.id) {
      throw new Error('Нет доступа к этому чату')
    }

    const isAdminOrOwner = participant?.role === 'owner' || participant?.role === 'admin' || chat.owner.id === ctx.user.id
    if (!isAdminOrOwner) throw new Error('Вы можете удалять только свои сообщения')

    await deleteFeedMessage(ctx, req.params.feedId, req.body.messageId)
    await broadcastMessageEvent(ctx, req.params.feedId, 'delete-message', { id: req.body.messageId })

    return { success: true }
  })
