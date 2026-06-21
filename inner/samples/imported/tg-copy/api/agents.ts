import { requireAccountRole, requireRealUser, createOrUpdateBotUser, findUserById } from '@app/auth'
import { createOrUpdateFeedParticipant, getFeedById, findFeedParticipants } from '@app/feed'
import { findAgents } from '@ai-agents/sdk/process'
import ChatAgents from '../tables/chat-agents.table'
import Chats from '../tables/chats.table'
import { canManageChat } from '../shared/permissions'

// Получить список системных агентов аккаунта (для добавления в чат)
export const apiAgentsListRoute = app.get('/list', async (ctx, req) => {
  requireRealUser(ctx)

  // Получаем список агентов из системы Chatium
  try {
    const agents = await findAgents(ctx)
    
    ctx.account.log('[apiAgentsList] Raw agents data: ' + JSON.stringify(agents.map((a: any) => ({ id: a.id, name: a.name, title: a.title, key: a.key, slug: a.slug }))), { level: 'info' })
    
    return {
      success: true,
      agents: agents.map((agent: any) => ({
        id: agent.id,
        name: agent.name || agent.title || agent.key || agent.slug || `Агент ${agent.id.substring(0, 8)}`,
        description: agent.description || '',
        key: agent.key || agent.slug || agent.id,
        avatarUrl: agent.avatarUrl || null,
        isActive: agent.isActive !== false,
      })),
    }
  } catch (error) {
    ctx.account.log('[apiAgentsList] Error finding agents: ' + error.message, { level: 'error' })
    return {
      success: true,
      agents: [],
    }
  }
})

// Получить агентов для конкретного чата (по chatId из таблицы chats)
export const apiAgentsByChatRoute = app.get('/by-chat/:chatId', async (ctx, req) => {
  requireRealUser(ctx)
  
  const chat = await Chats.findById(ctx, req.params.chatId)
  if (!chat) {
    throw new Error('Чат не найден')
  }

  const chatAgents = await ChatAgents.findAll(ctx, {
    where: { chat: chat.id, isActive: true }
  })

  return {
    success: true,
    chatId: chat.id,
    feedId: chat.feedId,
    agents: chatAgents.map((agent: any) => ({
      id: agent.id,
      agentId: agent.agentId,
      agentName: agent.agentName,
      agentKey: agent.agentKey,
      botUserId: agent.botUserId,
      respondTo: agent.respondTo,
      respondToMention: agent.respondToMention,
      isActive: agent.isActive,
      canScheduleInChat: agent.canScheduleInChat,
      chainKey: agent.chainKey,
    })),
  }
})

// Получить агентов для конкретного чата (по feedId)
export const apiAgentsByFeedRoute = app.get('/by-feed/:feedId', async (ctx, req) => {
  requireRealUser(ctx)
  
  const chat = await Chats.findOneBy(ctx, { feedId: req.params.feedId })
  if (!chat) {
    throw new Error('Чат не найден')
  }

  const chatAgents = await ChatAgents.findAll(ctx, {
    where: { chat: chat.id, isActive: true }
  })

  return {
    success: true,
    chatId: chat.id,
    feedId: chat.feedId,
    agents: chatAgents.map((agent: any) => ({
      id: agent.id,
      agentId: agent.agentId,
      agentName: agent.agentName,
      agentKey: agent.agentKey,
      botUserId: agent.botUserId,
      respondTo: agent.respondTo,
      respondToMention: agent.respondToMention,
      isActive: agent.isActive,
      canScheduleInChat: agent.canScheduleInChat,
      chainKey: agent.chainKey,
    })),
  }
})

// Добавить агента в чат (только админы воркспейса)
export const apiAgentsAddRoute = app
  .body((s) => ({
    chatId: s.string(),
    agentId: s.string(),
    agentName: s.string(),
    agentKey: s.string(),
    respondTo: s.string().default('mention'), // 'all' | 'admins' | 'mention'
    respondToMention: s.string().default('all'), // 'all' | 'admins'
    canScheduleInChat: s.boolean().default(true),
  }))
  .post('/add', async (ctx, req) => {
    requireRealUser(ctx)
    
    // Только администраторы воркспейса могут добавлять агентов в чаты
    requireAccountRole(ctx, 'Admin')

    const chat = await Chats.findById(ctx, req.body.chatId)
    if (!chat) {
      throw new Error('Чат не найден')
    }

    // Только для групповых чатов
    if (chat.type !== 'group') {
      throw new Error('Агенты могут быть добавлены только в групповые чаты')
    }

    // Проверяем, не добавлен ли уже этот агент
    const existingAgent = await ChatAgents.findOneBy(ctx, {
      chat: chat.id,
      agentId: req.body.agentId,
    })

    if (existingAgent) {
      if (existingAgent.isActive) {
        throw new Error('Этот агент уже добавлен в чат')
      } else {
        // Активируем существующую запись
        const updated = await ChatAgents.update(ctx, {
          id: existingAgent.id,
          isActive: true,
          respondTo: req.body.respondTo,
          respondToMention: req.body.respondToMention,
          canScheduleInChat: req.body.canScheduleInChat,
        })

        return {
          success: true,
          agent: {
            id: updated.id,
            agentId: updated.agentId,
            agentName: updated.agentName,
            agentKey: updated.agentKey,
            respondTo: updated.respondTo,
            respondToMention: updated.respondToMention,
          }
        }
      }
    }

    ctx.account.log('[apiAgentsAdd] Adding agent to chat: ' + req.body.agentName, { level: 'info' })

    // Создаем или получаем бот-пользователя для агента
    const botUserId = `agent_${req.body.agentKey}_${Date.now()}`
    const botUser = await createOrUpdateBotUser(ctx, botUserId, {
      firstName: req.body.agentName,
      lastName: '',
    })

    // Генерируем уникальный ключ цепочки для этого чата
    const chainKey = `chat_${chat.feedId}_agent_${req.body.agentId}`

    // Добавляем агента в таблицу
    const agent = await ChatAgents.create(ctx, {
      chat: chat.id,
      agentId: req.body.agentId,
      agentName: req.body.agentName,
      agentKey: req.body.agentKey,
      botUserId: botUser.id,
      respondTo: req.body.respondTo,
      respondToMention: req.body.respondToMention,
      isActive: true,
      canScheduleInChat: req.body.canScheduleInChat,
      chainKey: chainKey,
    })

    ctx.account.log('[apiAgentsAdd] Agent record created: ' + agent.id, { level: 'info' })

    // Добавляем бот-пользователя как участника чата
    const feed = await getFeedById(ctx, chat.feedId)
    await createOrUpdateFeedParticipant(ctx, feed, botUser, {
      role: 'guest',
      silent: true,
    })
    ctx.account.log('[apiAgentsAdd] Bot participant added to feed: ' + chat.feedId, { level: 'info' })

    return {
      success: true,
      agent: {
        id: agent.id,
        agentId: agent.agentId,
        agentName: agent.agentName,
        agentKey: agent.agentKey,
        botUserId: agent.botUserId,
        respondTo: agent.respondTo,
        respondToMention: agent.respondToMention,
        chainKey: agent.chainKey,
      }
    }
  })

// Обновить настройки агента в чате (только админы воркспейса)
export const apiAgentsUpdateRoute = app
  .body((s) => ({
    respondTo: s.string().optional(),
    respondToMention: s.string().optional(),
    canScheduleInChat: s.boolean().optional(),
  }))
  .post('/:agentId/update', async (ctx, req) => {
    requireRealUser(ctx)
    
    // Только администраторы воркспейса могут изменять настройки агентов
    requireAccountRole(ctx, 'Admin')

    const chatAgent = await ChatAgents.findById(ctx, req.params.agentId)
    if (!chatAgent) {
      throw new Error('Агент не найден в чате')
    }

    const chat = await Chats.findById(ctx, chatAgent.chat.id)
    if (!chat) {
      throw new Error('Чат не найден')
    }

    const updates: any = {}
    if (req.body.respondTo !== undefined) updates.respondTo = req.body.respondTo
    if (req.body.respondToMention !== undefined) updates.respondToMention = req.body.respondToMention
    if (req.body.canScheduleInChat !== undefined) updates.canScheduleInChat = req.body.canScheduleInChat

    const updated = await ChatAgents.update(ctx, {
      id: chatAgent.id,
      ...updates,
    })

    return {
      success: true,
      agent: updated,
    }
  })

// Удалить агента из чата (деактивировать) (только админы воркспейса)
export const apiAgentsRemoveRoute = app
  .body((s) => ({
    agentId: s.string(),
  }))
  .post('/remove', async (ctx, req) => {
    requireRealUser(ctx)
    
    // Только администраторы воркспейса могут удалять агентов
    requireAccountRole(ctx, 'Admin')
    
    const chatAgent = await ChatAgents.findById(ctx, req.body.agentId)
    if (!chatAgent) {
      throw new Error('Агент не найден в чате')
    }

    const chat = await Chats.findById(ctx, chatAgent.chat.id)
    if (!chat) {
      throw new Error('Чат не найден')
    }

    // Деактивируем вместо удаления
    await ChatAgents.update(ctx, {
      id: chatAgent.id,
      isActive: false,
    })

    return {
      success: true
    }
  })
