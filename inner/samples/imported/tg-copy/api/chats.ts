import { requireRealUser, requireAccountRole, findUsersByIds, findIdentities, createOrUpdateBotUser } from '@app/auth'
import {
  createFeed,
  getFeedById,
  updateFeed,
  deleteFeed,
  createOrUpdateFeedParticipant,
  deleteFeedParticipant,
  findFeedParticipants,
  findFeedMessages,
  getChat,
} from '@app/feed'
import { sendDataToSocket } from '@app/socket'
import Chats from '../tables/chats.table'
import ChatInvites from '../tables/chat-invites.table'
import ChatAgents from '../tables/chat-agents.table'
import SubscriptionPlans from '../tables/chat-subscription-plans.table'
import Subscriptions from '../tables/chat-subscriptions.table'
import PlanChats from '../tables/chat-plan-chats.table'
import { canManageChat, isChatOwner } from '../shared/permissions'
import { isUserBanned } from './moderation'
import { Money } from '@app/heap'
import { createSystemMessage } from './system-messages'

// Вспомогательная функция для обогащения участников данными пользователей
async function enrichParticipantsWithUserData(ctx, participants) {
  const userIds = [...new Set(participants.map(p => p.userId))]
  
  if (userIds.length === 0) {
    return participants.map(p => ({
      ...p,
      user: null,
    }))
  }

  const users = await findUsersByIds(ctx, userIds)
  
  // Получаем identity для всех пользователей
  const allIdentities = await findIdentities(ctx, {
    where: { userId: userIds },
    limit: 1000,
  })
  
  const usersMap = new Map(users.map(u => [u.id, u]))
  
  return participants.map(p => {
    const user = usersMap.get(p.userId)
    const userIdentities = allIdentities.filter(i => i.userId === p.userId)
    
    return {
      ...p,
      user: user ? {
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
function generateId() {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)
}

// Вспомогательная функция для определения отображаемого имени личного чата
function getDirectChatDisplayTitle(participants, currentUserId) {
  // Находим собеседника (не текущего пользователя)
  const otherParticipant = participants.find(p => p.userId !== currentUserId)
  
  if (!otherParticipant || !otherParticipant.user) {
    return 'Пользователь'
  }
  
  const user = otherParticipant.user
  return user.displayName || 
    (user.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() : null) ||
    user.username ||
    'Пользователь'
}

// Функция для обогащения последних сообщений данными авторов
async function enrichLastMessagesWithAuthors(ctx, messages) {
  const authorIds = messages
    .filter(m => m && m.createdBy)
    .map(m => {
      if (typeof m.createdBy === 'object') return m.createdBy.id
      return m.createdBy
    })
  
  const uniqueAuthorIds = [...new Set(authorIds)]
  
  if (uniqueAuthorIds.length === 0) {
    return messages.map(m => ({ ...m, author: null }))
  }

  const users = await findUsersByIds(ctx, uniqueAuthorIds)
  const usersMap = new Map(users.map(u => [u.id, u]))

  return messages.map(message => {
    const authorId = typeof message.createdBy === 'object' 
      ? message.createdBy?.id 
      : message.createdBy
    const user = usersMap.get(authorId)
    
    return {
      ...message,
      author: user ? {
        id: user.id,
        displayName: user.displayName,
        firstName: user.firstName,
        lastName: user.lastName,
      } : null,
    }
  })
}

export const apiChatsListRoute = app.get('/list', async (ctx, req) => {
  requireRealUser(ctx)

  // Получаем все чаты из таблицы
  const allChats = await Chats.findAll(ctx, {
    order: [{ updatedAt: 'desc' }],
    limit: 1000,
  })

  // Проверяем баны для всех чатов асинхронно
  const bannedChatIds = new Set<string>()
  for (const chat of allChats) {
    const isBanned = await isUserBanned(ctx, chat.feedId, ctx.user.id)
    if (isBanned) {
      bannedChatIds.add(chat.feedId)
    }
  }

  // console.log(`[apiChatsList] Всего чатов в таблице: ${allChats.length}, userId: ${ctx.user.id}`)

  // Получаем активные подписки пользователя
  const userSubscriptions = await Subscriptions.findAll(ctx, {
    where: {
      userId: ctx.user.id,
      status: ['active', 'pending']
    }
  })

  // Получаем истекшие подписки для отображения статуса "Подписка истекла"
  const expiredSubscriptions = await Subscriptions.findAll(ctx, {
    where: {
      userId: ctx.user.id,
      status: ['expired', 'cancelled']
    },
    order: [{ endDate: 'desc' }],
    limit: 100
  })

  // Собираем все чаты из подписок
  const subscriptionChatIds = new Set<string>()
  const chatSubscriptionMap = new Map<string, { subscriptionId: string, planId: string, endDate: Date, status: string }>()

  for (const sub of userSubscriptions) {
    const planChats = await PlanChats.findAll(ctx, {
      where: { planId: sub.planId.id }
    })
    for (const pc of planChats) {
      subscriptionChatIds.add(pc.feedId)
      chatSubscriptionMap.set(pc.feedId, {
        subscriptionId: sub.id,
        planId: sub.planId.id,
        endDate: sub.endDate,
        status: sub.status
      })
    }
  }

  // Добавляем информацию об истекших подписках (для чатов без активной подписки)
  for (const sub of expiredSubscriptions) {
    const planChats = await PlanChats.findAll(ctx, {
      where: { planId: sub.planId.id }
    })
    for (const pc of planChats) {
      // Добавляем только если нет активной подписки на этот чат
      if (!subscriptionChatIds.has(pc.feedId)) {
        subscriptionChatIds.add(pc.feedId)
        chatSubscriptionMap.set(pc.feedId, {
          subscriptionId: sub.id,
          planId: sub.planId.id,
          endDate: sub.endDate,
          status: sub.status
        })
      }
    }
  }

  // console.log(`[apiChatsList] Чатов из подписок: ${subscriptionChatIds.size}`)

  // Для каждого чата проверяем, является ли пользователь участником через Feed API
  const chatsWithParticipants = await Promise.all(
    allChats.map(async (chat) => {
      try {
        const participants = await findFeedParticipants(ctx, chat.feedId)
        const myParticipant = participants.find((p) => p.userId === ctx.user.id)
        const isParticipant = !!myParticipant
        const myRole = myParticipant?.role || null
        
        if (participants.length === 0) {
          // console.log(`[apiChatsList] Чат ${chat.feedId} (${chat.title}) - нет участников!`)
        }
        
        return { chat, isParticipant, myRole, participantsCount: participants.length, isPublic: chat.isPublic }
      } catch (e) {
        // Если feed не найден — удаляем "мертвую" запись из таблицы
        if (e.message?.includes('not found') || e.message?.includes('не найден') || e.message?.includes('null')) {
          // console.log(`[apiChatsList] Feed ${chat.feedId} не найден, удаляем "мертвую" запись ${chat.id}`)
          try {
            // Удаляем связанных агентов
            const agents = await ChatAgents.findAll(ctx, { where: { chat: chat.id } })
            for (const agent of agents) {
              await ChatAgents.delete(ctx, agent.id)
            }
            // Удаляем связанные приглашения
            const invites = await ChatInvites.findAll(ctx, { where: { chat: chat.id } })
            for (const invite of invites) {
              await ChatInvites.delete(ctx, invite.id)
            }
            // Удаляем запись о чате
            await Chats.delete(ctx, chat.id)
            // console.log(`[apiChatsList] Удалена "мертвая" запись чата ${chat.id}`)
          } catch (deleteErr) {
            // console.log(`[apiChatsList] Ошибка удаления "мертвой" записи:`, deleteErr.message)
          }
        }
        return { chat: null, isParticipant: false, myRole: null, participantsCount: 0, isPublic: false }
      }
    }),
  )

  // Фильтруем чаты: где пользователь участник ИЛИ публичные чаты ИЛИ доступны по подписке
  // Исключаем чаты, где пользователь забанен
  let accessibleChats = chatsWithParticipants
    .filter((c) => c.chat && !bannedChatIds.has(c.chat.feedId) && (c.isParticipant || c.isPublic || subscriptionChatIds.has(c.chat.feedId)))
    .map((c) => {
      const subInfo = chatSubscriptionMap.get(c.chat.feedId)
      return {
        ...c.chat,
        isMember: c.isParticipant,
        myRole: c.myRole,
        participantsCount: c.participantsCount,
        isAccessibleBySubscription: subscriptionChatIds.has(c.chat.feedId) && !c.isParticipant,
        subscriptionInfo: subInfo ? {
          subscriptionId: subInfo.subscriptionId,
          planId: subInfo.planId,
          endDate: subInfo.endDate,
          status: subInfo.status
        } : null
      }
    })

  // Для личных чатов обогащаем данными участников (для отображения имени собеседника)
  const directChats = accessibleChats.filter(c => c.type === 'direct')
  if (directChats.length > 0) {
    const directChatsWithParticipants = await Promise.all(
      directChats.map(async (chat) => {
        const participants = await findFeedParticipants(ctx, chat.feedId)
        const enrichedParticipants = await enrichParticipantsWithUserData(ctx, participants)
        return {
          ...chat,
          participants: enrichedParticipants,
          // Для личного чата определяем имя собеседника
          displayTitle: getDirectChatDisplayTitle(enrichedParticipants, ctx.user.id),
        }
      })
    )
    
    // Заменяем личные чаты на обогащенные версии
    accessibleChats = accessibleChats.map(chat => {
      if (chat.type === 'direct') {
        const enriched = directChatsWithParticipants.find(c => c.feedId === chat.feedId)
        return enriched || chat
      }
      return chat
    })
  }

  // console.log(`[apiChatsList] Найдено доступных чатов: ${accessibleChats.length}`)

  // Получаем последние сообщения для каждого чата (только для участников)
  const chatsWithLastMessage = await Promise.all(
    accessibleChats.map(async (chat) => {
      try {
        // Для публичных чатов, где пользователь не участник, не получаем сообщения
        if (!chat.isMember) {
          return { ...chat, lastMessage: null }
        }

        let messages: any[] = []
        try {
          messages = await findFeedMessages(ctx, chat.feedId, {
            mode: 'tail',
            limit: 1,
          })
        } catch (feedError) {
          // Если tail mode падает, пробуем head
          try {
            messages = await findFeedMessages(ctx, chat.feedId, {
              mode: 'head',
              limit: 1,
            })
          } catch (headError) {
            // console.log(`[apiChatsList] Failed to load messages for ${chat.feedId}:`, headError.message)
            messages = []
          }
        }
        
        const lastMessage = messages.length > 0 ? messages[0] : null
        
        if (lastMessage) {
          // Обогащаем последнее сообщение данными автора
          const enrichedMessages = await enrichLastMessagesWithAuthors(ctx, [lastMessage])
          return { ...chat, lastMessage: enrichedMessages[0] }
        }
        
        return { ...chat, lastMessage: null }
      } catch (e) {
        // console.log(`[apiChatsList] Ошибка получения последнего сообщения для ${chat.feedId}:`, e.message)
        return { ...chat, lastMessage: null }
      }
    })
  )

  // Добавляем inboxSubjectId к каждому чату (из Feed API)
  const chatsWithInbox = await Promise.all(
    chatsWithLastMessage.map(async (chat) => {
      try {
        const feed = await getFeedById(ctx, chat.feedId)
        return {
          ...chat,
          inboxSubjectId: feed.inboxSubjectId,
        }
      } catch (e) {
        return chat
      }
    })
  )

  return {
    chats: chatsWithInbox,
  }
})

export const apiChatsCreateRoute = app
  .body((s) => ({
    title: s.string(),
    type: s.string().optional(),
    description: s.string().optional(),
    isPublic: s.boolean().optional(),
    avatarHash: s.string().nullable(),
    // Настройки платного чата
    isPaid: s.boolean().optional(),
    plans: s.array(s.object({
      name: s.string(),
      priceAmount: s.number(),
      priceCurrency: s.string(),
      durationType: s.string(),
      durationValue: s.number(),
      allowAutoRenewal: s.boolean().optional(),
      isActive: s.boolean().optional(),
    })).optional(),
    // Настройки агента
    withAgent: s.boolean().optional(),
    agentId: s.string().optional(),
    agentKey: s.string().optional(),
    agentName: s.string().optional(),
    agentRespondTo: s.string().optional(), // 'all' | 'admins' | 'mention'
    agentRespondToMention: s.string().optional(), // 'all' | 'admins'
  }))
  .post('/create', async (ctx, req) => {
    requireRealUser(ctx)

    // Только администраторы могут создавать публичные чаты
    if (req.body.isPublic) {
      requireAccountRole(ctx, 'Admin')
    }

    // Только администраторы могут создавать платные чаты
    if (req.body.isPaid) {
      requireAccountRole(ctx, 'Admin')
    }

    ctx.account.log(`[apiChatsCreate] Создание чата "${req.body.title}" пользователем ${ctx.user.id}`, { level: 'info' })

    const inboxSubjectId = `chat-${generateId()}`

    const feed = await createFeed(ctx, {
      title: req.body.title,
      inboxSubjectId,
      inboxUrl: `/tg/chat~${inboxSubjectId}`,
      data: { appId: 'tg' },
    })

    ctx.account.log(`[apiChatsCreate] Feed создан: ${feed.id}`, { level: 'info' })

    const chat = await Chats.create(ctx, {
      feedId: feed.id,
      title: req.body.title,
      type: req.body.type || 'group',
      owner: ctx.user.id,
      isPublic: req.body.isPublic || false,
      isPaid: req.body.isPaid || false,
      description: req.body.description || '',
      avatarHash: req.body.avatarHash || null,
      inboxSubjectId: inboxSubjectId,
    })
    
    // Создаем тарифы если чат платный
    if (req.body.isPaid && req.body.plans && req.body.plans.length > 0) {
      for (let i = 0; i < req.body.plans.length; i++) {
        const planData = req.body.plans[i]
        await SubscriptionPlans.create(ctx, {
          chatId: feed.id,
          name: planData.name,
          description: '',
          durationType: planData.durationType as any,
          durationValue: planData.durationValue,
          calendarPeriod: 'current',
          specificPeriodStart: null,
          price: new Money(planData.priceAmount, planData.priceCurrency || 'RUB'),
          isActive: planData.isActive !== false,
          allowAutoRenewal: planData.allowAutoRenewal !== false,
          sortOrder: i + 1,
          createdBy: ctx.user.id
        })
      }
    }

    ctx.account.log(`[apiChatsCreate] Чат создан в таблице: ${chat.id}`, { level: 'info' })

    const participant = await createOrUpdateFeedParticipant(ctx, feed, ctx.user, {
      role: 'owner',
      silent: true,
    })

    ctx.account.log(`[apiChatsCreate] Участник создан: ${participant ? 'OK' : 'FAIL'}, userId: ${ctx.user.id}`, { level: 'info' })

    // Создаем системное сообщение о создании чата
    try {
      await createSystemMessage(ctx, feed.id, 'chat_created', {})
    } catch (e) {
      ctx.account.log('[apiChatsCreateRoute] Failed to create system message: ' + e.message, { level: 'error' })
    }

    // Добавляем агента в чат если указано
    ctx.account.log('[apiChatsCreate] Agent check', { 
      level: 'info',
      json: { withAgent: req.body.withAgent, agentId: req.body.agentId, type: req.body.type, isGroup: req.body.type === 'group', chatId: chat.id }
    })
    
    if (req.body.withAgent && req.body.agentId && req.body.type === 'group') {
      ctx.account.log('[apiChatsCreate] Starting agent creation...', { level: 'info' })
      try {
        // Создаем бот-пользователя для агента (или получаем существующего)
        // Username должен содержать только a-z, 0-9, _ и минимум 5 символов
        const botUsername = `agent_${req.body.agentId.toLowerCase().replace(/[^a-z0-9_]/g, '_')}`
        ctx.account.log('[apiChatsCreate] Creating bot user...', { level: 'info', json: { botUsername } })
        const botUser = await createOrUpdateBotUser(ctx, botUsername, {
          firstName: req.body.agentName || 'Агент',
          lastName: '',
        })
        
        ctx.account.log(`[apiChatsCreate] Бот-пользователь для агента создан: ${botUser.id}`, { level: 'info' })
        
        // Подготавливаем данные для создания агента
        const agentData = {
          chat: chat.id,
          agentId: req.body.agentId,
          agentKey: req.body.agentKey || '',
          agentName: req.body.agentName || 'Агент',
          botUserId: botUser.id,
          respondTo: req.body.agentRespondTo || 'all',
          respondToMention: req.body.agentRespondToMention || 'all',
          isActive: true,
        }
        ctx.account.log('[apiChatsCreate] Agent data prepared', { level: 'info', json: agentData })
        
        ctx.account.log('[apiChatsCreate] Creating ChatAgents record...', { level: 'info' })
        const createdAgent = await ChatAgents.create(ctx, agentData)
        ctx.account.log(`[apiChatsCreate] ChatAgents record created: ${createdAgent.id}`, { level: 'info' })
        
        // Добавляем бот-пользователя агента как участника чата
        ctx.account.log('[apiChatsCreate] Adding bot user as participant...', { level: 'info' })
        await createOrUpdateFeedParticipant(ctx, feed, botUser, {
          role: 'guest',
          silent: true,
        })
        
        ctx.account.log(`[apiChatsCreate] Агент ${req.body.agentId} добавлен в чат с botUserId: ${botUser.id}`, { level: 'info' })
      } catch (agentError) {
        ctx.account.log('[apiChatsCreate] Ошибка добавления агента', { level: 'error', json: { error: agentError.message, stack: agentError.stack } })
        // Не прерываем создание чата если агент не добавился
      }
    } else {
      ctx.account.log('[apiChatsCreate] Agent NOT added', { 
        level: 'warn',
        json: {
          withAgent: req.body.withAgent,
          hasAgentId: !!req.body.agentId,
          type: req.body.type,
          isGroup: req.body.type === 'group'
        }
      })
    }

    // Проверяем, создался ли агент
    const agentsAfterCreate = await ChatAgents.findAll(ctx, { where: { chat: chat.id } })
    ctx.account.log(`[apiChatsCreate] Agents after create: ${agentsAfterCreate.length}`, { level: 'info' })
    
    return {
      success: true,
      chat,
      feedId: feed.id,
      agentAdded: agentsAfterCreate.length > 0,
    }
  })

export const apiChatGetRoute = app.get('/:feedId', async (ctx, req) => {
  requireRealUser(ctx)

  const chat = await Chats.findOneBy(ctx, {
    feedId: req.params.feedId,
  })

  if (!chat) {
    throw new Error('Чат не найден')
  }

  let participants
  try {
    participants = await findFeedParticipants(ctx, req.params.feedId)
  } catch (e) {
    // Если feed не найден — удаляем "мертвую" запись и возвращаем ошибку
    if (e.message?.includes('not found') || e.message?.includes('не найден') || e.message?.includes('null')) {
      // console.log(`[apiChatGet] Feed ${req.params.feedId} не найден, удаляем "мертвую" запись ${chat.id}`)
      try {
        // Удаляем связанных агентов
        const agents = await ChatAgents.findAll(ctx, { where: { chat: chat.id } })
        for (const agent of agents) {
          await ChatAgents.delete(ctx, agent.id)
        }
        // Удаляем связанные приглашения
        const invites = await ChatInvites.findAll(ctx, { where: { chat: chat.id } })
        for (const invite of invites) {
          await ChatInvites.delete(ctx, invite.id)
        }
        // Удаляем запись о чате
        await Chats.delete(ctx, chat.id)
        // console.log(`[apiChatGet] Удалена "мертвая" запись чата ${chat.id}`)
      } catch (deleteErr) {
        // console.log(`[apiChatGet] Ошибка удаления "мертвой" записи:`, deleteErr.message)
      }
    }
    throw new Error('Чат не найден')
  }
  
  const isParticipant = participants.some((p) => p.userId === ctx.user.id)

  // Проверяем, не забанен ли пользователь
  const isBanned = await isUserBanned(ctx, req.params.feedId, ctx.user.id)
  if (isBanned) {
    throw new Error('Вы забанены в этом чате')
  }

  // Доступ разрешен если: пользователь участник ИЛИ владелец ИЛИ чат публичный ИЛИ админ воркспейса
  const ownerId = typeof chat.owner === 'object' ? chat.owner?.id : chat.owner
  const isOwner = ownerId === ctx.user.id
  const isWorkspaceAdmin = ctx.user.is('Admin') || ctx.user.is('Owner')
  
  // Проверяем, есть ли принятое приглашение (пользователь может вступить)
  let hasAcceptedInvite = false
  if (!isParticipant && !isOwner && !chat.isPublic && !isWorkspaceAdmin) {
    const acceptedInvite = await ChatInvites.findOneBy(ctx, {
      chat: chat.id,
      invitedUser: ctx.user.id,
      status: 'accepted',
    })
    hasAcceptedInvite = !!acceptedInvite
  }
  
  if (!isParticipant && !isOwner && !chat.isPublic && !isWorkspaceAdmin && !hasAcceptedInvite) {
    throw new Error('Нет доступа к этому чату')
  }

  const feed = await getFeedById(ctx, req.params.feedId)
  
  if (!feed) {
    throw new Error('Чат не найден')
  }
  
  // Собираем chatProps вручную вместо использования getChat (избегаем ошибки endsWith)
  const chatProps = {
    feedId: feed.id,
    title: feed.title,
    pinnedMessageId: feed.pinnedMessageId,
    lastMessageId: feed.lastMessageId,
    inboxSubjectId: feed.inboxSubjectId,
    inboxUrl: feed.inboxUrl,
  }
  
  const enrichedParticipants = await enrichParticipantsWithUserData(ctx, participants)

  // Для личных чатов определяем отображаемое имя и информацию о собеседнике
  let otherUser = null
  let displayTitle = chat.title
  
  if (chat.type === 'direct') {
    displayTitle = getDirectChatDisplayTitle(enrichedParticipants, ctx.user.id)
    const otherParticipant = enrichedParticipants.find(p => p.userId !== ctx.user.id)
    if (otherParticipant?.user) {
      otherUser = otherParticipant.user
    }
  }

  return {
    chat: {
      ...chat,
      displayTitle,
      inboxSubjectId: feed.inboxSubjectId,
      inboxUrl: feed.inboxUrl,
    },
    feed,
    participants: enrichedParticipants,
    chatProps,
    isMember: isParticipant,
    otherUser,
  }
})

export const apiChatUpdateRoute = app
  .body((s) => ({
    title: s.string().optional(),
    description: s.string().optional(),
    isPublic: s.boolean().optional(),
    avatarHash: s.string().nullable(),
  }))
  .post('/:feedId/update', async (ctx, req) => {
    requireRealUser(ctx)

    const chat = await Chats.findOneBy(ctx, {
      feedId: req.params.feedId,
    })

    if (!chat) {
      throw new Error('Чат не найден')
    }

    // DEBUG: логируем данные для диагностики
    // console.log('[DEBUG apiChatUpdate] userId:', ctx.user.id)
    // console.log('[DEBUG apiChatUpdate] chat.owner:', chat.owner)
    const ownerId = typeof chat.owner === 'object' ? chat.owner?.id : chat.owner
    // console.log('[DEBUG apiChatUpdate] normalized ownerId:', ownerId)
    // console.log('[DEBUG apiChatUpdate] isOwner:', ownerId === ctx.user.id)

    // Только админ или владелец могут редактировать чат
    // Для публичных чатов также администраторы воркспейса
    const canManage = await canManageChat(ctx, req.params.feedId, ctx.user.id, chat.isPublic)
    
    // Дополнительная проверка — владелец чата всегда может редактировать
    const isOwner = ownerId === ctx.user.id
    
    // console.log('[DEBUG apiChatUpdate] canManage result:', canManage, 'isOwner:', isOwner)
    
    if (!canManage && !isOwner) {
      throw new Error('Только администратор или владелец могут редактировать чат')
    }
    
    // Только администраторы воркспейса могут делать чат публичным
    // (изменение с false на true или создание публичного чата)
    if (req.body.isPublic === true && !chat.isPublic) {
      requireAccountRole(ctx, 'Admin')
    }

    // Только администраторы воркспейса могут делать чат платным
    // (изменение с false на true)
    if (req.body.isPaid === true && !chat.isPaid) {
      requireAccountRole(ctx, 'Admin')
    }

    const updateData: any = {}
    const oldTitle = chat.title
    if (req.body.title) updateData.title = req.body.title
    if (req.body.description !== undefined)
      updateData.description = req.body.description
    if (req.body.isPublic !== undefined) updateData.isPublic = req.body.isPublic
    if (req.body.avatarHash !== undefined) updateData.avatarHash = req.body.avatarHash

    const updatedChat = await Chats.update(ctx, {
      id: chat.id,
      ...updateData,
    })

    if (req.body.title) {
      await updateFeed(ctx, {
        id: req.params.feedId,
        title: req.body.title,
      })
      
      // Создаем системное сообщение о переименовании
      try {
        await createSystemMessage(ctx, req.params.feedId, 'chat_renamed', {
          oldTitle: oldTitle,
          newTitle: req.body.title,
        })
      } catch (e) {
        ctx.account.log('[apiChatUpdateRoute] Failed to create system message: ' + e.message, { level: 'error' })
      }
    }

    return {
      success: true,
      chat: updatedChat,
    }
  })

export const apiChatDeleteRoute = app.post('/:feedId/delete', async (ctx, req) => {
  requireRealUser(ctx)
  
  // console.log(`[apiChatDelete] User ${ctx.user.id} attempting to delete feed ${req.params.feedId}`)

  const chat = await Chats.findOneBy(ctx, {
    feedId: req.params.feedId,
  })

  if (!chat) {
    // console.log(`[apiChatDelete] Chat not found for feed ${req.params.feedId}`)
    throw new Error('Чат не найден')
  }

  // console.log(`[apiChatDelete] Found chat ${chat.id}, owner:`, chat.owner)

  // Владелец чата или администратор воркспейса может удалить чат
  const ownerId = typeof chat.owner === 'object' ? chat.owner?.id : chat.owner
  const isOwner = ownerId === ctx.user.id
  const isWorkspaceAdmin = ctx.user.is('Admin') || ctx.user.is('Owner')
  
  // console.log(`[apiChatDelete] isOwner: ${isOwner}, isWorkspaceAdmin: ${isWorkspaceAdmin}, ownerId: ${ownerId}, userId: ${ctx.user.id}`)
  
  if (!isOwner && !isWorkspaceAdmin) {
    throw new Error('Только владелец или администратор воркспейса может удалить чат')
  }

  try {
    // Пытаемся удалить фид, но он может быть уже удалён
    // console.log(`[apiChatDelete] Attempting to delete feed ${req.params.feedId}`)
    await deleteFeed(ctx, req.params.feedId)
    // console.log(`[apiChatDelete] Feed ${req.params.feedId} deleted successfully`)
  } catch (err) {
    // Если фид не найден — игнорируем ошибку, продолжаем удаление из таблицы
    // console.log(`[apiChatDelete] Error deleting feed:`, err.message)
    if (err.message?.includes('not found') || err.message?.includes('не найден') || err.message?.includes('null')) {
      // console.log(`[apiChatDelete] Feed ${req.params.feedId} already deleted or not found, continuing...`)
    } else {
      throw err
    }
  }

  // Удаляем всех агентов для этого чата
  // console.log(`[apiChatDelete] Deleting agents for chat ${chat.id}`)
  const agents = await ChatAgents.findAll(ctx, {
    where: { chat: chat.id }
  })
  // console.log(`[apiChatDelete] Found ${agents.length} agents to delete`)
  for (const agent of agents) {
    await ChatAgents.delete(ctx, agent.id)
    // console.log(`[apiChatDelete] Deleted agent ${agent.id}`)
  }

  // Удаляем все приглашения для этого чата
  // console.log(`[apiChatDelete] Deleting invites for chat ${chat.id}`)
  const invites = await ChatInvites.findAll(ctx, {
    where: { chat: chat.id }
  })
  // console.log(`[apiChatDelete] Found ${invites.length} invites to delete`)
  for (const invite of invites) {
    await ChatInvites.delete(ctx, invite.id)
    // console.log(`[apiChatDelete] Deleted invite ${invite.id}`)
  }

  // console.log(`[apiChatDelete] Deleting chat record ${chat.id}`)
  await Chats.delete(ctx, chat.id)
  // console.log(`[apiChatDelete] Chat ${chat.id} deleted successfully`)

  return {
    success: true,
  }
})

// Получить публичную информацию о чате (для платных чатов - без проверки подписки)
export const apiChatPublicInfoRoute = app.get('/:feedId/public', async (ctx, req) => {
  requireRealUser(ctx)

  const chat = await Chats.findOneBy(ctx, {
    feedId: req.params.feedId,
  })

  if (!chat) {
    throw new Error('Чат не найден')
  }

  // Для платных чатов возвращаем только базовую публичную информацию
  // Для обычных - полную проверку доступа
  if (!chat.isPaid) {
    // Проверяем доступ как обычно
    let participants = []
    try {
      participants = await findFeedParticipants(ctx, req.params.feedId)
    } catch (e) {
      throw new Error('Чат не найден')
    }
    
    const isParticipant = participants.some((p) => p.userId === ctx.user.id)
    const ownerId = typeof chat.owner === 'object' ? chat.owner?.id : chat.owner
    const isOwner = ownerId === ctx.user.id
    const isWorkspaceAdmin = ctx.user.is('Admin') || ctx.user.is('Owner')
    
    if (!isParticipant && !isOwner && !chat.isPublic && !isWorkspaceAdmin) {
      throw new Error('Нет доступа к этому чату')
    }
  }

  // Получаем количество участников
  let participantsCount = 0
  try {
    const participants = await findFeedParticipants(ctx, req.params.feedId)
    participantsCount = participants.length
  } catch (e) {
    // Игнорируем ошибку
  }

  return {
    chat: {
      feedId: chat.feedId,
      title: chat.title,
      description: chat.description,
      type: chat.type,
      isPaid: chat.isPaid,
      isPublic: chat.isPublic,
      avatarHash: chat.avatarHash,
      participantsCount,
    }
  }
})

// Обновление статуса платного чата
export const apiChatSetPaidRoute = app.post('/:feedId/set-paid', async (ctx, req) => {
  requireRealUser(ctx)
  requireAccountRole(ctx, 'Admin')

  const chat = await Chats.findOneBy(ctx, {
    feedId: req.params.feedId,
  })

  if (!chat) {
    throw new Error('Чат не найден')
  }

  const body = req.body as { isPaid: boolean }
  
  const updatedChat = await Chats.update(ctx, {
    id: chat.id,
    isPaid: body.isPaid,
  })

  return {
    success: true,
    chat: updatedChat,
  }
})

// Присоединение к чату (публичному или по приглашению)
export const apiChatJoinRoute = app.post('/:feedId/join', async (ctx, req) => {
  requireRealUser(ctx)

  const chat = await Chats.findOneBy(ctx, {
    feedId: req.params.feedId,
  })

  if (!chat) {
    throw new Error('Чат не найден')
  }

  // Проверяем, не забанен ли пользователь
  const isBanned = await isUserBanned(ctx, req.params.feedId, ctx.user.id)
  if (isBanned) {
    throw new Error('Вы забанены в этом чате')
  }

  // Проверяем, не является ли пользователь уже участником
  const participants = await findFeedParticipants(ctx, req.params.feedId)
  const isParticipant = participants.some((p) => p.userId === ctx.user.id)

  if (isParticipant) {
    throw new Error('Вы уже являетесь участником этого чата')
  }

  // Проверяем доступ: публичный чат ИЛИ есть принятое приглашение
  let hasAccess = chat.isPublic
  
  if (!hasAccess) {
    // Проверяем, есть ли принятое приглашение
    const acceptedInvite = await ChatInvites.findOneBy(ctx, {
      chat: chat.id,
      invitedUser: ctx.user.id,
      status: 'accepted',
    })
    hasAccess = !!acceptedInvite
  }

  if (!hasAccess) {
    throw new Error('У вас нет доступа к этому чату')
  }

  // Добавляем пользователя как участника
  const feed = await getFeedById(ctx, req.params.feedId)
  await createOrUpdateFeedParticipant(ctx, feed, ctx.user, {
    role: 'guest',
    silent: false,
  })

    // Отправляем событие о новом участнике всем в чате
    await sendDataToSocket(ctx, `chat-${chat.feedId}`, {
    type: 'chat-event',
    event: 'new-participant',
    feedId: chat.feedId,
    user: {
      id: ctx.user.id,
      displayName: ctx.user.displayName,
      firstName: ctx.user.firstName,
      lastName: ctx.user.lastName,
      avatar: ctx.user.imageUrl,
    },
    })

    // Создаем системное сообщение о присоединении
    try {
      await createSystemMessage(ctx, chat.feedId, 'user_joined', {
        userName: ctx.user.displayName,
      })
    } catch (e) {
      ctx.account.log('[apiChatJoinRoute] Failed to create system message: ' + e.message, { level: 'error' })
    }

    return {
      success: true,
      chat: {
        ...chat,
        isMember: true,
      },
    }
  })

// Проверка возможности вступления в чат (публичный или есть приглашение)
export const apiChatCheckJoinRoute = app.get('/:feedId/can-join', async (ctx, req) => {
  requireRealUser(ctx)

  const chat = await Chats.findOneBy(ctx, {
    feedId: req.params.feedId,
  })

  if (!chat) {
    return { canJoin: false, reason: 'Чат не найден' }
  }

  // Проверяем, не является ли пользователь уже участником
  const participants = await findFeedParticipants(ctx, req.params.feedId)
  const isParticipant = participants.some((p) => p.userId === ctx.user.id)

  if (isParticipant) {
    return { canJoin: false, reason: 'Вы уже участник' }
  }

  // Публичный чат - можно вступить
  if (chat.isPublic) {
    return { canJoin: true, isPublic: true }
  }

  // Проверяем, есть ли принятое приглашение
  const acceptedInvite = await ChatInvites.findOneBy(ctx, {
    chat: chat.id,
    invitedUser: ctx.user.id,
    status: 'accepted',
  })

  if (acceptedInvite) {
    return { canJoin: true, isPublic: false, hasInvite: true }
  }

  return { canJoin: false, reason: 'Нет доступа' }
})
